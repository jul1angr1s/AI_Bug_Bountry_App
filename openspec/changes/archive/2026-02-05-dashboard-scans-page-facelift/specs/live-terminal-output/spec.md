# Live Terminal Output Specification

## ADDED Requirements

### Requirement: Display terminal-style log output

The system SHALL display scan agent logs in a terminal-style interface with monospace font and dark background.

#### Scenario: Terminal has authentic styling
- **WHEN** the live terminal output component is rendered
- **THEN** the system displays logs in a monospace font (ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas) on a black background (#0c0c0c)

#### Scenario: Terminal has title bar
- **WHEN** the terminal component is rendered
- **THEN** the system displays a title bar showing "scan_agent_01 — zsh" with terminal icon and macOS-style window control dots (red, yellow, green with reduced opacity)

#### Scenario: Terminal has scrollable content area
- **WHEN** log output exceeds the visible area (320px height)
- **THEN** the system enables vertical scrolling with auto-scroll to bottom on new entries

---

### Requirement: Display color-coded log messages

The system SHALL display log messages with color coding based on severity level.

#### Scenario: Info messages display in blue
- **WHEN** a log message has level "INFO"
- **THEN** the system displays the message in blue color (#60a5fa)

#### Scenario: Analysis messages display in green with glow
- **WHEN** a log message has level "ANALYSIS"
- **THEN** the system displays the message in green (#4ade80) with text-shadow glow effect (0 0 5px rgba(74, 222, 128, 0.5))

#### Scenario: Alert messages display in red
- **WHEN** a log message has level "ALERT"
- **THEN** the system displays the message in red color (#f87171)

#### Scenario: Warning messages display in yellow
- **WHEN** a log message has level "WARN"
- **THEN** the system displays the message in yellow color (#fbbf24)

#### Scenario: Default messages display in gray
- **WHEN** a log message has no level or level "DEFAULT"
- **THEN** the system displays the message in light gray (#cbd5e1) with reduced opacity (50%)

---

### Requirement: Support log message formatting

The system SHALL preserve log message formatting including line prefixes, tree structures, and indentation.

#### Scenario: Messages with prefixes display correctly
- **WHEN** a log message has a prefix (e.g., "> ", "[INFO] ")
- **THEN** the system preserves the prefix in the displayed output

#### Scenario: Tree structures display with correct indentation
- **WHEN** a log message contains tree characters (├──, └──)
- **THEN** the system preserves spacing and displays tree structure visually aligned

#### Scenario: Multi-line messages display with line breaks
- **WHEN** a log message contains newline characters
- **THEN** the system renders each line as a separate div with preserved indentation

---

### Requirement: Auto-scroll to latest log entry

The system SHALL automatically scroll to the bottom when new log messages arrive, unless the user has manually scrolled up.

#### Scenario: Auto-scroll on new message when at bottom
- **WHEN** a new log message arrives AND the scroll position is at or near the bottom (within 50px)
- **THEN** the system scrolls to the bottom to show the new message

#### Scenario: Preserve scroll position when user scrolled up
- **WHEN** a new log message arrives AND the user has scrolled more than 50px from the bottom
- **THEN** the system does NOT auto-scroll, preserving the user's scroll position

#### Scenario: Resume auto-scroll when user scrolls to bottom
- **WHEN** the user manually scrolls to the bottom after disabling auto-scroll
- **THEN** the system re-enables auto-scroll for subsequent messages

---

### Requirement: Display cursor animation for active terminal

The system SHALL display a blinking cursor after the last log entry to indicate the terminal is active.

#### Scenario: Cursor displays when scan is running
- **WHEN** the scan state is "RUNNING"
- **THEN** the system displays an underscore character ("_") after the last log message with pulsing animation

#### Scenario: Cursor removed when scan completes
- **WHEN** the scan state changes to "COMPLETED", "FAILED", or "ABORTED"
- **THEN** the system removes the cursor animation

---

### Requirement: Accept log data via props

The system SHALL accept log messages as a prop array with structured data.

#### Scenario: Component accepts logs prop
- **WHEN** the LiveTerminalOutput component is instantiated
- **THEN** the system accepts a `logs` prop of type `Array<{ level: string, message: string, timestamp: string }>`

#### Scenario: Component handles empty logs array
- **WHEN** the `logs` prop is an empty array
- **THEN** the system displays a placeholder message "Awaiting agent output..."

#### Scenario: Component handles missing logs prop
- **WHEN** the `logs` prop is undefined or null
- **THEN** the system displays a placeholder message "Awaiting agent output..."

---

### Requirement: Support mock data for development

The system SHALL support mock log data for development and testing purposes until backend implements log streaming.

#### Scenario: Component uses mock data when no real logs available
- **WHEN** the component is used in development mode without backend log streaming
- **THEN** the system uses predefined mock log data matching the expected format

#### Scenario: Mock data includes all severity levels
- **WHEN** mock log data is used
- **THEN** the data includes examples of INFO, ANALYSIS, ALERT, WARN, and DEFAULT messages

---

### Requirement: Provide performant rendering for large log volumes

The system SHALL efficiently render log messages to prevent performance degradation with high log volumes.

#### Scenario: Limit rendered log lines
- **WHEN** the total log count exceeds 500 messages
- **THEN** the system displays only the most recent 500 messages and discards older entries

#### Scenario: Virtualize rendering for 200+ logs
- **WHEN** the log count exceeds 200 messages
- **THEN** the system uses virtual scrolling to render only visible log lines (optional optimization)

#### Scenario: Throttle log updates
- **WHEN** log messages arrive faster than 10 per second
- **THEN** the system batches updates to render at most once every 100ms
