## ADDED Requirements

### Requirement: Remediation guidance generation
The system SHALL generate specific, actionable remediation steps for each vulnerability including code examples and best practice references.

#### Scenario: Reentrancy remediation guidance
- **WHEN** a reentrancy vulnerability is detected
- **THEN** the report includes specific remediation steps: add ReentrancyGuard, use checks-effects-interactions pattern, and provides code example

#### Scenario: Access control remediation
- **WHEN** an access control vulnerability is found
- **THEN** the report suggests specific OpenZeppelin contracts (Ownable, AccessControl) with implementation examples

### Requirement: Code snippet extraction
The system SHALL extract and format the vulnerable code snippet with line numbers and syntax highlighting markers for frontend display.

#### Scenario: Vulnerable code extraction
- **WHEN** a vulnerability is found at line 42 of Token.sol
- **THEN** the report includes lines 38-46 with line numbers and the vulnerable line highlighted

#### Scenario: Multi-line vulnerability formatting
- **WHEN** a vulnerability spans multiple lines or code blocks
- **THEN** the report includes all relevant lines with clear markers for the vulnerable section

### Requirement: Severity scoring with justification
The system SHALL assign severity levels (CRITICAL, HIGH, MEDIUM, LOW, INFO) with detailed justification based on exploitability and impact.

#### Scenario: Severity calculation
- **WHEN** a vulnerability allows fund drainage with low complexity
- **THEN** the severity is CRITICAL with justification "Direct fund loss possible through simple exploit"

#### Scenario: Severity downgrade with mitigations
- **WHEN** a vulnerability exists but requires admin privileges to exploit
- **THEN** the severity is downgraded to MEDIUM with justification about access control barriers

### Requirement: Confidence score explanation
The system SHALL provide transparent confidence scoring that combines static analysis certainty and AI model confidence.

#### Scenario: Hybrid confidence calculation
- **WHEN** Slither reports 0.9 confidence and AI reports 0.8 confidence
- **THEN** the final confidence score is calculated as weighted average (e.g., 0.85) with breakdown shown

#### Scenario: Confidence factor attribution
- **WHEN** displaying confidence score
- **THEN** the report explains contributing factors (e.g., "High: Pattern match + LLM certainty + Historical precedent")

### Requirement: Related vulnerability linking
The system SHALL identify and link related vulnerabilities within the same contract or scan for comprehensive understanding.

#### Scenario: Vulnerability chain detection
- **WHEN** a reentrancy vulnerability is found in withdraw() and missing event in deposit()
- **THEN** the report links these as related issues affecting the same value flow

#### Scenario: Duplicate vulnerability consolidation
- **WHEN** both Slither and AI detect the same vulnerability
- **THEN** the system consolidates into a single finding with combined evidence

### Requirement: Historical context enrichment
The system SHALL enrich findings with references to similar historical exploits and their impact when available.

#### Scenario: Known exploit pattern matching
- **WHEN** a vulnerability matches a pattern from the DAO hack
- **THEN** the report includes reference to the historical incident with links to post-mortems

#### Scenario: CVE cross-referencing
- **WHEN** a vulnerability type has associated CVEs or SWC entries
- **THEN** the report includes these identifiers for further research

### Requirement: Formatted report export
The system SHALL support exporting findings in multiple formats (JSON, Markdown, PDF) with complete vulnerability details.

#### Scenario: JSON export for API consumers
- **WHEN** requesting findings via API
- **THEN** the response includes structured JSON with all vulnerability fields including remediation

#### Scenario: Markdown report generation
- **WHEN** generating a human-readable report
- **THEN** the system produces markdown with formatted code blocks, severity badges, and table of contents
