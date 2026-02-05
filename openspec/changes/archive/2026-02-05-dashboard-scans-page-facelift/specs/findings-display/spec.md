# Findings Display Specification

## ADDED Requirements

### Requirement: Display findings as card list

The system SHALL display vulnerability findings as a vertical list of cards with consistent styling and spacing.

#### Scenario: Findings display in vertical list
- **WHEN** the findings list is rendered with findings data
- **THEN** the system displays each finding as a card (rounded border, dark surface background) with 12px gap between cards

#### Scenario: Findings list has section header
- **WHEN** the findings list is rendered
- **THEN** the system displays "Real-time Findings" as the section heading with warning icon and "Export Report" action button

#### Scenario: Empty findings list shows placeholder
- **WHEN** the findings array is empty
- **THEN** the system displays a placeholder message "No vulnerabilities detected yet" with appropriate icon

---

### Requirement: Display finding severity badge

The system SHALL display a color-coded severity badge for each finding indicating its criticality level.

#### Scenario: Critical findings display red badge
- **WHEN** a finding has severity "CRITICAL"
- **THEN** the system displays a red badge with red background (10% opacity), red text, and red ring border with "CRITICAL" label in uppercase

#### Scenario: High findings display orange badge
- **WHEN** a finding has severity "HIGH"
- **THEN** the system displays an orange badge with orange background (10% opacity), orange text, and orange ring border with "HIGH" label in uppercase

#### Scenario: Medium findings display yellow badge
- **WHEN** a finding has severity "MEDIUM"
- **THEN** the system displays a yellow badge with yellow background (10% opacity), yellow text, and yellow ring border with "MEDIUM" label in uppercase

#### Scenario: Low findings display blue badge
- **WHEN** a finding has severity "LOW"
- **THEN** the system displays a blue badge with blue background (10% opacity), blue text, and blue ring border with "LOW" label in uppercase

#### Scenario: Info findings display gray badge
- **WHEN** a finding has severity "INFO"
- **THEN** the system displays a gray badge with gray background (10% opacity), gray text, and gray ring border with "INFO" label in uppercase

---

### Requirement: Display finding metadata

The system SHALL display key metadata for each finding including vulnerability type, CWE code, title, and description.

#### Scenario: Finding displays CWE code
- **WHEN** a finding has a CWE code (e.g., "CWE-896")
- **THEN** the system displays the code in monospace font in gray text next to the severity badge

#### Scenario: Finding displays title
- **WHEN** a finding has a title or vulnerability type
- **THEN** the system displays the title in white bold text (base size) truncated if exceeds container width

#### Scenario: Finding displays description
- **WHEN** a finding has a description
- **THEN** the system displays the description in gray text (sm size) limited to 1-2 lines with ellipsis if truncated

#### Scenario: Finding displays file path and line number
- **WHEN** a finding has file path and line number
- **THEN** the system displays "{filePath}:{lineNumber}" in monospace font as a link or highlighted text (optional based on design)

---

### Requirement: Display AI confidence meter

The system SHALL display a visual confidence meter showing the AI's confidence score for each finding.

#### Scenario: Confidence meter displays percentage
- **WHEN** a finding has a confidence score (0-100)
- **THEN** the system displays the score as a percentage (e.g., "98%") in white bold text

#### Scenario: Confidence meter displays progress bar
- **WHEN** a finding is rendered
- **THEN** the system displays a horizontal progress bar with gradient fill (green-400 to green-600) representing the confidence percentage

#### Scenario: Confidence meter has label
- **WHEN** the confidence meter is rendered
- **THEN** the system displays "AI Confidence" label in gray text above the progress bar

#### Scenario: Confidence meter color varies by score
- **WHEN** a finding has confidence < 60%
- **THEN** the system displays the progress bar in yellow-orange gradient (optional enhancement)

#### Scenario: Confidence meter color for medium score
- **WHEN** a finding has confidence between 60-80%
- **THEN** the system displays the progress bar in blue gradient (optional enhancement)

#### Scenario: Confidence meter color for high score
- **WHEN** a finding has confidence > 80%
- **THEN** the system displays the progress bar in green gradient

---

### Requirement: Support finding card interactivity

The system SHALL make finding cards interactive with hover states and expandable details.

#### Scenario: Finding card highlights on hover
- **WHEN** the user hovers over a finding card
- **THEN** the system changes the background color to a lighter shade (#1f2b3e) with smooth transition

#### Scenario: Finding card has expand button
- **WHEN** a finding card is rendered
- **THEN** the system displays a chevron-right icon button on the right side

#### Scenario: Finding card expands on click
- **WHEN** the user clicks a finding card or chevron button
- **THEN** the system expands the card to show full description, file path, affected code snippet, and remediation guidance (future enhancement)

---

### Requirement: Display findings in responsive layout

The system SHALL adapt the finding card layout for different screen sizes.

#### Scenario: Desktop layout shows full metadata
- **WHEN** the viewport width is >= 768px
- **THEN** the system displays findings in horizontal layout with metadata and confidence meter side-by-side

#### Scenario: Mobile layout stacks metadata
- **WHEN** the viewport width is < 768px
- **THEN** the system stacks severity badge, title, description, and confidence meter vertically with border separator between sections

---

### Requirement: Update findings list in real-time

The system SHALL update the findings list as new findings are detected during the scan.

#### Scenario: New finding appears at top of list
- **WHEN** a new finding is detected via WebSocket or API update
- **THEN** the system adds the finding to the top of the list with fade-in animation (optional)

#### Scenario: Finding count updates in section header
- **WHEN** a new finding is added
- **THEN** the system updates the total findings count displayed in the section header or chart

---

### Requirement: Support findings sorting and filtering

The system SHALL allow users to sort and filter the findings list (future enhancement).

#### Scenario: Findings sorted by severity by default
- **WHEN** the findings list is rendered
- **THEN** the system sorts findings by severity (Critical → High → Medium → Low → Info) then by timestamp (newest first)

#### Scenario: User can filter by severity
- **WHEN** the user selects a severity filter (e.g., "Critical only")
- **THEN** the system displays only findings matching the selected severity

#### Scenario: User can search findings
- **WHEN** the user enters text in the findings search box
- **THEN** the system filters findings by matching title, description, or file path

---

### Requirement: Provide accessible findings navigation

The system SHALL ensure the findings list is accessible to keyboard and screen reader users.

#### Scenario: Findings have semantic HTML structure
- **WHEN** the findings list is rendered
- **THEN** the system uses a list element (`<ul>` or `<div role="list">`) with list items

#### Scenario: Finding cards are keyboard navigable
- **WHEN** the user navigates with keyboard
- **THEN** the system allows Tab navigation between finding cards with visible focus indicators

#### Scenario: Finding cards announce severity
- **WHEN** a finding card receives focus
- **THEN** the system announces the severity level and title via `aria-label` (e.g., "Critical: Reentrancy in swapCallback")
