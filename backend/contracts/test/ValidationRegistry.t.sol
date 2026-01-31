// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ValidationRegistry.sol";

contract ValidationRegistryTest is Test {
    ValidationRegistry public registry;

    address public owner;
    address public validator1;
    address public validator2;
    address public user;

    // Test data
    bytes32 constant PROTOCOL_ID = keccak256("protocol1");
    bytes32 constant FINDING_ID = keccak256("finding1");
    string constant VULNERABILITY_TYPE = "Reentrancy";
    string constant EXECUTION_LOG = "Exploit executed successfully";
    bytes32 constant PROOF_HASH = keccak256("proof-data");

    event ValidationRecorded(
        bytes32 indexed validationId,
        bytes32 indexed protocolId,
        bytes32 indexed findingId,
        address validatorAgent,
        ValidationRegistry.ValidationOutcome outcome,
        ValidationRegistry.Severity severity,
        uint256 timestamp
    );

    function setUp() public {
        owner = address(this);
        validator1 = makeAddr("validator1");
        validator2 = makeAddr("validator2");
        user = makeAddr("user");

        registry = new ValidationRegistry();

        // Grant VALIDATOR_ROLE to validator addresses
        registry.grantValidatorRole(validator1);
        registry.grantValidatorRole(validator2);
    }

    // =================
    // Role Management Tests
    // =================

    function test_GrantValidatorRole_Success() public {
        address newValidator = makeAddr("newValidator");

        assertFalse(registry.isValidator(newValidator), "Should not be validator initially");

        registry.grantValidatorRole(newValidator);

        assertTrue(registry.isValidator(newValidator), "Should be validator after grant");
    }

    function test_RevokeValidatorRole_Success() public {
        assertTrue(registry.isValidator(validator1), "Should be validator initially");

        registry.revokeValidatorRole(validator1);

        assertFalse(registry.isValidator(validator1), "Should not be validator after revoke");
    }

    function test_GrantValidatorRole_OnlyAdminCanGrant() public {
        address newValidator = makeAddr("newValidator");

        vm.prank(user);
        vm.expectRevert();
        registry.grantValidatorRole(newValidator);
    }

    function test_RevokeValidatorRole_OnlyAdminCanRevoke() public {
        vm.prank(user);
        vm.expectRevert();
        registry.revokeValidatorRole(validator1);
    }

    // =================
    // Validation Recording Tests
    // =================

    function test_RecordValidation_Success() public {
        vm.prank(validator1);

        vm.expectEmit(false, true, true, false);
        emit ValidationRecorded(
            bytes32(0), // We don't know the exact ID
            PROTOCOL_ID,
            FINDING_ID,
            validator1,
            ValidationRegistry.ValidationOutcome.CONFIRMED,
            ValidationRegistry.Severity.CRITICAL,
            block.timestamp
        );

        bytes32 validationId = registry.recordValidation(
            PROTOCOL_ID,
            FINDING_ID,
            VULNERABILITY_TYPE,
            ValidationRegistry.Severity.CRITICAL,
            ValidationRegistry.ValidationOutcome.CONFIRMED,
            EXECUTION_LOG,
            PROOF_HASH
        );

        assertNotEq(validationId, bytes32(0), "Validation ID should not be zero");

        // Verify validation was recorded
        ValidationRegistry.ValidationResult memory result = registry.getValidation(validationId);
        assertEq(result.validationId, validationId);
        assertEq(result.protocolId, PROTOCOL_ID);
        assertEq(result.findingId, FINDING_ID);
        assertEq(result.validatorAgent, validator1);
        assertEq(result.vulnerabilityType, VULNERABILITY_TYPE);
        assertEq(uint256(result.severity), uint256(ValidationRegistry.Severity.CRITICAL));
        assertEq(uint256(result.outcome), uint256(ValidationRegistry.ValidationOutcome.CONFIRMED));
        assertEq(result.executionLog, EXECUTION_LOG);
        assertEq(result.proofHash, PROOF_HASH);
        assertEq(result.timestamp, block.timestamp);
    }

    function test_RecordValidation_OnlyValidatorCanRecord() public {
        vm.prank(user);
        vm.expectRevert();
        registry.recordValidation(
            PROTOCOL_ID,
            FINDING_ID,
            VULNERABILITY_TYPE,
            ValidationRegistry.Severity.CRITICAL,
            ValidationRegistry.ValidationOutcome.CONFIRMED,
            EXECUTION_LOG,
            PROOF_HASH
        );
    }

    function test_RecordValidation_RevertsOnEmptyProtocolId() public {
        vm.prank(validator1);
        vm.expectRevert(ValidationRegistry.InvalidProtocolId.selector);
        registry.recordValidation(
            bytes32(0),
            FINDING_ID,
            VULNERABILITY_TYPE,
            ValidationRegistry.Severity.CRITICAL,
            ValidationRegistry.ValidationOutcome.CONFIRMED,
            EXECUTION_LOG,
            PROOF_HASH
        );
    }

    function test_RecordValidation_RevertsOnEmptyFindingId() public {
        vm.prank(validator1);
        vm.expectRevert(ValidationRegistry.InvalidFindingId.selector);
        registry.recordValidation(
            PROTOCOL_ID,
            bytes32(0),
            VULNERABILITY_TYPE,
            ValidationRegistry.Severity.CRITICAL,
            ValidationRegistry.ValidationOutcome.CONFIRMED,
            EXECUTION_LOG,
            PROOF_HASH
        );
    }

    function test_RecordValidation_RevertsOnEmptyVulnerabilityType() public {
        vm.prank(validator1);
        vm.expectRevert(ValidationRegistry.InvalidVulnerabilityType.selector);
        registry.recordValidation(
            PROTOCOL_ID,
            FINDING_ID,
            "",
            ValidationRegistry.Severity.CRITICAL,
            ValidationRegistry.ValidationOutcome.CONFIRMED,
            EXECUTION_LOG,
            PROOF_HASH
        );
    }

    function test_RecordValidation_RevertsOnDuplicateFinding() public {
        // First validation
        vm.prank(validator1);
        registry.recordValidation(
            PROTOCOL_ID,
            FINDING_ID,
            VULNERABILITY_TYPE,
            ValidationRegistry.Severity.CRITICAL,
            ValidationRegistry.ValidationOutcome.CONFIRMED,
            EXECUTION_LOG,
            PROOF_HASH
        );

        // Second validation with same finding ID should fail
        vm.prank(validator2);
        vm.expectRevert(
            abi.encodeWithSelector(ValidationRegistry.ValidationAlreadyExists.selector, FINDING_ID)
        );
        registry.recordValidation(
            PROTOCOL_ID,
            FINDING_ID,
            "Other Type",
            ValidationRegistry.Severity.HIGH,
            ValidationRegistry.ValidationOutcome.REJECTED,
            "Other log",
            keccak256("other-proof")
        );
    }

    function test_RecordValidation_DifferentSeverityLevels() public {
        ValidationRegistry.Severity[5] memory severities = [
            ValidationRegistry.Severity.CRITICAL,
            ValidationRegistry.Severity.HIGH,
            ValidationRegistry.Severity.MEDIUM,
            ValidationRegistry.Severity.LOW,
            ValidationRegistry.Severity.INFORMATIONAL
        ];

        for (uint256 i = 0; i < severities.length; i++) {
            bytes32 findingId = keccak256(abi.encodePacked("finding", i));

            vm.prank(validator1);
            bytes32 validationId = registry.recordValidation(
                PROTOCOL_ID,
                findingId,
                VULNERABILITY_TYPE,
                severities[i],
                ValidationRegistry.ValidationOutcome.CONFIRMED,
                EXECUTION_LOG,
                PROOF_HASH
            );

            ValidationRegistry.ValidationResult memory result = registry.getValidation(validationId);
            assertEq(uint256(result.severity), uint256(severities[i]));
        }
    }

    function test_RecordValidation_DifferentOutcomes() public {
        ValidationRegistry.ValidationOutcome[3] memory outcomes = [
            ValidationRegistry.ValidationOutcome.CONFIRMED,
            ValidationRegistry.ValidationOutcome.REJECTED,
            ValidationRegistry.ValidationOutcome.INCONCLUSIVE
        ];

        for (uint256 i = 0; i < outcomes.length; i++) {
            bytes32 findingId = keccak256(abi.encodePacked("finding", i));

            vm.prank(validator1);
            bytes32 validationId = registry.recordValidation(
                PROTOCOL_ID,
                findingId,
                VULNERABILITY_TYPE,
                ValidationRegistry.Severity.CRITICAL,
                outcomes[i],
                EXECUTION_LOG,
                PROOF_HASH
            );

            ValidationRegistry.ValidationResult memory result = registry.getValidation(validationId);
            assertEq(uint256(result.outcome), uint256(outcomes[i]));
        }
    }

    // =================
    // Query Function Tests
    // =================

    function test_GetValidation_RevertsOnNonexistentValidation() public {
        bytes32 fakeId = keccak256("fake");

        vm.expectRevert(
            abi.encodeWithSelector(ValidationRegistry.ValidationNotFound.selector, fakeId)
        );
        registry.getValidation(fakeId);
    }

    function test_GetProtocolValidations() public {
        bytes32 protocolId1 = keccak256("protocol1");
        bytes32 protocolId2 = keccak256("protocol2");

        // Record 3 validations for protocol1
        vm.startPrank(validator1);
        bytes32 id1 = registry.recordValidation(
            protocolId1,
            keccak256("finding1"),
            VULNERABILITY_TYPE,
            ValidationRegistry.Severity.CRITICAL,
            ValidationRegistry.ValidationOutcome.CONFIRMED,
            EXECUTION_LOG,
            PROOF_HASH
        );
        bytes32 id2 = registry.recordValidation(
            protocolId1,
            keccak256("finding2"),
            VULNERABILITY_TYPE,
            ValidationRegistry.Severity.HIGH,
            ValidationRegistry.ValidationOutcome.CONFIRMED,
            EXECUTION_LOG,
            PROOF_HASH
        );
        bytes32 id3 = registry.recordValidation(
            protocolId1,
            keccak256("finding3"),
            VULNERABILITY_TYPE,
            ValidationRegistry.Severity.MEDIUM,
            ValidationRegistry.ValidationOutcome.REJECTED,
            EXECUTION_LOG,
            PROOF_HASH
        );

        // Record 1 validation for protocol2
        registry.recordValidation(
            protocolId2,
            keccak256("finding4"),
            VULNERABILITY_TYPE,
            ValidationRegistry.Severity.LOW,
            ValidationRegistry.ValidationOutcome.CONFIRMED,
            EXECUTION_LOG,
            PROOF_HASH
        );
        vm.stopPrank();

        // Check protocol1 validations
        ValidationRegistry.ValidationResult[] memory protocol1Validations =
            registry.getProtocolValidations(protocolId1);
        assertEq(protocol1Validations.length, 3, "Protocol1 should have 3 validations");
        assertEq(protocol1Validations[0].validationId, id1);
        assertEq(protocol1Validations[1].validationId, id2);
        assertEq(protocol1Validations[2].validationId, id3);

        // Check protocol2 validations
        ValidationRegistry.ValidationResult[] memory protocol2Validations =
            registry.getProtocolValidations(protocolId2);
        assertEq(protocol2Validations.length, 1, "Protocol2 should have 1 validation");

        // Check protocol with no validations
        ValidationRegistry.ValidationResult[] memory noValidations =
            registry.getProtocolValidations(keccak256("nonexistent"));
        assertEq(noValidations.length, 0, "Should have no validations");
    }

    function test_GetConfirmedValidations() public {
        bytes32 protocolId = keccak256("protocol1");

        vm.startPrank(validator1);

        // Record 2 confirmed validations
        bytes32 id1 = registry.recordValidation(
            protocolId,
            keccak256("finding1"),
            VULNERABILITY_TYPE,
            ValidationRegistry.Severity.CRITICAL,
            ValidationRegistry.ValidationOutcome.CONFIRMED,
            EXECUTION_LOG,
            PROOF_HASH
        );
        bytes32 id2 = registry.recordValidation(
            protocolId,
            keccak256("finding2"),
            VULNERABILITY_TYPE,
            ValidationRegistry.Severity.HIGH,
            ValidationRegistry.ValidationOutcome.CONFIRMED,
            EXECUTION_LOG,
            PROOF_HASH
        );

        // Record 1 rejected validation
        registry.recordValidation(
            protocolId,
            keccak256("finding3"),
            VULNERABILITY_TYPE,
            ValidationRegistry.Severity.MEDIUM,
            ValidationRegistry.ValidationOutcome.REJECTED,
            EXECUTION_LOG,
            PROOF_HASH
        );

        // Record 1 inconclusive validation
        registry.recordValidation(
            protocolId,
            keccak256("finding4"),
            VULNERABILITY_TYPE,
            ValidationRegistry.Severity.LOW,
            ValidationRegistry.ValidationOutcome.INCONCLUSIVE,
            EXECUTION_LOG,
            PROOF_HASH
        );

        vm.stopPrank();

        // Get only confirmed validations
        ValidationRegistry.ValidationResult[] memory confirmedValidations =
            registry.getConfirmedValidations(protocolId);

        assertEq(confirmedValidations.length, 2, "Should have 2 confirmed validations");
        assertEq(confirmedValidations[0].validationId, id1);
        assertEq(confirmedValidations[1].validationId, id2);
        assertEq(
            uint256(confirmedValidations[0].outcome),
            uint256(ValidationRegistry.ValidationOutcome.CONFIRMED)
        );
        assertEq(
            uint256(confirmedValidations[1].outcome),
            uint256(ValidationRegistry.ValidationOutcome.CONFIRMED)
        );
    }

    function test_GetValidationCount() public {
        assertEq(registry.getValidationCount(), 0, "Should start with 0 validations");

        vm.startPrank(validator1);

        registry.recordValidation(
            PROTOCOL_ID,
            keccak256("finding1"),
            VULNERABILITY_TYPE,
            ValidationRegistry.Severity.CRITICAL,
            ValidationRegistry.ValidationOutcome.CONFIRMED,
            EXECUTION_LOG,
            PROOF_HASH
        );
        assertEq(registry.getValidationCount(), 1, "Should have 1 validation");

        registry.recordValidation(
            PROTOCOL_ID,
            keccak256("finding2"),
            VULNERABILITY_TYPE,
            ValidationRegistry.Severity.HIGH,
            ValidationRegistry.ValidationOutcome.CONFIRMED,
            EXECUTION_LOG,
            PROOF_HASH
        );
        assertEq(registry.getValidationCount(), 2, "Should have 2 validations");

        vm.stopPrank();
    }

    // =================
    // Immutability Tests
    // =================

    function test_ValidationRecordsAreImmutable() public {
        vm.prank(validator1);
        bytes32 validationId = registry.recordValidation(
            PROTOCOL_ID,
            FINDING_ID,
            VULNERABILITY_TYPE,
            ValidationRegistry.Severity.CRITICAL,
            ValidationRegistry.ValidationOutcome.CONFIRMED,
            EXECUTION_LOG,
            PROOF_HASH
        );

        // Get initial state
        ValidationRegistry.ValidationResult memory initialResult = registry.getValidation(validationId);

        // Advance time
        vm.warp(block.timestamp + 1 days);

        // Get state again
        ValidationRegistry.ValidationResult memory laterResult = registry.getValidation(validationId);

        // Verify all fields remain unchanged
        assertEq(laterResult.validationId, initialResult.validationId);
        assertEq(laterResult.protocolId, initialResult.protocolId);
        assertEq(laterResult.findingId, initialResult.findingId);
        assertEq(laterResult.validatorAgent, initialResult.validatorAgent);
        assertEq(laterResult.vulnerabilityType, initialResult.vulnerabilityType);
        assertEq(uint256(laterResult.severity), uint256(initialResult.severity));
        assertEq(uint256(laterResult.outcome), uint256(initialResult.outcome));
        assertEq(laterResult.executionLog, initialResult.executionLog);
        assertEq(laterResult.proofHash, initialResult.proofHash);
        assertEq(laterResult.timestamp, initialResult.timestamp);
    }
}
