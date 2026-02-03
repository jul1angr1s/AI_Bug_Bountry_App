## 1. Backend Payment Flow Alignment

- [x] 1.1 Backend: Require `protocolId` in payment list schema and API, return protocol metadata in list response (`backend/src/schemas/payment.schema.ts`, `backend/src/routes/payment.routes.ts`, `backend/src/services/payment.service.ts`) (ref: `project/APIRoutes.md`, `project/Workflows.md`)
- [x] 1.2 Backend: Update off-chain `ValidationService` payment trigger to derive deterministic validationId and enqueue payment jobs compatible with payment worker (`backend/src/services/validation.service.ts`, `backend/src/queues/payment.queue.ts`, `backend/src/workers/payment.worker.ts`) (ref: `project/Workflows.md`)

## 2. Frontend Payments Dashboard

- [x] 2.1 Frontend: Route `/protocols/:id/payments` to `PaymentDashboard` and ensure protocolId is passed to payment queries (`frontend/src/App.tsx`, `frontend/src/pages/PaymentDashboard.tsx`, `frontend/src/components/Payment/*`) (ref: `project/Workflows.md`)
- [x] 2.2 Frontend: Remove or redirect `/payments` to protocol-scoped dashboard and align UI with protocol-only payment lists (`frontend/src/App.tsx`, `frontend/src/pages/Payments.tsx`) (ref: `project/Workflows.md`)
