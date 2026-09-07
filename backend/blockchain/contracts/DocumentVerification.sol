// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DocumentVerification {
    enum AuditStatus { REGISTERED, VERIFIED, REVOKED }

    struct Record {
        string documentHash;
        uint256 timestamp;
        address owner;
        AuditStatus status;
        bool exists;
    }

    mapping(string => Record) private records;

    event DocumentRegistered(
        string indexed documentId,
        string documentHash,
        address indexed owner,
        uint256 timestamp
    );
    event DocumentStatusChanged(string indexed documentId, AuditStatus status);

    function storeDocument(string calldata documentId, string calldata documentHash) external {
        records[documentId] = Record(
            documentHash,
            block.timestamp,
            msg.sender,
            AuditStatus.REGISTERED,
            true
        );
        emit DocumentRegistered(documentId, documentHash, msg.sender, block.timestamp);
    }

    function verifyDocument(string calldata documentId, string calldata documentHash) external returns (bool) {
        Record storage record = records[documentId];
        bool matches = record.exists && keccak256(bytes(record.documentHash)) == keccak256(bytes(documentHash));
        if (matches) {
            record.status = AuditStatus.VERIFIED;
            emit DocumentStatusChanged(documentId, AuditStatus.VERIFIED);
        }
        return matches;
    }

    function revokeDocument(string calldata documentId) external {
        require(records[documentId].owner == msg.sender, "Only owner can revoke");
        records[documentId].status = AuditStatus.REVOKED;
        emit DocumentStatusChanged(documentId, AuditStatus.REVOKED);
    }

    function getDocument(string calldata documentId)
        external
        view
        returns (string memory, uint256, address)
    {
        Record memory record = records[documentId];
        return (record.documentHash, record.timestamp, record.owner);
    }

    function getDocumentStatus(string calldata documentId)
        external
        view
        returns (string memory, uint256, address, AuditStatus, bool)
    {
        Record memory record = records[documentId];
        return (record.documentHash, record.timestamp, record.owner, record.status, record.exists);
    }
}