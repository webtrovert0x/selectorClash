// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SelectorClashRegistry
 * @dev On-chain registry for function selector collision checks and reports.
 *      Specifically designed for upgradeable, proxy (ERC-1967), and Diamond (ERC-2535) architectures.
 *      NOTE: All functions require gas fees only. No protocol fees or native token payments are accepted.
 */
contract SelectorClashRegistry {
    enum ArchitectureType {
        Standard,
        ERC1967Proxy,
        UUPSProxy,
        ERC2535Diamond,
        CustomDispatcher
    }

    enum CollisionCategory {
        None,
        ProxyAdminClash,
        DiamondFacetOverlap,
        IntraContractCollision,
        UpgradeShadowing
    }

    struct AuditRecord {
        address targetContract;
        address submitter;
        bytes32 abiHash;
        ArchitectureType archType;
        bool hasCollision;
        uint256 totalSelectors;
        bytes4[] collidingSelectors;
        string details; // JSON or human-readable description
        uint256 timestamp;
    }

    struct CollisionReport {
        uint256 id;
        address targetContract;
        address reporter;
        bytes4 selector;
        string signatureA;
        string signatureB;
        CollisionCategory category;
        string impactNotes;
        uint256 timestamp;
    }

    // Storage
    AuditRecord[] public allAudits;
    CollisionReport[] public allCollisionReports;

    // Mappings for quick lookup
    mapping(address => uint256[]) private _contractToAuditIds;
    mapping(bytes32 => uint256[]) private _abiHashToAuditIds;
    mapping(bytes4 => uint256[]) private _selectorToReportIds;

    // Events
    event AuditRecorded(
        uint256 indexed auditId,
        address indexed targetContract,
        address indexed submitter,
        bytes32 abiHash,
        ArchitectureType archType,
        bool hasCollision,
        uint256 totalSelectors,
        uint256 timestamp
    );

    event CollisionReported(
        uint256 reportId,
        address indexed targetContract,
        address indexed reporter,
        bytes4 indexed selector,
        string signatureA,
        string signatureB,
        CollisionCategory category,
        uint256 timestamp
    );

    /**
     * @notice Records an audit check for a contract or ABI set.
     * @dev Gas fee only.
     * @param targetContract Address of the analyzed contract (or address(0) if raw ABI).
     * @param abiHash Hash of the normalized ABI or signature list.
     * @param archType Architecture type (Standard, Proxy, Diamond, etc.).
     * @param hasCollision True if collisions were detected.
     * @param totalSelectors Total number of unique selectors inspected.
     * @param collidingSelectors List of colliding 4-byte selectors.
     * @param details Additional audit metadata, facet details, or collision details.
     * @return auditId The assigned ID of the recorded audit.
     */
    function recordAudit(
        address targetContract,
        bytes32 abiHash,
        ArchitectureType archType,
        bool hasCollision,
        uint256 totalSelectors,
        bytes4[] calldata collidingSelectors,
        string calldata details
    ) external returns (uint256 auditId) {
        auditId = allAudits.length;

        AuditRecord memory record = AuditRecord({
            targetContract: targetContract,
            submitter: msg.sender,
            abiHash: abiHash,
            archType: archType,
            hasCollision: hasCollision,
            totalSelectors: totalSelectors,
            collidingSelectors: collidingSelectors,
            details: details,
            timestamp: block.timestamp
        });

        allAudits.push(record);

        if (targetContract != address(0)) {
            _contractToAuditIds[targetContract].push(auditId);
        }
        if (abiHash != bytes32(0)) {
            _abiHashToAuditIds[abiHash].push(auditId);
        }

        emit AuditRecorded(
            auditId,
            targetContract,
            msg.sender,
            abiHash,
            archType,
            hasCollision,
            totalSelectors,
            block.timestamp
        );
    }

    /**
     * @notice Reports a known or active selector collision between two signatures.
     * @dev Gas fee only.
     * @param targetContract Target contract address experiencing or vulnerable to the collision.
     * @param selector The 4-byte colliding selector.
     * @param signatureA First canonical function signature (e.g. "burn(uint256)").
     * @param signatureB Second canonical function signature (e.g. "proxy_owner()").
     * @param category Classification of the clash.
     * @param impactNotes Description of vulnerability or operational impact.
     * @return reportId The assigned report ID.
     */
    function reportCollision(
        address targetContract,
        bytes4 selector,
        string calldata signatureA,
        string calldata signatureB,
        CollisionCategory category,
        string calldata impactNotes
    ) external returns (uint256 reportId) {
        reportId = allCollisionReports.length;

        CollisionReport memory report = CollisionReport({
            id: reportId,
            targetContract: targetContract,
            reporter: msg.sender,
            selector: selector,
            signatureA: signatureA,
            signatureB: signatureB,
            category: category,
            impactNotes: impactNotes,
            timestamp: block.timestamp
        });

        allCollisionReports.push(report);
        _selectorToReportIds[selector].push(reportId);

        emit CollisionReported(
            reportId,
            targetContract,
            msg.sender,
            selector,
            signatureA,
            signatureB,
            category,
            block.timestamp
        );
    }

    // View Functions

    function totalAudits() external view returns (uint256) {
        return allAudits.length;
    }

    function totalReports() external view returns (uint256) {
        return allCollisionReports.length;
    }

    function getAudit(uint256 auditId) external view returns (AuditRecord memory) {
        require(auditId < allAudits.length, "Invalid auditId");
        return allAudits[auditId];
    }

    function getAuditsForContract(address targetContract) external view returns (uint256[] memory) {
        return _contractToAuditIds[targetContract];
    }

    function getAuditsForAbiHash(bytes32 abiHash) external view returns (uint256[] memory) {
        return _abiHashToAuditIds[abiHash];
    }

    function getReportsForSelector(bytes4 selector) external view returns (uint256[] memory) {
        return _selectorToReportIds[selector];
    }

    function getRecentAudits(uint256 count) external view returns (AuditRecord[] memory) {
        uint256 total = allAudits.length;
        if (total == 0) return new AuditRecord[](0);

        uint256 size = count > total ? total : count;
        AuditRecord[] memory recent = new AuditRecord[](size);

        for (uint256 i = 0; i < size; i++) {
            recent[i] = allAudits[total - 1 - i];
        }
        return recent;
    }

    function getRecentReports(uint256 count) external view returns (CollisionReport[] memory) {
        uint256 total = allCollisionReports.length;
        if (total == 0) return new CollisionReport[](0);

        uint256 size = count > total ? total : count;
        CollisionReport[] memory recent = new CollisionReport[](size);

        for (uint256 i = 0; i < size; i++) {
            recent[i] = allCollisionReports[total - 1 - i];
        }
        return recent;
    }
}
