import { getPrismaClient } from '../lib/prisma.js';
import { getCache, setCache, CACHE_KEYS, CACHE_TTL } from '../lib/cache.js';
import type { AgentType, ProtocolStatus, Severity, VulnerabilityStatus } from '@prisma/client';

const prisma = getPrismaClient();

export interface DashboardStats {
  bountyPool: {
    total: number;
    available: number;
    paid: number;
    currency: string;
  };
  vulnerabilities: {
    total: number;
    bySeverity: Record<Severity, number>;
    byStatus: Record<VulnerabilityStatus, number>;
  };
  payments: {
    total: number;
    count: number;
    lastPayment: string | null;
  };
  scans: {
    total: number;
    lastScan: string | null;
    avgDuration: number;
  };
}

export interface AgentStatus {
  id: string;
  type: AgentType;
  status: 'ONLINE' | 'OFFLINE' | 'SCANNING' | 'ERROR';
  currentTask: string | null;
  taskProgress: number | null;
  lastHeartbeat: string | null;
  uptime: number | null;
  scansCompleted: number;
}

export async function getDashboardStats(protocolId?: string, userId?: string): Promise<DashboardStats | null> {
  const cacheKey = CACHE_KEYS.DASHBOARD_STATS(protocolId);
  
  const cached = await getCache<DashboardStats>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    let protocolFilter = {};
    
    if (protocolId) {
      protocolFilter = { id: protocolId };
    } else if (userId) {
      protocolFilter = { authUserId: userId };
    }

    const protocols = await prisma.protocol.findMany({
      where: protocolFilter,
      include: {
        vulnerabilities: {
          select: {
            severity: true,
            status: true,
          },
        },
        scans: {
          select: {
            startedAt: true,
            completedAt: true,
          },
          orderBy: { startedAt: 'desc' },
        },
      },
    });

    if (protocols.length === 0) {
      return null;
    }

    let totalBountyPool = 0;
    let availableBounty = 0;
    let paidBounty = 0;
    const vulnerabilityCounts = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INFO: 0,
    };
    const statusCounts = {
      OPEN: 0,
      ACKNOWLEDGED: 0,
      RESOLVED: 0,
      DISMISSED: 0,
    };
    let totalScans = 0;
    let lastScan: Date | null = null;
    let totalScanDuration = 0;
    let scanCount = 0;

    for (const protocol of protocols) {
      totalBountyPool += 0;
      availableBounty += 0;

      for (const vuln of protocol.vulnerabilities) {
        vulnerabilityCounts[vuln.severity]++;
        statusCounts[vuln.status]++;
      }

      totalScans += protocol.scans.length;
      
      if (protocol.scans.length > 0 && (!lastScan || protocol.scans[0].startedAt > lastScan)) {
        lastScan = protocol.scans[0].startedAt;
      }

      for (const scan of protocol.scans) {
        if (scan.completedAt && scan.startedAt) {
          const duration = scan.completedAt.getTime() - scan.startedAt.getTime();
          totalScanDuration += duration;
          scanCount++;
        }
      }
    }

    const payments = await prisma.payment.findMany({
      where: {
        vulnerability: {
          protocolId: protocolId || { in: protocols.map(p => p.id) },
        },
      },
      select: {
        amount: true,
        paidAt: true,
      },
      orderBy: { paidAt: 'desc' },
    });

    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
    paidBounty = totalPayments;
    availableBounty = totalBountyPool - paidBounty;

    const stats: DashboardStats = {
      bountyPool: {
        total: totalBountyPool,
        available: availableBounty,
        paid: paidBounty,
        currency: 'ETH',
      },
      vulnerabilities: {
        total: Object.values(vulnerabilityCounts).reduce((a, b) => a + b, 0),
        bySeverity: vulnerabilityCounts,
        byStatus: statusCounts,
      },
      payments: {
        total: totalPayments,
        count: payments.length,
        lastPayment: payments[0]?.paidAt?.toISOString() || null,
      },
      scans: {
        total: totalScans,
        lastScan: lastScan?.toISOString() || null,
        avgDuration: scanCount > 0 ? Math.round(totalScanDuration / scanCount / 1000) : 0,
      },
    };

    await setCache(cacheKey, stats, CACHE_TTL.STATS);
    
    return stats;
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return null;
  }
}

const AGENT_HEARTBEAT_TIMEOUT = 120 * 1000;

export async function getAgentStatus(type?: AgentType): Promise<AgentStatus[]> {
  const cacheKey = CACHE_KEYS.AGENT_STATUS;
  
  const cached = await getCache<AgentStatus[]>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const whereClause = type ? { type } : {};
    
    const agents = await prisma.agent.findMany({
      where: whereClause,
      select: {
        id: true,
        type: true,
        status: true,
        currentTask: true,
        taskProgress: true,
        lastHeartbeat: true,
        uptime: true,
        scansCompleted: true,
      },
    });

    const now = new Date();
    
    const agentStatuses: AgentStatus[] = agents.map(agent => {
      let status: AgentStatus['status'] = agent.status;
      
      if (agent.lastHeartbeat) {
        const timeSinceHeartbeat = now.getTime() - agent.lastHeartbeat.getTime();
        if (timeSinceHeartbeat > AGENT_HEARTBEAT_TIMEOUT) {
          status = 'OFFLINE';
        }
      } else {
        status = 'OFFLINE';
      }

      return {
        id: agent.id,
        type: agent.type,
        status,
        currentTask: agent.currentTask,
        taskProgress: agent.taskProgress,
        lastHeartbeat: agent.lastHeartbeat?.toISOString() || null,
        uptime: agent.uptime,
        scansCompleted: agent.scansCompleted,
      };
    });

    await setCache(cacheKey, agentStatuses, CACHE_TTL.AGENT_STATUS);
    
    return agentStatuses;
  } catch (error) {
    console.error('Error fetching agent status:', error);
    return [];
  }
}

export interface VulnerabilityListItem {
  id: string;
  title: string;
  severity: Severity;
  status: VulnerabilityStatus;
  discoveredAt: string;
  bounty: number | null;
}

export interface PaginatedVulnerabilities {
  data: VulnerabilityListItem[];
  pagination: {
    total: number;
    page: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export async function getProtocolVulnerabilities(
  protocolId: string,
  page: number = 1,
  limit: number = 10,
  sort: string = 'date',
  severity?: Severity,
  status?: VulnerabilityStatus
): Promise<PaginatedVulnerabilities | null> {
  const cacheKey = CACHE_KEYS.PROTOCOL_VULNERABILITIES(protocolId, page, limit, sort);
  
  const cached = await getCache<PaginatedVulnerabilities>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const whereClause: any = { protocolId };
    if (severity) whereClause.severity = severity;
    if (status) whereClause.status = status;

    let orderBy: any = {};
    switch (sort) {
      case 'severity':
        orderBy = { severity: 'desc' };
        break;
      case 'date':
        orderBy = { discoveredAt: 'desc' };
        break;
      case 'status':
        orderBy = { status: 'asc' };
        break;
      default:
        orderBy = { discoveredAt: 'desc' };
    }

    const skip = (page - 1) * limit;

    const [vulnerabilities, total] = await Promise.all([
      prisma.vulnerability.findMany({
        where: whereClause,
        select: {
          id: true,
          severity: true,
          status: true,
          discoveredAt: true,
          bounty: true,
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.vulnerability.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const result: PaginatedVulnerabilities = {
      data: vulnerabilities.map(v => ({
        id: v.id,
        title: `Vulnerability ${v.id.slice(0, 8)}`,
        severity: v.severity,
        status: v.status,
        discoveredAt: v.discoveredAt.toISOString(),
        bounty: v.bounty,
      })),
      pagination: {
        total,
        page,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };

    await setCache(cacheKey, result, CACHE_TTL.VULNERABILITIES);
    
    return result;
  } catch (error) {
    console.error('Error fetching vulnerabilities:', error);
    return null;
  }
}
