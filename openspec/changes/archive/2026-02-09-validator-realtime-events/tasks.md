## 1. Backend Event Infrastructure (Layer: Backend)

- [ ] 1.1 Add `emitValidationProgress()` and `emitValidationLog()` functions with types to `backend/src/websocket/events.ts`, mirroring `emitScanProgress` (L388-419) and `emitScanLog` (L472-493). Redis channels: `validation:{proofId}:progress` and `validation:{proofId}:logs`. Types: `ValidationProgressEvent`, `ValidationLogEvent`, `ValidationWorkerType`.
- [ ] 1.2 Write tests for `emitValidationProgress` and `emitValidationLog` verifying Redis publish and WebSocket emit behavior. Test file: `backend/src/websocket/__tests__/validation-events.test.ts`.

## 2. Backend SSE Routes (Layer: Backend)

- [ ] 2.1 Add `GET /api/v1/validations/:id/progress` SSE endpoint to `backend/src/routes/validation.routes.ts`. Uses `sseAuthenticate` middleware, subscribes to Redis `validation:{id}:progress`, streams events, auto-closes on COMPLETED/FAILED. Returns 404 for invalid proofId.
- [ ] 2.2 Add `GET /api/v1/validations/:id/logs` SSE endpoint to `backend/src/routes/validation.routes.ts`. Subscribes to Redis `validation:{id}:logs` + `validation:{id}:progress` (for completion detection).
- [ ] 2.3 Write tests for SSE endpoints verifying: initial state event, Redis subscription, 404 on missing proof, auth required. Test file: `backend/src/routes/__tests__/validation-sse.test.ts`.

## 3. Update LLM Validator Worker (Layer: Agents)

- [ ] 3.1 Replace `emitAgentTaskUpdate` with `emitValidationProgress` + `emitValidationLog` in `backend/src/agents/validator/llm-worker.ts`. 7 stages: DECRYPT_PROOF, FETCH_DETAILS, READ_CONTRACT, LLM_ANALYSIS, UPDATE_RESULT, RECORD_ONCHAIN, COMPLETE. Include detailed terminal-style log messages at each step.
- [ ] 3.2 Write tests verifying the LLM worker emits correct progress and log events at each stage. Test file: `backend/src/agents/validator/__tests__/llm-worker-events.test.ts`.

## 4. Update Execution Validator Worker (Layer: Agents)

- [ ] 4.1 Replace `emitAgentTaskUpdate` with `emitValidationProgress` + `emitValidationLog` in `backend/src/agents/validator/worker.ts`. 10 stages: DECRYPT_PROOF, FETCH_DETAILS, CLONE_REPO, COMPILE, SPAWN_SANDBOX, DEPLOY, EXECUTE_EXPLOIT, UPDATE_RESULT, RECORD_ONCHAIN, COMPLETE. Include detailed terminal-style log messages at each step.
- [ ] 4.2 Write tests verifying the execution worker emits correct progress and log events at each stage. Test file: `backend/src/agents/validator/__tests__/worker-events.test.ts`.

## 5. Frontend Hooks (Layer: Frontend)

- [ ] 5.1 Create `frontend/src/hooks/useValidationProgressLive.ts` following `useScanProgressLive.ts` pattern. SSE endpoint: `/api/v1/validations/{id}/progress`. State includes `workerType`. Auto-closes on COMPLETED/FAILED.
- [ ] 5.2 Create `frontend/src/hooks/useValidationLogs.ts` following `useScanLogs.ts` pattern. SSE endpoint: `/api/v1/validations/{id}/logs`. Reuses `LogMessage` type from `LiveTerminalOutput`. Terminal states: VALIDATED, REJECTED, FAILED, COMPLETED.
- [ ] 5.3 Write tests for both hooks verifying SSE connection, state updates, and auto-close behavior. Test file: `frontend/src/__tests__/validation-hooks.test.ts`.

## 6. Frontend Components (Layer: Frontend)

- [ ] 6.1 Create `frontend/src/components/validations/ValidationProgressTimeline.tsx` adapted from `ScanProgressTimeline.tsx`. Two stage arrays: LLM_STAGES (7) and EXECUTION_STAGES (10), selected by `workerType` prop. Same visual treatment (completed/active/failed/pending icons).
- [ ] 6.2 Create `frontend/src/components/validations/ActiveValidationPanel.tsx` wrapping `ValidationProgressTimeline` + reused `LiveTerminalOutput` in a 12-col grid layout. Props: `{ validationId: string }`. Dark theme styling matching scan dashboard.
- [ ] 6.3 Write tests for `ValidationProgressTimeline` verifying correct stage rendering for both worker types and status transitions. Test file: `frontend/src/components/validations/__tests__/ValidationProgressTimeline.test.tsx`.
- [ ] 6.4 Write tests for `ActiveValidationPanel` verifying hook integration and component composition. Test file: `frontend/src/components/validations/__tests__/ActiveValidationPanel.test.tsx`.

## 7. Validations Page Integration (Layer: Frontend)

- [ ] 7.1 Update `frontend/src/pages/Validations.tsx` to detect active validations (status PENDING/VALIDATING) and render `ActiveValidationPanel` at the top. Add VALIDATING to status filter options.
- [ ] 7.2 Write tests for the updated Validations page verifying panel appears for active validations and disappears on completion. Test file: `frontend/src/pages/__tests__/Validations-active-panel.test.tsx`.
