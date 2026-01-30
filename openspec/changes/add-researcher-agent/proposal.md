## Why

The platform defines a Researcher Agent but lacks a full, running implementation that can continuously scan registered protocols. Adding the Researcher Agent closes the gap between protocol registration and validator verification, enabling automated, repeatable vulnerability discovery now that core workflows and infrastructure are in place.

## What Changes

- Implement a production-grade Researcher Agent runtime (MCP client, job loop, tool orchestration) for cloning, compiling, deploying to Anvil, scanning, and proof generation.
- Add scan scheduling and queueing to distribute targets to researcher workers and track progress/end states.
- Persist scan jobs, findings, and encrypted proofs with clear lifecycle states and retention rules.
- Emit real-time status updates to the dashboard and expose API endpoints for scan status and findings retrieval.
- Integrate with existing validator flow by submitting proofs to the Validator Agent via the agent bus.

## Capabilities

### New Capabilities
- (none)

### Modified Capabilities
- `agents`: Define Researcher Agent lifecycle, tool contracts, error handling, and handoff expectations to Validator.
- `workflows`: Extend the Vulnerability Scanning flow with concrete job states, retries, and proof submission steps.
- `api`: Add/adjust endpoints and WebSocket events for scan orchestration and status/finding retrieval.
- `database`: Add/adjust schemas for scan jobs, findings, proofs, and agent execution metadata.
- `security`: Define requirements for proof encryption, access controls, and audit logging for researcher outputs.

## Impact

- Affected components: Agents, Backend, Frontend; no contract changes expected.
- Chains: Anvil (Local) only for deploy/scan; no Base Sepolia/Mainnet changes.
- Dependencies: Protocol registration flow, Redis/BullMQ workers, Kimi AI service layer, Supabase/Postgres, and agent-to-agent message bus.
- Reference docs: project/Subagents.md, project/Workflows.md, project/APIRoutes.md, project/DatabaseSchema.md, project/Security.md, project/Architecture.md.
