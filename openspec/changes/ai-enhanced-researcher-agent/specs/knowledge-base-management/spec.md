## ADDED Requirements

### Requirement: FAISS vector store initialization
The system SHALL create and maintain a FAISS vector index containing embeddings of security best practices, vulnerability patterns, and historical exploit data.

#### Scenario: Initial knowledge base creation
- **WHEN** the system starts for the first time
- **THEN** it indexes all markdown documents from the knowledge_base directory and creates a FAISS index

#### Scenario: Incremental updates
- **WHEN** new security documents are added to the knowledge base
- **THEN** the system generates embeddings and updates the FAISS index without full rebuild

### Requirement: Security pattern document ingestion
The system SHALL index security documentation from ConsenSys best practices, SWC Registry, Solidity documentation, and validated exploit reports.

#### Scenario: ConsenSys best practices ingestion
- **WHEN** ConsenSys security best practices markdown files are placed in knowledge_base/consensys/
- **THEN** the system parses each document, chunks into semantic sections, and adds to vector store

#### Scenario: SWC registry ingestion
- **WHEN** SWC (Smart Contract Weakness Classification) entries are added
- **THEN** each weakness is indexed with its ID, title, description, and remediation guidance

#### Scenario: Historical exploit ingestion
- **WHEN** a vulnerability is validated and bounty is paid
- **THEN** the system creates a sanitized exploit report and adds it to the knowledge base

### Requirement: Semantic similarity search
The system SHALL retrieve the top K most relevant security patterns for a given function using cosine similarity on embeddings.

#### Scenario: Pattern retrieval for function analysis
- **WHEN** analyzing a function with external calls and value transfers
- **THEN** the system retrieves top 5 documents related to reentrancy, unchecked sends, and call injection

#### Scenario: Configurable retrieval depth
- **WHEN** the administrator sets KNOWLEDGE_BASE_TOP_K to 10
- **THEN** similarity search returns up to 10 most relevant documents per query

### Requirement: Knowledge base versioning
The system SHALL track knowledge base version and rebuilds to ensure consistency across analysis runs.

#### Scenario: Version tracking
- **WHEN** the knowledge base is rebuilt
- **THEN** the system increments the version number and records rebuild timestamp

#### Scenario: Analysis metadata tracking
- **WHEN** a scan completes
- **THEN** the system records which knowledge base version was used for reproducibility

### Requirement: Knowledge base rebuild API
The system SHALL provide an admin endpoint to trigger full knowledge base reindexing when source documents are updated.

#### Scenario: Manual rebuild trigger
- **WHEN** an admin sends POST request to /api/admin/knowledge-base/rebuild
- **THEN** the system re-indexes all documents and returns the new version number

#### Scenario: Automatic rebuild detection
- **WHEN** the system detects knowledge_base directory modification timestamps are newer than FAISS index
- **THEN** it logs a warning suggesting rebuild and optionally auto-rebuilds if configured

### Requirement: Document metadata preservation
The system SHALL preserve document source, type, severity level, and tags during indexing for filtered retrieval.

#### Scenario: Metadata-based filtering
- **WHEN** analyzing a high-severity Slither finding
- **THEN** the system prioritizes retrieval of high-severity patterns from the knowledge base

#### Scenario: Source attribution
- **WHEN** a vulnerability finding includes knowledge base context
- **THEN** the system attributes the source document (e.g., "ConsenSys Best Practices - Reentrancy")
