import hashlib

from app.api.screening import _apply_blockchain_result, _file_hash, _record_hash
from app.api.audit import _integrity_result
from app.database.models import VerificationRecord


def test_document_hash_is_sha256(tmp_path):
    document = tmp_path / "sample.png"
    document.write_bytes(b"verifyx-test-document")

    assert _file_hash(document) == hashlib.sha256(b"verifyx-test-document").hexdigest()


def test_record_hash_is_canonical_and_stable():
    first = _record_hash({"b": 2, "a": 1})
    second = _record_hash({"a": 1, "b": 2})

    assert first == second
    assert len(first) == 64


def test_verification_record_has_canonical_audit_fields():
    fields = VerificationRecord.__table__.c.keys()

    assert {
        "screening_id",
        "document_type",
        "document_hash",
        "result_payload",
        "record_hash",
        "risk_score",
        "risk_level",
        "mrz_status",
        "tampering_detected",
        "tampering_confidence",
        "blockchain_status",
        "blockchain_error",
        "blockchain_tx",
        "block_number",
        "created_at",
        "updated_at",
    }.issubset(fields)


def test_successful_registration_persists_transaction_and_block():
    record = VerificationRecord(
        screening_id="SCR-TEST",
        result_payload="{}",
        document_hash="a" * 64,
        record_hash="b" * 64,
        blockchain_status="PENDING",
    )

    _apply_blockchain_result(record, {
        "status": 1,
        "transaction_hash": "0xtransaction",
        "block_number": 12,
    })

    assert record.blockchain_status == "CONFIRMED"
    assert record.blockchain_tx == "0xtransaction"
    assert record.block_number == 12
    assert record.blockchain_error is None


def test_failed_registration_does_not_claim_confirmation():
    record = VerificationRecord(
        screening_id="SCR-TEST",
        result_payload="{}",
        document_hash="a" * 64,
        record_hash="b" * 64,
        blockchain_status="PENDING",
    )

    _apply_blockchain_result(record, {
        "status": 0,
        "transaction_hash": "0xfailed",
        "block_number": 13,
    })

    assert record.blockchain_status == "FAILED"
    assert record.blockchain_tx is None
    assert record.block_number is None
    assert record.blockchain_error


def test_frontend_audit_contract_fields_are_available():
    response = {
        "screening_id": "SCR-TEST",
        "blockchain": {
            "status": "CONFIRMED",
            "document_hash": "a" * 64,
            "transaction_hash": "0xtransaction",
            "block_number": 12,
        },
    }

    assert response["screening_id"]
    assert response["blockchain"]["status"] == "CONFIRMED"
    assert response["blockchain"]["transaction_hash"]


def test_integrity_match_requires_stored_and_confirmed_chain_hash():
    result = _integrity_result("a" * 64, "a" * 64, "a" * 64, True)

    assert result == {
        "integrity": "VERIFIED",
        "verified": True,
        "blockchain_match": True,
        "failure_reason": None,
    }


def test_integrity_mismatch_is_failed():
    result = _integrity_result("b" * 64, "a" * 64, "a" * 64, True)

    assert result["integrity"] == "FAILED"
    assert result["verified"] is False
    assert result["failure_reason"] == "Document hash does not match the blockchain-registered hash. The uploaded file may have been modified."


def test_integrity_is_failed_when_blockchain_is_unavailable():
    result = _integrity_result("a" * 64, "a" * 64, None, False)

    assert result["integrity"] == "FAILED"
    assert result["blockchain_match"] is False
    assert result["failure_reason"] == "Blockchain record is unavailable, so the document cannot be verified against the registered hash."


def test_normal_and_dataset_style_files_use_the_same_hash_path(tmp_path):
    normal = tmp_path / "normal-upload.pdf"
    dataset = tmp_path / "SIDTD" / "forged" / "sample.png"
    dataset.parent.mkdir(parents=True)
    normal.write_bytes(b"normal")
    dataset.write_bytes(b"dataset")

    assert len(_file_hash(normal)) == 64
    assert len(_file_hash(dataset)) == 64
