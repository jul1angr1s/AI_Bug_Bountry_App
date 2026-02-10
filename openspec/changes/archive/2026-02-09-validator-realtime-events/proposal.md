## Why

The researcher agent provides full real-time visibility during scanning (step-by-step progress timeline + color-coded terminal log output streamed via SSE), but the validator agent only emits generic progress percentages with no step detail or log output. Users cannot see what the validator is doing behind the scenes — they only see a final VALIDATED/REJECTED result. This creates an opaque gap in the workflow between scanning and payment, reducing user trust and making debugging difficult.

## What Changes

- Add `emitValidationProgress()` and `emitValidationLog()` event emitter functions to the WebSocket/Redis event infrastructure, mirroring the existing `emitScanProgress()` and `emitScanLog()` pattern
- Add SSE streaming endpoints (`GET /api/v1/validations/:id/progress` and `GET /api/v1/validations/:id/logs`) to the validation routes, mirroring the scan SSE endpoints
- Replace all generic `emitAgentTaskUpdate()` calls in the LLM validator worker (7 stages) with detailed step-by-step progress and log events
- Replace all generic `emitAgentTaskUpdate()` calls in the execution validator worker (10 stages) with detailed step-by-step progress and log events
- Add frontend SSE hooks (`useValidationProgressLive`, `useValidationLogs`) mirroring the scan hooks
- Add `ValidationProgressTimeline` component with stage definitions for both worker types
- Add `ActiveValidationPanel` component embedding timeline + reused `LiveTerminalOutput`
- Update the existing `/validations` page to display the active validation panel inline at the top when a validation is running

## Capabilities

### New Capabilities
- `validator-event-streaming`: Real-time SSE-based event streaming for the validator agent, including backend emitters, Redis pub/sub channels, SSE endpoints, frontend hooks, progress timeline, and terminal log display embedded in the validations page

### Modified Capabilities
- `workflows`: The validation stage of the workflow now emits granular real-time events (was opaque, now transparent)

## Impact

- **Backend**: `backend/src/websocket/events.ts`, `backend/src/routes/validation.routes.ts`, `backend/src/agents/validator/llm-worker.ts`, `backend/src/agents/validator/worker.ts`
- **Frontend**: `frontend/src/pages/Validations.tsx`, new hooks in `frontend/src/hooks/`, new components in `frontend/src/components/validations/`
- **Reused**: `frontend/src/components/scans/modern/LiveTerminalOutput.tsx` (as-is), `backend/src/middleware/sse-auth.ts` (as-is)
- **APIs**: Two new SSE endpoints on the validation route
- **Redis**: New pub/sub channels `validation:{id}:progress` and `validation:{id}:logs`
- **Chain**: No on-chain changes — purely backend/frontend event plumbing
- **Security**: SSE endpoints use existing `sseAuthenticate` middleware (cookie-based auth)
