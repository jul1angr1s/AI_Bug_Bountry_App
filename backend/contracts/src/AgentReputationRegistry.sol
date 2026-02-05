// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title AgentReputationRegistry
 * @notice ERC-8004 compliant reputation registry for agent scoring
 * @dev Aggregates validation outcomes to compute researcher reputation scores
 */
contract AgentReputationRegistry is AccessControl {

    bytes32 public constant SCORER_ROLE = keccak256("SCORER_ROLE");

    struct ReputationRecord {
        uint256 agentId;
        address wallet;
        uint256 confirmedCount;
        uint256 rejectedCount;
        uint256 inconclusiveCount;
        uint256 totalSubmissions;
        uint256 reputationScore;
        uint256 lastUpdated;
    }

    struct FeedbackRecord {
        bytes32 feedbackId;
        uint256 researcherAgentId;
        uint256 validatorAgentId;
        bytes32 validationId;
        FeedbackType feedbackType;
        uint256 timestamp;
    }

    enum FeedbackType {
        CONFIRMED_CRITICAL,
        CONFIRMED_HIGH,
        CONFIRMED_MEDIUM,
        CONFIRMED_LOW,
        CONFIRMED_INFORMATIONAL,
        REJECTED
    }

    uint256 private _feedbackCounter;

    mapping(uint256 => ReputationRecord) public reputations;
    mapping(address => uint256) public walletToAgentId;
    mapping(bytes32 => FeedbackRecord) public feedbackRecords;
    mapping(uint256 => bytes32[]) private _agentFeedbacks;

    bytes32[] public allFeedbackIds;

    event ReputationUpdated(
        uint256 indexed agentId,
        address indexed wallet,
        uint256 confirmedCount,
        uint256 rejectedCount,
        uint256 reputationScore,
        uint256 timestamp
    );

    event FeedbackRecorded(
        bytes32 indexed feedbackId,
        uint256 indexed researcherAgentId,
        uint256 indexed validatorAgentId,
        bytes32 validationId,
        FeedbackType feedbackType,
        uint256 timestamp
    );

    error AgentNotRegistered(uint256 agentId);
    error InvalidAgentId();
    error FeedbackAlreadyExists(bytes32 validationId);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(SCORER_ROLE, msg.sender);
    }

    /**
     * @notice Initialize reputation for an agent
     * @param agentId Agent identifier from AgentIdentityRegistry
     * @param wallet Agent's wallet address
     */
    function initializeReputation(
        uint256 agentId,
        address wallet
    ) external onlyRole(SCORER_ROLE) {
        if (agentId == 0) {
            revert InvalidAgentId();
        }

        reputations[agentId] = ReputationRecord({
            agentId: agentId,
            wallet: wallet,
            confirmedCount: 0,
            rejectedCount: 0,
            inconclusiveCount: 0,
            totalSubmissions: 0,
            reputationScore: 0,
            lastUpdated: block.timestamp
        });

        walletToAgentId[wallet] = agentId;
    }

    /**
     * @notice Record validation feedback and update reputation
     * @param researcherAgentId Researcher's agent ID
     * @param validatorAgentId Validator's agent ID
     * @param validationId Validation ID from ValidationRegistry
     * @param feedbackType Type of feedback (CONFIRMED_* or REJECTED)
     * @return feedbackId Unique identifier for the feedback
     */
    function recordFeedback(
        uint256 researcherAgentId,
        uint256 validatorAgentId,
        bytes32 validationId,
        FeedbackType feedbackType
    ) external onlyRole(SCORER_ROLE) returns (bytes32 feedbackId) {
        if (researcherAgentId == 0) {
            revert InvalidAgentId();
        }

        ReputationRecord storage rep = reputations[researcherAgentId];

        if (rep.lastUpdated == 0) {
            revert AgentNotRegistered(researcherAgentId);
        }

        _feedbackCounter++;
        feedbackId = keccak256(abi.encodePacked(
            researcherAgentId,
            validatorAgentId,
            validationId,
            block.timestamp,
            _feedbackCounter
        ));

        FeedbackRecord memory feedback = FeedbackRecord({
            feedbackId: feedbackId,
            researcherAgentId: researcherAgentId,
            validatorAgentId: validatorAgentId,
            validationId: validationId,
            feedbackType: feedbackType,
            timestamp: block.timestamp
        });

        feedbackRecords[feedbackId] = feedback;
        _agentFeedbacks[researcherAgentId].push(feedbackId);
        allFeedbackIds.push(feedbackId);

        rep.totalSubmissions++;

        if (feedbackType == FeedbackType.REJECTED) {
            rep.rejectedCount++;
        } else {
            rep.confirmedCount++;
        }

        rep.reputationScore = _calculateScore(rep.confirmedCount, rep.totalSubmissions);
        rep.lastUpdated = block.timestamp;

        emit FeedbackRecorded(
            feedbackId,
            researcherAgentId,
            validatorAgentId,
            validationId,
            feedbackType,
            block.timestamp
        );

        emit ReputationUpdated(
            researcherAgentId,
            rep.wallet,
            rep.confirmedCount,
            rep.rejectedCount,
            rep.reputationScore,
            block.timestamp
        );

        return feedbackId;
    }

    /**
     * @notice Calculate reputation score
     * @param confirmed Number of confirmed findings
     * @param total Total submissions
     * @return uint256 Score from 0-100
     */
    function _calculateScore(uint256 confirmed, uint256 total) internal pure returns (uint256) {
        if (total == 0) return 0;
        return (confirmed * 100) / total;
    }

    /**
     * @notice Get reputation for an agent
     * @param agentId Agent identifier
     * @return ReputationRecord
     */
    function getReputation(uint256 agentId) external view returns (ReputationRecord memory) {
        ReputationRecord memory rep = reputations[agentId];

        if (rep.lastUpdated == 0) {
            revert AgentNotRegistered(agentId);
        }

        return rep;
    }

    /**
     * @notice Get reputation by wallet address
     * @param wallet Wallet address
     * @return ReputationRecord
     */
    function getReputationByWallet(address wallet) external view returns (ReputationRecord memory) {
        uint256 agentId = walletToAgentId[wallet];

        if (agentId == 0) {
            revert AgentNotRegistered(0);
        }

        return reputations[agentId];
    }

    /**
     * @notice Get reputation score only
     * @param agentId Agent identifier
     * @return uint256 Score from 0-100
     */
    function getScore(uint256 agentId) external view returns (uint256) {
        return reputations[agentId].reputationScore;
    }

    /**
     * @notice Get all feedback for an agent
     * @param agentId Agent identifier
     * @return FeedbackRecord[] Array of feedback records
     */
    function getAgentFeedbacks(uint256 agentId) external view returns (FeedbackRecord[] memory) {
        bytes32[] memory feedbackIds = _agentFeedbacks[agentId];
        FeedbackRecord[] memory results = new FeedbackRecord[](feedbackIds.length);

        for (uint256 i = 0; i < feedbackIds.length; i++) {
            results[i] = feedbackRecords[feedbackIds[i]];
        }

        return results;
    }

    /**
     * @notice Get total feedback count
     * @return uint256 Total feedbacks recorded
     */
    function getTotalFeedbackCount() external view returns (uint256) {
        return allFeedbackIds.length;
    }

    /**
     * @notice Check if agent has minimum reputation score
     * @param agentId Agent identifier
     * @param minScore Minimum required score
     * @return bool True if score >= minScore
     */
    function meetsMinimumScore(uint256 agentId, uint256 minScore) external view returns (bool) {
        return reputations[agentId].reputationScore >= minScore;
    }

    /**
     * @notice Add scorer role
     * @param scorer Address to grant role
     */
    function addScorer(address scorer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(SCORER_ROLE, scorer);
    }

    /**
     * @notice Remove scorer role
     * @param scorer Address to revoke role
     */
    function removeScorer(address scorer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(SCORER_ROLE, scorer);
    }
}
