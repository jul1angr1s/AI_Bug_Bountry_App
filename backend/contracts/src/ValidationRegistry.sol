// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ValidationRegistry
 * @notice ERC-8004 compliant validation registry for vulnerability attestations
 * @dev Manages immutable validation records with validator role-based access control
 */
contract ValidationRegistry is AccessControl {

    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");

    enum ValidationOutcome {
        CONFIRMED,      // Vulnerability confirmed by validator
        REJECTED,       // Proof rejected as invalid
        INCONCLUSIVE    // Unable to validate
    }

    enum Severity {
        CRITICAL,
        HIGH,
        MEDIUM,
        LOW,
        INFORMATIONAL
    }

    struct ValidationResult {
        bytes32 validationId;
        bytes32 protocolId;
        bytes32 findingId;
        address validatorAgent;
        ValidationOutcome outcome;
        Severity severity;
        string vulnerabilityType;
        string executionLog;
        bytes32 proofHash;
        uint256 timestamp;
        bool exists;
    }

    // Validation ID counter
    uint256 private _validationCounter;

    // Mapping from validation ID to ValidationResult
    mapping(bytes32 => ValidationResult) public validations;

    // Mapping from protocol ID to array of validation IDs
    mapping(bytes32 => bytes32[]) private _protocolValidations;

    // Mapping from finding ID to validation ID
    mapping(bytes32 => bytes32) private _findingToValidation;

    // Array of all validation IDs
    bytes32[] public allValidationIds;

    // Events
    event ValidationRecorded(
        bytes32 indexed validationId,
        bytes32 indexed protocolId,
        bytes32 indexed findingId,
        address validatorAgent,
        ValidationOutcome outcome,
        Severity severity,
        uint256 timestamp
    );

    event ValidationQueried(
        bytes32 indexed validationId,
        address indexed querier
    );

    // Errors
    error ValidationNotFound(bytes32 validationId);
    error ValidationAlreadyExists(bytes32 findingId);
    error InvalidProtocolId();
    error InvalidFindingId();
    error UnauthorizedValidator();

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VALIDATOR_ROLE, msg.sender);
    }

    /**
     * @notice Record a new validation result
     * @param protocolId Protocol being validated
     * @param findingId Unique identifier for the finding
     * @param vulnerabilityType Type of vulnerability (e.g., "reentrancy", "overflow")
     * @param severity Severity level of the vulnerability
     * @param outcome Validation outcome (CONFIRMED, REJECTED, INCONCLUSIVE)
     * @param executionLog Execution log from validation
     * @param proofHash Hash of the proof data
     * @return validationId Unique identifier for the validation
     */
    function recordValidation(
        bytes32 protocolId,
        bytes32 findingId,
        string memory vulnerabilityType,
        Severity severity,
        ValidationOutcome outcome,
        string memory executionLog,
        bytes32 proofHash
    ) external onlyRole(VALIDATOR_ROLE) returns (bytes32 validationId) {
        // Validate inputs
        if (protocolId == bytes32(0)) {
            revert InvalidProtocolId();
        }

        if (findingId == bytes32(0)) {
            revert InvalidFindingId();
        }

        // Check if finding already has a validation
        if (_findingToValidation[findingId] != bytes32(0)) {
            revert ValidationAlreadyExists(findingId);
        }

        // Generate validation ID
        _validationCounter++;
        validationId = keccak256(abi.encodePacked(
            protocolId,
            findingId,
            msg.sender,
            block.timestamp,
            _validationCounter
        ));

        // Create validation result
        ValidationResult memory newValidation = ValidationResult({
            validationId: validationId,
            protocolId: protocolId,
            findingId: findingId,
            validatorAgent: msg.sender,
            outcome: outcome,
            severity: severity,
            vulnerabilityType: vulnerabilityType,
            executionLog: executionLog,
            proofHash: proofHash,
            timestamp: block.timestamp,
            exists: true
        });

        // Store validation (immutable record)
        validations[validationId] = newValidation;
        _protocolValidations[protocolId].push(validationId);
        _findingToValidation[findingId] = validationId;
        allValidationIds.push(validationId);

        emit ValidationRecorded(
            validationId,
            protocolId,
            findingId,
            msg.sender,
            outcome,
            severity,
            block.timestamp
        );

        return validationId;
    }

    /**
     * @notice Get validation details
     * @param validationId Validation identifier
     * @return ValidationResult struct with all details
     */
    function getValidation(bytes32 validationId) external returns (ValidationResult memory) {
        ValidationResult memory validation = validations[validationId];

        if (!validation.exists) {
            revert ValidationNotFound(validationId);
        }

        emit ValidationQueried(validationId, msg.sender);

        return validation;
    }

    /**
     * @notice Get all validations for a protocol
     * @param protocolId Protocol identifier
     * @return ValidationResult[] Array of validations for the protocol
     */
    function getProtocolValidations(bytes32 protocolId) external view returns (ValidationResult[] memory) {
        bytes32[] memory validationIds = _protocolValidations[protocolId];
        ValidationResult[] memory results = new ValidationResult[](validationIds.length);

        for (uint256 i = 0; i < validationIds.length; i++) {
            results[i] = validations[validationIds[i]];
        }

        return results;
    }

    /**
     * @notice Get validation by finding ID
     * @param findingId Finding identifier
     * @return ValidationResult struct
     */
    function getValidationByFinding(bytes32 findingId) external view returns (ValidationResult memory) {
        bytes32 validationId = _findingToValidation[findingId];

        if (validationId == bytes32(0)) {
            revert ValidationNotFound(validationId);
        }

        return validations[validationId];
    }

    /**
     * @notice Check if a finding has been validated
     * @param findingId Finding identifier
     * @return bool True if finding has been validated
     */
    function isFindingValidated(bytes32 findingId) external view returns (bool) {
        return _findingToValidation[findingId] != bytes32(0);
    }

    /**
     * @notice Get validation count for a protocol
     * @param protocolId Protocol identifier
     * @return uint256 Number of validations for the protocol
     */
    function getProtocolValidationCount(bytes32 protocolId) external view returns (uint256) {
        return _protocolValidations[protocolId].length;
    }

    /**
     * @notice Get total validation count
     * @return uint256 Total number of validations
     */
    function getTotalValidationCount() external view returns (uint256) {
        return allValidationIds.length;
    }

    /**
     * @notice Get all validation IDs
     * @return bytes32[] Array of all validation IDs
     */
    function getAllValidationIds() external view returns (bytes32[] memory) {
        return allValidationIds;
    }

    /**
     * @notice Get confirmed validations for a protocol
     * @param protocolId Protocol identifier
     * @return ValidationResult[] Array of confirmed validations
     */
    function getConfirmedValidations(bytes32 protocolId) external view returns (ValidationResult[] memory) {
        bytes32[] memory validationIds = _protocolValidations[protocolId];
        uint256 confirmedCount = 0;

        // First pass: count confirmed validations
        for (uint256 i = 0; i < validationIds.length; i++) {
            if (validations[validationIds[i]].outcome == ValidationOutcome.CONFIRMED) {
                confirmedCount++;
            }
        }

        // Second pass: collect confirmed validations
        ValidationResult[] memory confirmedResults = new ValidationResult[](confirmedCount);
        uint256 index = 0;

        for (uint256 i = 0; i < validationIds.length; i++) {
            if (validations[validationIds[i]].outcome == ValidationOutcome.CONFIRMED) {
                confirmedResults[index] = validations[validationIds[i]];
                index++;
            }
        }

        return confirmedResults;
    }

    /**
     * @notice Get validations by severity
     * @param protocolId Protocol identifier
     * @param severity Severity level to filter by
     * @return ValidationResult[] Array of validations matching severity
     */
    function getValidationsBySeverity(
        bytes32 protocolId,
        Severity severity
    ) external view returns (ValidationResult[] memory) {
        bytes32[] memory validationIds = _protocolValidations[protocolId];
        uint256 matchCount = 0;

        // First pass: count matching validations
        for (uint256 i = 0; i < validationIds.length; i++) {
            if (validations[validationIds[i]].severity == severity) {
                matchCount++;
            }
        }

        // Second pass: collect matching validations
        ValidationResult[] memory matchedResults = new ValidationResult[](matchCount);
        uint256 index = 0;

        for (uint256 i = 0; i < validationIds.length; i++) {
            if (validations[validationIds[i]].severity == severity) {
                matchedResults[index] = validations[validationIds[i]];
                index++;
            }
        }

        return matchedResults;
    }

    /**
     * @notice Grant validator role to an address
     * @param validator Address to grant validator role
     */
    function addValidator(address validator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(VALIDATOR_ROLE, validator);
    }

    /**
     * @notice Revoke validator role from an address
     * @param validator Address to revoke validator role from
     */
    function removeValidator(address validator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(VALIDATOR_ROLE, validator);
    }

    /**
     * @notice Check if an address has validator role
     * @param account Address to check
     * @return bool True if address has validator role
     */
    function isValidator(address account) external view returns (bool) {
        return hasRole(VALIDATOR_ROLE, account);
    }
}
