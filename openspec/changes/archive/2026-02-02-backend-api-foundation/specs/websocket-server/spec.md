# Spec: WebSocket Server

## ADDED Requirements

### Requirement: Socket.io server initialization
The system SHALL initialize Socket.io server attached to Express HTTP server.

#### Scenario: WebSocket server starts
- **WHEN** Express server starts successfully
- **THEN** system initializes Socket.io and listens for connections

#### Scenario: CORS configuration
- **WHEN** Socket.io server initializes
- **THEN** system configures CORS to accept frontend origin

### Requirement: Client connection handling
The system SHALL manage WebSocket client connections.

#### Scenario: Client connects
- **WHEN** client establishes WebSocket connection
- **THEN** system emits connection event with socket instance

#### Scenario: Client disconnects
- **WHEN** client closes WebSocket connection
- **THEN** system removes socket from all rooms and cleans up resources

#### Scenario: Connection authentication
- **WHEN** client connects with auth token in handshake
- **THEN** system verifies token and attaches user to socket

### Requirement: Room management
The system SHALL support room-based event broadcasting.

#### Scenario: Client joins room
- **WHEN** authenticated client requests to join protocol room
- **THEN** system adds socket to protocol:{protocolId} room

#### Scenario: Client leaves room
- **WHEN** client disconnects or switches protocol
- **THEN** system removes socket from previous room

#### Scenario: Broadcast to room
- **WHEN** event is emitted to specific room
- **THEN** system delivers event only to sockets in that room

### Requirement: Event emission
The system SHALL emit events to connected clients.

#### Scenario: Server emits event
- **WHEN** backend emits event with payload
- **THEN** system serializes payload and sends to target clients

#### Scenario: Event to all clients
- **WHEN** event is broadcast without room
- **THEN** system sends to all connected sockets

#### Scenario: Event acknowledgment
- **WHEN** event requires acknowledgment
- **THEN** system waits for client callback with timeout

### Requirement: Connection limits
The system SHALL enforce connection limits per user.

#### Scenario: Maximum connections per user
- **WHEN** user attempts to open 4th concurrent connection
- **THEN** system rejects connection with error "Max connections exceeded"

### Requirement: Heartbeat mechanism
The system SHALL monitor connection health with heartbeats.

#### Scenario: Heartbeat received
- **WHEN** client sends heartbeat ping
- **THEN** system responds with pong and updates lastSeen timestamp

#### Scenario: Heartbeat timeout
- **WHEN** no heartbeat received for 60 seconds
- **THEN** system disconnects socket and logs timeout
