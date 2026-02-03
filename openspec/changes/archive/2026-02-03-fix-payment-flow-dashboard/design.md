## Context

The demo environment uses the off-chain `ValidationService` to validate findings and trigger payments without relying on on-chain ValidationRegistry events. The current `/payments` UI and API are misaligned: the frontend expects a different response shape and does not enforce protocol scoping, while the backend supports protocol filters but does not require them. The demo requires protocol-scoped payment visibility and a dashboard-style payments view.

Constraints:
- Keep Base Sepolia payment execution via `BountyPool.releaseBounty()` intact.
- Support off-chain validation path in the demo without requiring on-chain ValidationRegistry events.
- Limit scope to payment flow and dashboard integration.

## Goals / Non-Goals

**Goals:**
- Route `/payments` to the payment dashboard and scope it to a protocol (`/protocols/:id/payments`).
- Require `protocolId` for payment list API and return protocol-scoped data.
- Align `ValidationService`-triggered payments with the payment worker expectations for the demo.
- Ensure payment payload includes protocol metadata needed by the dashboard.

**Non-Goals:**
- Redesign the overall payment architecture or replace BountyPool contracts.
- Introduce new on-chain validation dependencies for the demo flow.
- Modify wallet management or funding flows.

## Decisions

- **Use protocol-scoped payments route**: add/route `/protocols/:id/payments` to the payment dashboard to make protocol scoping explicit and avoid ambiguous global lists.
  - **Alternatives**: Keep `/payments` global and add a required query param. Rejected because the UI should be protocol-centric and unambiguous for demo.

- **Require `protocolId` on `GET /api/v1/payments`**: server rejects requests without a protocol ID to prevent accidental global queries and enforce dashboard assumptions.
  - **Alternatives**: Optional filter only. Rejected due to UX and demo requirements.

- **Synthesize validation ID for off-chain demo payments**: when `ValidationService` queues a payment, derive a deterministic `validationId` (e.g., `keccak256(findingId)`) for `BountyPool.releaseBounty()` and store/emit it through the job payload.
  - **Alternatives**: Skip on-chain payment in demo or require ValidationRegistry events. Rejected because demo must show USDC transfer on Base Sepolia.

- **Include protocol metadata in payment list response**: return protocol name/URL in payment list items for dashboard display.
  - **Alternatives**: Fetch protocol data client-side with separate calls. Rejected to keep UI simple and reduce calls.

## Risks / Trade-offs

- **[Risk]** Synthesized validation IDs are not linked to ValidationRegistry → **Mitigation**: clearly mark the off-chain demo path and keep production on-chain listeners available.
- **[Risk]** Enforcing protocolId may break existing consumers → **Mitigation**: update frontend routes and document the requirement.
- **[Risk]** Dashboard expects additional fields not present in current API → **Mitigation**: expand response shape and adjust types.

## Migration Plan

- Add protocol-scoped payments route and dashboard navigation.
- Update backend payments list API to require protocolId and include protocol metadata.
- Update `ValidationService` payment trigger to generate deterministic validation IDs for off-chain demo flow.
- Deploy backend and frontend together. Rollback by reverting API requirement and dashboard routing if needed.

## Open Questions

- Should the synthesized validation ID be stored in the Payment table (new column) or only passed through job payload?
- Should `/payments` redirect to a protocol selector or be removed entirely?
