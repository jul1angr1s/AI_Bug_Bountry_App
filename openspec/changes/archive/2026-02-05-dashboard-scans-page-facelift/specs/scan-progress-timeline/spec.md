# Scan Progress Timeline Specification

## ADDED Requirements

### Requirement: Display 7-stage scan progress timeline

The system SHALL display a vertical timeline showing all 7 stages of a scan with their completion states, timestamps, and status indicators.

#### Scenario: Timeline shows all stages in order
- **WHEN** the scan progress timeline is rendered
- **THEN** the system displays stages in order: Clone Repository → Compile Contracts → Deploy Testnet → Static Analysis → AI Deep Analysis → Proof of Concept → Submit Report

#### Scenario: Timeline displays stage completion state
- **WHEN** a scan stage has completed successfully
- **THEN** the system displays a green checkmark icon with green border and timestamp

#### Scenario: Timeline displays active stage
- **WHEN** a scan stage is currently in progress
- **THEN** the system displays a blue spinning sync icon with pulsing animation, blue border with glow effect, and "Processing..." or custom message

#### Scenario: Timeline displays pending stages
- **WHEN** a scan stage has not yet started
- **THEN** the system displays a gray circle icon with gray border and "Pending" text, with reduced opacity (50%)

#### Scenario: Timeline displays failed stage
- **WHEN** a scan stage has failed
- **THEN** the system displays a red X icon with red border and error message

---

### Requirement: Display vertical connecting line between stages

The system SHALL display a continuous vertical line connecting all timeline stages.

#### Scenario: Connecting line shows visual progression
- **WHEN** the timeline is rendered
- **THEN** the system displays a 2px vertical line from the first stage to the last stage, positioned behind stage icons

#### Scenario: Connecting line uses consistent styling
- **WHEN** the connecting line is rendered
- **THEN** the system uses border color (#21314a) and positions it at left: 19px relative to timeline container

---

### Requirement: Display stage metadata

The system SHALL display relevant metadata for each scan stage including title, status text, and optional details.

#### Scenario: Completed stage shows duration
- **WHEN** a stage has completed successfully
- **THEN** the system displays "Success • {duration}s" in gray text below the stage title

#### Scenario: Active stage shows custom message
- **WHEN** a stage is in progress with a custom message
- **THEN** the system displays the message in blue text with pulsing animation

#### Scenario: Failed stage shows error details
- **WHEN** a stage has failed
- **THEN** the system displays the error message or failure reason in red text

#### Scenario: Deploy stage shows additional context
- **WHEN** the Deploy Testnet stage completes
- **THEN** the system displays "Forked Block #{blockNumber}" if block number is available

#### Scenario: Static Analysis stage shows findings count
- **WHEN** the Static Analysis stage completes
- **THEN** the system displays "Found {count} potential vectors" if findings count is available

---

### Requirement: Sync timeline state with real-time scan progress

The system SHALL update the timeline in real-time as scan progress events are received via WebSocket.

#### Scenario: Timeline updates on progress event
- **WHEN** a `scan:progress` WebSocket event is received with updated currentStep
- **THEN** the system updates the timeline to mark previous steps as completed and current step as active

#### Scenario: Timeline persists completed states
- **WHEN** a stage completes and the next stage begins
- **THEN** the system retains the completion checkmark and timestamp for the completed stage

#### Scenario: Timeline handles out-of-order events
- **WHEN** progress events arrive in unexpected order (e.g., ANALYZE before DEPLOY)
- **THEN** the system marks all prior stages as completed and displays the current stage as active

---

### Requirement: Support responsive layout

The system SHALL adapt the timeline layout for different screen sizes.

#### Scenario: Desktop layout shows full timeline
- **WHEN** the viewport width is >= 1024px (lg breakpoint)
- **THEN** the system displays a vertical timeline with full stage titles and metadata

#### Scenario: Mobile layout shows compact timeline
- **WHEN** the viewport width is < 768px (md breakpoint)
- **THEN** the system displays a simplified vertical timeline with abbreviated stage titles or icons only

---

### Requirement: Provide accessible timeline navigation

The system SHALL ensure the timeline is accessible to keyboard and screen reader users.

#### Scenario: Timeline has semantic HTML structure
- **WHEN** the timeline is rendered
- **THEN** the system uses an ordered list (`<ol>`) with list items (`<li>`) for each stage

#### Scenario: Stage icons have accessible labels
- **WHEN** a stage icon is rendered
- **THEN** the system includes `aria-label` describing the stage state (e.g., "Clone Repository: Completed", "AI Deep Analysis: In Progress")

#### Scenario: Timeline announces state changes
- **WHEN** a stage completes or transitions to active
- **THEN** the system uses `aria-live="polite"` region to announce the update to screen readers
