# Backup and Recovery Guide

Comprehensive procedures for database backups, disaster recovery, and rollback operations for the AI Bug Bounty Platform.

**Related Documentation**:
- [PRODUCTION.md](./PRODUCTION.md) - Production operations
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment procedures
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Recovery troubleshooting

---

## Table of Contents

- [Database Backup Procedures](#database-backup-procedures)
- [Automated Backup Schedules](#automated-backup-schedules)
- [Backup Verification](#backup-verification)
- [Point-in-Time Recovery](#point-in-time-recovery)
- [Redis Backup](#redis-backup)
- [Disaster Recovery Plan](#disaster-recovery-plan)
- [Recovery Testing Procedures](#recovery-testing-procedures)
- [Rollback Procedures](#rollback-procedures)

---

## Database Backup Procedures

### Manual Backup

**Full Database Backup**:
```bash
# Create backup directory
mkdir -p backups/$(date +%Y-%m-%d)

# PostgreSQL dump
pg_dump $DATABASE_URL > backups/$(date +%Y-%m-%d)/bugbounty-$(date +%Y%m%d-%H%M%S).sql

# Compressed backup (recommended for large databases)
pg_dump $DATABASE_URL | gzip > backups/$(date +%Y-%m-%d)/bugbounty-$(date +%Y%m%d-%H%M%S).sql.gz

# Verify backup size
ls -lh backups/$(date +%Y-%m-%d)/
```

**Schema-Only Backup**:
```bash
# Backup schema without data (useful for migrations)
pg_dump $DATABASE_URL --schema-only > backups/schema-$(date +%Y%m%d).sql
```

**Data-Only Backup**:
```bash
# Backup data without schema
pg_dump $DATABASE_URL --data-only > backups/data-$(date +%Y%m%d).sql
```

**Custom Format Backup** (recommended):
```bash
# Custom format allows parallel restore and compression
pg_dump $DATABASE_URL -Fc -f backups/bugbounty-$(date +%Y%m%d).dump

# Restore from custom format
pg_restore -d $DATABASE_URL backups/bugbounty-20260201.dump
```

### Backup Script

Create `scripts/backup.sh`:
```bash
#!/bin/bash
set -e

# Configuration
BACKUP_DIR="/var/backups/bugbounty"
RETENTION_DAYS=30
S3_BUCKET="s3://bugbounty-backups"

# Create backup directory
mkdir -p $BACKUP_DIR

# Timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DATE=$(date +%Y-%m-%d)

# Create backup
echo "Starting backup at $(date)"
pg_dump $DATABASE_URL -Fc -f $BACKUP_DIR/bugbounty-$TIMESTAMP.dump

# Verify backup
if [ -f "$BACKUP_DIR/bugbounty-$TIMESTAMP.dump" ]; then
  echo "Backup created successfully: bugbounty-$TIMESTAMP.dump"
  SIZE=$(du -h $BACKUP_DIR/bugbounty-$TIMESTAMP.dump | cut -f1)
  echo "Backup size: $SIZE"
else
  echo "ERROR: Backup failed!"
  exit 1
fi

# Upload to S3 (optional)
if [ -n "$S3_BUCKET" ]; then
  echo "Uploading to S3..."
  aws s3 cp $BACKUP_DIR/bugbounty-$TIMESTAMP.dump $S3_BUCKET/$DATE/
  echo "Upload complete"
fi

# Clean up old backups (keep last 30 days)
echo "Cleaning up old backups..."
find $BACKUP_DIR -name "bugbounty-*.dump" -mtime +$RETENTION_DAYS -delete
echo "Cleanup complete"

echo "Backup completed at $(date)"
```

**Make script executable**:
```bash
chmod +x scripts/backup.sh
```

---

## Automated Backup Schedules

### Cron Job Setup

**Daily Backups at 2 AM**:
```bash
# Edit crontab
crontab -e

# Add daily backup job
0 2 * * * /path/to/scripts/backup.sh >> /var/log/bugbounty-backup.log 2>&1

# Hourly incremental backups (WAL archiving)
0 * * * * /path/to/scripts/backup-wal.sh >> /var/log/bugbounty-wal.log 2>&1
```

### Railway Automated Backups

Railway provides automatic backups for PostgreSQL:

```bash
# Configure backup schedule (via Railway dashboard)
# Settings → Database → Backups

# Schedule: Daily at 02:00 UTC
# Retention: 30 days (adjustable)

# Manual backup via CLI
railway backup create --service postgres

# List backups
railway backup list

# Restore from backup
railway backup restore <backup-id>
```

### S3 Backup Automation

**AWS S3 Sync**:
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS credentials
aws configure

# Automated S3 upload script
cat > scripts/s3-backup.sh << 'EOF'
#!/bin/bash
BACKUP_FILE="$1"
S3_BUCKET="s3://bugbounty-backups"
DATE=$(date +%Y/%m/%d)

aws s3 cp $BACKUP_FILE $S3_BUCKET/$DATE/ \
  --storage-class STANDARD_IA \
  --server-side-encryption AES256

echo "Uploaded to S3: $S3_BUCKET/$DATE/$(basename $BACKUP_FILE)"
EOF

chmod +x scripts/s3-backup.sh
```

### Continuous WAL Archiving

**PostgreSQL Write-Ahead Log (WAL) Archiving**:

```sql
-- Enable WAL archiving (postgresql.conf)
wal_level = replica
archive_mode = on
archive_command = 'cp %p /var/lib/postgresql/wal_archive/%f'
archive_timeout = 3600  -- Archive every hour
```

**WAL Archive Script**:
```bash
#!/bin/bash
# scripts/backup-wal.sh
WAL_ARCHIVE="/var/lib/postgresql/wal_archive"
S3_BUCKET="s3://bugbounty-backups/wal"

# Sync WAL files to S3
aws s3 sync $WAL_ARCHIVE $S3_BUCKET

# Clean up old WAL files (keep last 7 days)
find $WAL_ARCHIVE -name "*.gz" -mtime +7 -delete
```

---

## Backup Verification

### Test Backup Integrity

**Verify Backup File**:
```bash
# Check if backup is valid PostgreSQL dump
pg_restore --list backups/bugbounty-20260201.dump | head -20

# Expected output: List of tables and sequences
# If error: Backup is corrupted
```

**Test Restore to Temporary Database**:
```bash
# Create temporary database
createdb bugbounty_test

# Restore backup
pg_restore -d bugbounty_test backups/bugbounty-20260201.dump

# Verify data
psql bugbounty_test -c "SELECT COUNT(*) FROM protocols;"
psql bugbounty_test -c "SELECT COUNT(*) FROM scans;"
psql bugbounty_test -c "SELECT COUNT(*) FROM findings;"

# Check table counts match production
# If counts are correct, backup is valid

# Drop test database
dropdb bugbounty_test
```

### Backup Monitoring Script

```bash
#!/bin/bash
# scripts/verify-backup.sh

BACKUP_FILE="$1"
EXPECTED_SIZE_MB=100  # Adjust based on your database

# Check file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found: $BACKUP_FILE"
  exit 1
fi

# Check file size
SIZE_MB=$(du -m "$BACKUP_FILE" | cut -f1)
if [ $SIZE_MB -lt $EXPECTED_SIZE_MB ]; then
  echo "WARNING: Backup size ($SIZE_MB MB) is smaller than expected ($EXPECTED_SIZE_MB MB)"
  exit 1
fi

# Verify PostgreSQL format
pg_restore --list "$BACKUP_FILE" > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "SUCCESS: Backup verified: $BACKUP_FILE ($SIZE_MB MB)"
else
  echo "ERROR: Backup is corrupted or invalid format"
  exit 1
fi
```

**Add to backup script**:
```bash
# In backup.sh, after creating backup:
./scripts/verify-backup.sh $BACKUP_DIR/bugbounty-$TIMESTAMP.dump
```

---

## Point-in-Time Recovery

### Setup WAL Archiving for PITR

**Configure PostgreSQL** (postgresql.conf):
```
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /var/lib/postgresql/wal_archive/%f && cp %p /var/lib/postgresql/wal_archive/%f'
```

### Create Base Backup

```bash
# Create base backup
pg_basebackup -D /var/lib/postgresql/basebackup -Ft -z -P

# Expected output:
# base.tar.gz  (database files)
# pg_wal.tar.gz  (WAL files)
```

### Perform Point-in-Time Recovery

**Scenario**: Accidental data deletion at 14:30, need to recover to 14:25

```bash
# 1. Stop PostgreSQL
sudo systemctl stop postgresql

# 2. Backup current data directory (just in case)
mv /var/lib/postgresql/data /var/lib/postgresql/data.old

# 3. Create new data directory
mkdir /var/lib/postgresql/data
chown postgres:postgres /var/lib/postgresql/data

# 4. Extract base backup
tar -xzf /var/lib/postgresql/basebackup/base.tar.gz -C /var/lib/postgresql/data

# 5. Create recovery configuration
cat > /var/lib/postgresql/data/recovery.conf << 'EOF'
restore_command = 'cp /var/lib/postgresql/wal_archive/%f %p'
recovery_target_time = '2026-02-01 14:25:00'
recovery_target_action = 'promote'
EOF

# 6. Start PostgreSQL (will recover to specified time)
sudo systemctl start postgresql

# 7. Verify recovery
psql -c "SELECT NOW();"
psql -c "SELECT COUNT(*) FROM protocols;"

# 8. If successful, remove old data
rm -rf /var/lib/postgresql/data.old
```

### Recovery to Specific Transaction

```bash
# Recover to specific transaction ID
cat > /var/lib/postgresql/data/recovery.conf << 'EOF'
restore_command = 'cp /var/lib/postgresql/wal_archive/%f %p'
recovery_target_xid = '123456'
recovery_target_action = 'promote'
EOF
```

---

## Redis Backup

### Redis RDB Backup

**Manual Snapshot**:
```bash
# Trigger manual save
redis-cli -u $REDIS_URL BGSAVE

# Check save status
redis-cli -u $REDIS_URL LASTSAVE

# Backup RDB file
cp /var/lib/redis/dump.rdb backups/redis-$(date +%Y%m%d).rdb
```

**Automated Snapshots** (redis.conf):
```
# Save to disk every 15 minutes if at least 1 key changed
save 900 1

# Save every 5 minutes if at least 10 keys changed
save 300 10

# Save every 1 minute if at least 10000 keys changed
save 60 10000
```

### Redis AOF Backup

**Enable AOF** (redis.conf):
```
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
```

**Backup AOF File**:
```bash
# Copy AOF file
cp /var/lib/redis/appendonly.aof backups/redis-aof-$(date +%Y%m%d).aof

# Compress
gzip backups/redis-aof-$(date +%Y%m%d).aof
```

### Restore Redis

```bash
# Stop Redis
sudo systemctl stop redis

# Restore RDB file
cp backups/redis-20260201.rdb /var/lib/redis/dump.rdb
chown redis:redis /var/lib/redis/dump.rdb

# Or restore AOF file
cp backups/redis-aof-20260201.aof /var/lib/redis/appendonly.aof
chown redis:redis /var/lib/redis/appendonly.aof

# Start Redis
sudo systemctl start redis

# Verify data
redis-cli -u $REDIS_URL KEYS '*' | wc -l
```

---

## Disaster Recovery Plan

### Recovery Time Objective (RTO)

**Target**: Restore service within 4 hours of incident

### Recovery Point Objective (RPO)

**Target**: Maximum data loss of 1 hour (hourly WAL backups)

### Disaster Scenarios

#### Scenario 1: Database Corruption

**Detection**: Health checks failing, database errors in logs

**Response**:
1. **Immediate** (0-15 min): Identify issue, notify team
2. **Short-term** (15-30 min): Switch to read-only mode, prevent further corruption
3. **Recovery** (30-120 min): Restore from latest verified backup
4. **Verification** (120-180 min): Test all critical features
5. **Resolution** (180-240 min): Resume normal operations

**Commands**:
```bash
# 1. Create new database
createdb bugbounty_new

# 2. Restore latest backup
pg_restore -d bugbounty_new backups/bugbounty-latest.dump

# 3. Point backend to new database
railway variables set DATABASE_URL=postgresql://...bugbounty_new
railway restart

# 4. Verify health
curl https://api.yourdomain.com/health
```

#### Scenario 2: Complete Infrastructure Failure

**Detection**: All services down, cannot reach infrastructure

**Response**:
1. **Immediate** (0-30 min): Deploy to backup infrastructure (different region)
2. **Recovery** (30-120 min): Restore database from S3 backup
3. **Verification** (120-180 min): Test all services
4. **Resolution** (180-240 min): Update DNS to new infrastructure

**Commands**:
```bash
# 1. Deploy to backup Railway project
railway link --project bugbounty-backup
railway up

# 2. Restore database
aws s3 cp s3://bugbounty-backups/latest/bugbounty.dump .
pg_restore -d $DATABASE_URL bugbounty.dump

# 3. Update DNS
# Point api.yourdomain.com to new Railway deployment

# 4. Verify
curl https://api.yourdomain.com/health
```

#### Scenario 3: Data Breach / Security Incident

**Response**:
1. **Immediate** (0-15 min): Take system offline, prevent further access
2. **Investigation** (15-60 min): Identify breach scope, affected data
3. **Containment** (60-120 min): Patch vulnerability, rotate credentials
4. **Recovery** (120-240 min): Restore from pre-breach backup
5. **Communication** (ongoing): Notify affected users, regulators

**Commands**:
```bash
# 1. Take system offline
railway service stop

# 2. Rotate all credentials
railway variables set JWT_SECRET=<new-secret>
railway variables set DATABASE_PASSWORD=<new-password>
railway variables set PRIVATE_KEY=<new-key>

# 3. Restore from pre-breach backup
# Identify last known good backup timestamp
pg_restore -d bugbounty_clean backups/bugbounty-<pre-breach-time>.dump

# 4. Deploy patched version
git checkout <patched-branch>
railway up

# 5. Monitor for suspicious activity
railway logs --follow
```

---

## Recovery Testing Procedures

### Quarterly Disaster Recovery Drill

**Test Schedule**: First Saturday of every quarter at 2 AM

**Procedure**:
```bash
# 1. Announce drill to team
echo "DR Drill starting at $(date)"

# 2. Create test environment
railway project create bugbounty-dr-test

# 3. Restore latest backup
aws s3 cp s3://bugbounty-backups/latest/bugbounty.dump .
pg_restore -d $DR_TEST_DATABASE_URL bugbounty.dump

# 4. Deploy application
railway up --project bugbounty-dr-test

# 5. Run health checks
curl https://dr-test.railway.app/health

# 6. Run E2E tests
npm run test:e2e

# 7. Verify data integrity
psql $DR_TEST_DATABASE_URL -c "SELECT COUNT(*) FROM protocols;"
psql $DR_TEST_DATABASE_URL -c "SELECT COUNT(*) FROM scans;"

# 8. Measure recovery time
# Expected: < 4 hours from backup to working system

# 9. Document results
echo "DR Drill completed at $(date)" >> dr-drill-log.txt

# 10. Cleanup test environment
railway project delete bugbounty-dr-test
```

### Backup Restore Test (Monthly)

```bash
#!/bin/bash
# scripts/test-restore.sh

# Download latest backup from S3
LATEST_BACKUP=$(aws s3 ls s3://bugbounty-backups/latest/ | tail -1 | awk '{print $4}')
aws s3 cp s3://bugbounty-backups/latest/$LATEST_BACKUP .

# Create test database
dropdb --if-exists bugbounty_restore_test
createdb bugbounty_restore_test

# Restore backup
echo "Restoring backup: $LATEST_BACKUP"
pg_restore -d bugbounty_restore_test $LATEST_BACKUP

# Verify table counts
echo "Verifying data..."
PROTOCOLS=$(psql bugbounty_restore_test -t -c "SELECT COUNT(*) FROM protocols;")
SCANS=$(psql bugbounty_restore_test -t -c "SELECT COUNT(*) FROM scans;")
FINDINGS=$(psql bugbounty_restore_test -t -c "SELECT COUNT(*) FROM findings;")

echo "Protocols: $PROTOCOLS"
echo "Scans: $SCANS"
echo "Findings: $FINDINGS"

# Compare with production
PROD_PROTOCOLS=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM protocols;")
PROD_SCANS=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM scans;")
PROD_FINDINGS=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM findings;")

if [ "$PROTOCOLS" -eq "$PROD_PROTOCOLS" ] && \
   [ "$SCANS" -eq "$PROD_SCANS" ] && \
   [ "$FINDINGS" -eq "$PROD_FINDINGS" ]; then
  echo "SUCCESS: Backup restore test passed"
else
  echo "WARNING: Row counts don't match production"
fi

# Cleanup
dropdb bugbounty_restore_test
rm $LATEST_BACKUP
```

---

## Rollback Procedures

### Application Rollback

**Railway Deployment Rollback**:
```bash
# List recent deployments
railway deployments

# Rollback to previous deployment
railway rollback

# Or rollback to specific deployment
railway rollback <deployment-id>

# Verify rollback
curl https://api.yourdomain.com/health
railway logs --tail 50
```

### Database Migration Rollback

**Prisma Migration Rollback**:
```bash
# List applied migrations
npx prisma migrate status

# Mark migration as rolled back
npx prisma migrate resolve --rolled-back <migration_name>

# Apply previous migration state
# Note: Prisma doesn't support automatic rollback
# You must manually create a new migration to revert changes

# Create revert migration
npx prisma migrate dev --name revert_<feature>

# Or restore from backup if data loss is acceptable
pg_restore -d $DATABASE_URL backups/bugbounty-pre-migration.dump
```

**Manual Rollback SQL**:
```sql
-- Example: Rollback adding a column
ALTER TABLE protocols DROP COLUMN IF EXISTS new_column;

-- Example: Rollback creating a table
DROP TABLE IF EXISTS new_table;

-- Example: Rollback data update
UPDATE findings SET status = 'PENDING' WHERE status = 'NEW_STATUS';
```

### Environment Variable Rollback

```bash
# View variable history
railway variables list

# Revert to previous value
railway variables set API_KEY=<old-value>

# Restart to apply
railway restart
```

### Complete System Rollback

**Full rollback to known good state**:
```bash
# 1. Rollback application
railway rollback <last-known-good-deployment>

# 2. Rollback database
pg_restore -d $DATABASE_URL backups/bugbounty-<timestamp>.dump

# 3. Rollback Redis (clear cache)
redis-cli -u $REDIS_URL FLUSHALL

# 4. Verify system health
curl https://api.yourdomain.com/health/detailed

# 5. Run smoke tests
npm run test:smoke
```

---

**Last Updated**: 2026-02-01
