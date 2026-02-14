// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title AgentIdentityRegistry
 * @notice ERC-8004 compliant agent identity registry using ERC-721 NFTs
 * @dev Provides portable, censorship-resistant identifiers for researchers and validators
 */
contract AgentIdentityRegistry is ERC721, AccessControl {

    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    enum AgentType {
        RESEARCHER,
        VALIDATOR
    }

    struct Agent {
        uint256 agentId;
        address wallet;
        AgentType agentType;
        uint256 registeredAt;
        bool active;
    }

    uint256 private _agentIdCounter;
    string private _metadataBaseURI;

    mapping(uint256 => Agent) public agents;
    mapping(address => uint256) public walletToAgentId;
    mapping(AgentType => uint256[]) private _agentsByType;

    uint256[] public allAgentIds;

    event AgentRegistered(
        uint256 indexed agentId,
        address indexed wallet,
        AgentType agentType,
        uint256 registeredAt
    );

    event AgentDeactivated(
        uint256 indexed agentId,
        address indexed wallet
    );

    event AgentReactivated(
        uint256 indexed agentId,
        address indexed wallet
    );

    error AgentAlreadyRegistered(address wallet);
    error AgentNotFound(uint256 agentId);
    error AgentNotActive(uint256 agentId);
    error InvalidWallet();
    error TransferNotAllowed();

    constructor() ERC721("BugBounty Agent Identity", "BBAGENT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REGISTRAR_ROLE, msg.sender);
    }

    /**
     * @notice Register a new agent and mint identity NFT
     * @param wallet Agent's wallet address
     * @param agentType Type of agent (RESEARCHER or VALIDATOR)
     * @return agentId Unique identifier for the agent
     */
    function registerAgent(
        address wallet,
        AgentType agentType
    ) external onlyRole(REGISTRAR_ROLE) returns (uint256 agentId) {
        if (wallet == address(0)) {
            revert InvalidWallet();
        }

        if (walletToAgentId[wallet] != 0) {
            revert AgentAlreadyRegistered(wallet);
        }

        _agentIdCounter++;
        agentId = _agentIdCounter;

        Agent memory newAgent = Agent({
            agentId: agentId,
            wallet: wallet,
            agentType: agentType,
            registeredAt: block.timestamp,
            active: true
        });

        agents[agentId] = newAgent;
        walletToAgentId[wallet] = agentId;
        _agentsByType[agentType].push(agentId);
        allAgentIds.push(agentId);

        _mint(wallet, agentId);

        emit AgentRegistered(agentId, wallet, agentType, block.timestamp);

        return agentId;
    }

    /**
     * @notice Self-register as an agent (for permissionless registration)
     * @param agentType Type of agent (RESEARCHER or VALIDATOR)
     * @return agentId Unique identifier for the agent
     */
    function selfRegister(AgentType agentType) external returns (uint256 agentId) {
        if (walletToAgentId[msg.sender] != 0) {
            revert AgentAlreadyRegistered(msg.sender);
        }

        _agentIdCounter++;
        agentId = _agentIdCounter;

        Agent memory newAgent = Agent({
            agentId: agentId,
            wallet: msg.sender,
            agentType: agentType,
            registeredAt: block.timestamp,
            active: true
        });

        agents[agentId] = newAgent;
        walletToAgentId[msg.sender] = agentId;
        _agentsByType[agentType].push(agentId);
        allAgentIds.push(agentId);

        _mint(msg.sender, agentId);

        emit AgentRegistered(agentId, msg.sender, agentType, block.timestamp);

        return agentId;
    }

    /**
     * @notice Deactivate an agent
     * @param agentId Agent identifier
     */
    function deactivateAgent(uint256 agentId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Agent storage agent = agents[agentId];

        if (agent.registeredAt == 0) {
            revert AgentNotFound(agentId);
        }

        agent.active = false;

        emit AgentDeactivated(agentId, agent.wallet);
    }

    /**
     * @notice Reactivate an agent
     * @param agentId Agent identifier
     */
    function reactivateAgent(uint256 agentId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Agent storage agent = agents[agentId];

        if (agent.registeredAt == 0) {
            revert AgentNotFound(agentId);
        }

        agent.active = true;

        emit AgentReactivated(agentId, agent.wallet);
    }

    /**
     * @notice Get agent by ID
     * @param agentId Agent identifier
     * @return Agent struct
     */
    function getAgent(uint256 agentId) external view returns (Agent memory) {
        Agent memory agent = agents[agentId];

        if (agent.registeredAt == 0) {
            revert AgentNotFound(agentId);
        }

        return agent;
    }

    /**
     * @notice Get agent by wallet address
     * @param wallet Wallet address
     * @return Agent struct
     */
    function getAgentByWallet(address wallet) external view returns (Agent memory) {
        uint256 agentId = walletToAgentId[wallet];

        if (agentId == 0) {
            revert AgentNotFound(0);
        }

        return agents[agentId];
    }

    /**
     * @notice Check if wallet is registered
     * @param wallet Wallet address
     * @return bool True if registered
     */
    function isRegistered(address wallet) external view returns (bool) {
        return walletToAgentId[wallet] != 0;
    }

    /**
     * @notice Check if agent is active
     * @param agentId Agent identifier
     * @return bool True if active
     */
    function isActive(uint256 agentId) external view returns (bool) {
        return agents[agentId].active;
    }

    /**
     * @notice Get all agents of a specific type
     * @param agentType Agent type to filter by
     * @return Agent[] Array of agents
     */
    function getAgentsByType(AgentType agentType) external view returns (Agent[] memory) {
        uint256[] memory agentIds = _agentsByType[agentType];
        Agent[] memory results = new Agent[](agentIds.length);

        for (uint256 i = 0; i < agentIds.length; i++) {
            results[i] = agents[agentIds[i]];
        }

        return results;
    }

    /**
     * @notice Get total agent count
     * @return uint256 Total number of agents
     */
    function getTotalAgentCount() external view returns (uint256) {
        return allAgentIds.length;
    }

    /**
     * @notice Get agent count by type
     * @param agentType Agent type
     * @return uint256 Number of agents of that type
     */
    function getAgentCountByType(AgentType agentType) external view returns (uint256) {
        return _agentsByType[agentType].length;
    }

    /**
     * @notice Add registrar role
     * @param registrar Address to grant role
     */
    function addRegistrar(address registrar) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(REGISTRAR_ROLE, registrar);
    }

    /**
     * @notice Remove registrar role
     * @param registrar Address to revoke role
     */
    function removeRegistrar(address registrar) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(REGISTRAR_ROLE, registrar);
    }

    /**
     * @notice Set the base URI for token metadata
     * @param baseURI Base URI (must end with trailing slash)
     */
    function setBaseURI(string memory baseURI) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _metadataBaseURI = baseURI;
    }

    /**
     * @notice Returns the base URI for token metadata
     */
    function _baseURI() internal view override returns (string memory) {
        return _metadataBaseURI;
    }

    /**
     * @notice Override transfer to make tokens soulbound (non-transferable)
     * @dev Agents cannot transfer their identity NFT
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);

        if (from != address(0) && to != address(0)) {
            revert TransferNotAllowed();
        }

        return super._update(to, tokenId, auth);
    }

    /**
     * @notice Required override for AccessControl + ERC721
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
