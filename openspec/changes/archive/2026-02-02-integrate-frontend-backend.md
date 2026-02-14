# Integrate Frontend-Backend - Archived

**Archived**: 2026-02-02
**Status**: Completed
**Implementation Period**: January 2026

## Summary

Successfully integrated the frontend and backend systems, establishing authentication flow, API connectivity, agent status monitoring, and local development orchestration. This change enabled the frontend to communicate with real backend services and provided a streamlined developer experience with one-command startup.

## Outcomes

- Frontend connected to backend API routes for protocol registration and agent status
- Standardized Supabase JWT authentication across frontend and backend
- Real-time agent status updates via WebSocket and status endpoints
- Local development orchestration script for full-stack startup
- Environment configuration clarified for API base URL and authentication
- Protocol registration end-to-end flow working

### Key Deliverables

1. **Frontend-Backend API Integration**
   - TanStack Query hooks connected to real endpoints
   - API base URL configuration
   - Request/response type synchronization
   - Error handling and retry logic

2. **Authentication Flow**
   - Supabase JWT token management
   - Authorization header injection
   - Token refresh handling
   - Protected route authentication
   - User context propagation

3. **Agent Status Monitoring**
   - Real-time Protocol Agent status in UI
   - Real-time Researcher Agent status in UI
   - WebSocket event handlers for agent updates
   - Heartbeat monitoring visualization
   - Queue status display

4. **Local Development Orchestration**
   - One-command full-stack startup script
   - Coordinated frontend, backend, agents startup
   - Database and Redis initialization
   - Environment variable management
   - Development server orchestration

5. **Environment Configuration**
   - API base URL configuration (dev/prod)
   - WebSocket URL configuration
   - Supabase credentials management
   - Feature flags for development

## Features Implemented

### Capabilities Created
- `protocol-registration-flow`: Frontend-to-backend integration for protocol registration via Protocol Agent
- `agent-status-monitoring`: UI + real-time updates for Protocol and Researcher agent status
- `local-dev-orchestration`: One-command startup for full stack (frontend, backend, agents, database, Redis)

### Authentication Integration
- JWT token storage (localStorage)
- Automatic token injection in API requests
- Token expiration handling
- Refresh token flow
- Logout and session management

### API Client Configuration
```typescript
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use((config) => {
  const token = getSupabaseToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### WebSocket Integration
- Socket.io client setup
- Room subscription (protocol:{id}, scan:{id}, global)
- Event handlers for agent status
- Reconnection logic
- Heartbeat monitoring

## Files Modified/Created

### Frontend Files
```
frontend/
├── src/
│   ├── lib/
│   │   ├── api-client.ts        # Axios instance with auth
│   │   └── websocket.ts         # Socket.io client
│   ├── hooks/
│   │   ├── useAuth.ts           # Authentication hooks
│   │   └── useAgentStatus.ts   # Agent monitoring hooks
│   └── config/
│       └── env.ts               # Environment configuration
└── .env.example                 # Environment template
```

### Backend Files
```
backend/
├── src/
│   ├── middleware/
│   │   └── cors.ts              # CORS configuration for frontend
│   └── routes/
│       └── agents.ts            # Agent status endpoints
```

### Development Scripts
```
scripts/
├── dev.sh                       # Full-stack startup script
└── dev-orchestration/
    ├── start-backend.sh
    ├── start-frontend.sh
    ├── start-agents.sh
    └── start-services.sh        # PostgreSQL, Redis
```

## Related PRs

- Built on `backend-api-foundation` and `frontend-demonstration-pages`
- Enabled complete end-to-end testing
- Supported demonstration workflow implementation

## Impact

### Developer Experience
- One command starts entire stack: `npm run dev:all`
- Automatic service dependency management
- Proper shutdown handling
- Unified logging output
- Environment variable validation

### Authentication Flow
```
User Login
  → Supabase Auth
    → JWT Token Received
      → Token Stored in Frontend
        → API Requests Include Token
          → Backend Validates JWT
            → User Context Available
              → RLS Policies Applied
```

### Agent Status Flow
```
Agent Heartbeat
  → Backend Stores Status
    → WebSocket Broadcast
      → Frontend Receives Event
        → UI Updates Agent Status
          → User Sees Real-time Status
```

## Environment Variables

### Frontend (.env)
```
VITE_API_BASE_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
```

### Backend (.env)
```
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=...
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
```

## Local Development Orchestration

### Startup Sequence
1. Start PostgreSQL (if not running)
2. Start Redis (if not running)
3. Run database migrations
4. Start backend server
5. Start agent workers
6. Start frontend dev server

### Shutdown Sequence
1. Stop frontend dev server
2. Stop agent workers
3. Stop backend server
4. Optionally stop Redis and PostgreSQL

### Script Features
- Process management
- Graceful shutdown
- Error handling
- Service health checks
- Log aggregation

## API Integration Details

### Protocol Registration Flow
```typescript
// Frontend
const registerProtocol = async (data: ProtocolInput) => {
  const response = await apiClient.post('/api/v1/protocols', data);
  return response.data;
};

// TanStack Query
const mutation = useMutation({
  mutationFn: registerProtocol,
  onSuccess: () => {
    queryClient.invalidateQueries(['protocols']);
  }
});
```

### Agent Status Monitoring
```typescript
// WebSocket listener
socket.on('agent:status', (data) => {
  setAgentStatus(prev => ({
    ...prev,
    [data.agentId]: data
  }));
});

// Polling fallback
const { data } = useQuery({
  queryKey: ['agents', 'status'],
  queryFn: fetchAgentStatus,
  refetchInterval: 10000, // 10s fallback
  enabled: !socketConnected
});
```

## CORS Configuration

### Backend CORS Setup
```typescript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:5173',  // Vite dev server
    'https://your-app.vercel.app'  // Production
  ],
  credentials: true
}));
```

## Security Considerations

- JWT tokens never exposed in URLs
- HTTPS required in production
- CORS restricted to known origins
- Supabase RLS policies enforced
- API rate limiting applied
- Input validation on both frontend and backend
- XSS prevention through sanitization
- CSRF protection via same-site cookies

## Performance Optimizations

- TanStack Query caching reduces API calls
- WebSocket connection pooling
- Debounced API requests
- Optimistic updates for better UX
- Lazy loading for routes
- Code splitting for frontend bundle

## Error Handling

### Frontend
- Global error boundary
- API error interceptors
- User-friendly error messages
- Retry logic for transient failures
- Fallback UI for network errors

### Backend
- Centralized error handler
- Structured error responses
- Error logging with context
- Client error vs server error distinction

## Lessons Learned

1. **Environment Management**: Centralized env validation prevents runtime errors
2. **Dev Orchestration**: One-command startup significantly improves developer onboarding
3. **WebSocket Reconnection**: Automatic reconnection essential for reliable real-time updates
4. **Type Synchronization**: Shared types between frontend and backend prevent integration bugs
5. **CORS Configuration**: Proper CORS setup critical for local development

## Dependencies

### Required Services
- Supabase (authentication)
- PostgreSQL (database)
- Redis (caching, queues)
- Backend API server
- Frontend dev server

### Related Changes
- Requires `backend-api-foundation`
- Requires `frontend-demonstration-pages`
- Integrates with `protocol-agent` and `dashboard-api-endpoints`

## Archive Location

`/openspec/changes/archive/2026-02-02-integrate-frontend-backend/`

## Notes

This integration change was critical for enabling end-to-end testing and development. The local development orchestration significantly improved the developer experience, reducing setup time from ~30 minutes to a single command. The authentication flow proved robust and the WebSocket integration enabled truly real-time features.
