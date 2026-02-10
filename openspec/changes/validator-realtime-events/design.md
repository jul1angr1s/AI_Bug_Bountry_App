## Context

The researcher agent emits real-time progress and log events via a Redis Pub/Sub → SSE pipeline. The frontend subscribes to SSE streams and renders a progress timeline + terminal output. The validator agent currently uses only generic `emitAgentTaskUpdate()` calls with a percentage — no step detail, no log output, no SSE streaming.

Key existing infrastructure to reuse:
- `emitScanProgress()` / `emitScanLog()` in `backend/src/websocket/events.ts` (L388-493)
- SSE endpoints in `backend/src/routes/scans.ts` (L181-300)
- `useScanProgressLive` / `useScanLogs` hooks in `frontend/src/hooks/`
- `ScanProgressTimeline` in `frontend/src/components/scans/modern/`
- `LiveTerminalOutput` in `frontend/src/components/scans/modern/` (reused as-is)
- `sseAuthenticate` middleware in `backend/src/middleware/sse-auth.ts`

The `ProofSubmissionMessage` schema includes `proofId`, `protocolId`, `scanId`, and `findingId` — all available from the start of validation.

## Goals / Non-Goals

**Goals:**
- Provide the same real-time visibility for the validator as exists for the researcher
- Support both LLM worker (7 stages) and execution worker (10 stages)
- Embed progress inline on the existing `/validations` page
- Reuse existing event infrastructure patterns and UI components

**Non-Goals:**
- Creating a separate `/validations/:id` detail page route
- Modifying the existing researcher scanning event system
- Adding persistence/replay of validation events (events are ephemeral streams)
- Changing on-chain validation logic

## Decisions

### 1. Redis Pub/Sub channels per validation (not per-agent)
**Decision:** Use `validation:{proofId}:progress` and `validation:{proofId}:logs` channels.
**Rationale:** Mirrors the scan pattern (`scan:{scanId}:*`). Each validation maps to a proofId, which is the unique identifier in the queue message. Per-validation channels allow multiple concurrent validations without interference.
**Alternative:** Single `validation:progress` channel with filtering — rejected because SSE subscribers would receive all validation events and need client-side filtering.

### 2. SSE (not WebSocket) as primary transport
**Decision:** Use Server-Sent Events via EventSource API, same as scan progress.
**Rationale:** SSE is simpler (unidirectional), works through proxies, and the scan system already proves the pattern works. WebSocket rooms are populated for future use but SSE is the active frontend consumer.

### 3. `workerType` field to distinguish stage sets
**Decision:** Include `workerType: 'EXECUTION' | 'LLM'` in every progress event.
**Rationale:** The two workers have different stage counts (7 vs 10). The frontend needs to know which stage array to render. The field is set from the first event and determines the timeline component's stage list.

### 4. Embed in existing Validations page (not new route)
**Decision:** Add an `ActiveValidationPanel` at the top of `/validations` when a validation is running.
**Rationale:** User preference. Avoids adding a new route. The panel appears when status is PENDING/VALIDATING and disappears when complete.

### 5. Reuse LiveTerminalOutput as-is
**Decision:** Import the existing `LiveTerminalOutput` component from `frontend/src/components/scans/modern/`.
**Rationale:** It accepts generic `LogMessage[]` + `scanState` props. The `scanState` prop name is fine — it maps to RUNNING/COMPLETED/FAILED regardless of context.

## Risks / Trade-offs

- **[Risk] SSE connection opened for non-running validations** → Mitigation: Backend checks proof status before establishing stream; returns 200 with terminal state event and closes immediately if validation is already complete.
- **[Risk] Multiple active validations at once** → Mitigation: Show only the most recent active validation in the panel. Concurrency is 1 for the LLM worker, so in practice only one runs at a time.
- **[Risk] `protocolId` not directly available on proof lookup in SSE route** → Mitigation: Join through `proof.finding.scan.protocolId` in the Prisma query. This is a read-only query used only once at connection time.
