from copy import deepcopy
from pathlib import Path


_SCREENING_CACHE = {}


def generate_screening_result(file_path: str, document_type: str = None) -> dict:
    """Return a cached analysis unless the uploaded file has changed."""
    path = Path(file_path)
    cache_key = (
        str(path.resolve()),
        (path.stat().st_mtime_ns, path.stat().st_size) if path.exists() else None,
        (document_type or "").upper(),
    )

    if cache_key in _SCREENING_CACHE:
        return deepcopy(_SCREENING_CACHE[cache_key])

    result = _generate_screening_result(file_path, document_type)
    _SCREENING_CACHE[cache_key] = deepcopy(result)
    return result


def _generate_screening_result(file_path: str, document_type: str = None) -> dict:
    """
    Generate a screening result for a saved document file.

    This composes the parsers, validator, and tampering analysis into a
    single structured response. The function is defensive: when OCR or
    other optional libraries are unavailable it will still return a
    coherent partial result rather than raising.
    """

    # Lazy imports to keep module import lightweight for tests
    from app.services.document_validator import validate_document
    try:
        from app.services.tampering_service import analyze_tampering
    except Exception:
        analyze_tampering = None

    parsed = None
    parse_errors = []

    doc_type = (document_type or "").upper()

    try:
        if doc_type == "PASSPORT":
            from app.services.passport_parser import parse_passport
            parsed = parse_passport(file_path)
        elif doc_type == "VISA":
            from app.services.visa_parser import parse_visa
            parsed = parse_visa(file_path)
        elif doc_type == "AADHAAR":
            from app.services.aadhaar_parser import parse_aadhaar
            parsed = parse_aadhaar(file_path)
        else:
            # Fallback: return raw OCR text
            from app.services.ocr_service import extract_text
            parsed = {"document_type": doc_type or "UNKNOWN", "raw_text": extract_text(file_path)}
    except Exception as error:
        parse_errors.append(str(error))
        parsed = {"document_type": doc_type or "UNKNOWN", "raw_text": None}

    # MRZ verification
    mrz_verification = {"status": "NOT_PRESENT", "confidence": 0.0}
    try:
        if parsed and parsed.get("mrz"):
            from app.services.ocr_service import validate_mrz_line2, validate_mrv_line2
            mrz = parsed.get("mrz")
            line2 = mrz.get("line2") if isinstance(mrz, dict) else (mrz[1] if isinstance(mrz, list) and len(mrz) > 1 else None)
            if line2:
                if doc_type == "VISA":
                    ok = validate_mrv_line2(line2)
                else:
                    ok = validate_mrz_line2(line2)
                mrz_verification = {"status": "MATCH" if ok else "MISMATCH", "confidence": 1.0 if ok else 0.0}
    except Exception:
        pass

    try:
        from app.services.ocr_service import calculate_ocr_metrics
        ocr_analysis = calculate_ocr_metrics(file_path)
    except Exception as error:
        ocr_analysis = {
            "confidence": None,
            "fields_detected": 0,
            "fields_requiring_review": 0,
            "review_threshold": 70.0,
            "error": str(error),
        }

    # Document validation
    try:
        document_validation = validate_document(parsed or {})
    except Exception as error:
        document_validation = {"status": "UNKNOWN", "validation_score": 0, "errors": [str(error)], "warnings": [], "checks": {}}

    # Tampering analysis (best-effort)
    if analyze_tampering is not None:
        try:
            tampering = analyze_tampering(file_path)
            tampering_result = tampering.get("tampering_analysis", tampering)
        except Exception as error:
            tampering_result = {"detected": False, "confidence": 0.0, "indicators": [f"Tampering analysis failed: {error}"]}
    else:
        tampering_result = {"detected": False, "confidence": 0.0, "indicators": ["Tampering analysis unavailable (missing dependencies)"]}

    try:
        from app.services.stamp_analysis import analyze_stamp_regions
        stamp_analysis = analyze_stamp_regions(file_path, doc_type)
    except Exception as error:
        stamp_analysis = {
            "status": "UNAVAILABLE",
            "stamp_regions": [],
            "limitations": [f"Stamp analysis failed: {error}"],
        }

    # Face verification requires a separate live/selfie image and a biometric
    # comparison service; document-only screening cannot perform this check.
    face_verification = {
        "status": "NOT_PERFORMED",
        "match": None,
        "confidence": None,
        "reason": "A live face image was not provided.",
    }
    watchlist = {"match": False}

    # Simple risk scoring rules (prototype): start low, increase for failures
    risk_score = 10
    reasons = []

    if document_validation.get("status") == "INVALID":
        risk_score = 90
        reasons.append("Document validation failed")
    elif tampering_result.get("detected"):
        risk_score = max(risk_score, 75)
        reasons.append("Tampering indicators present")
    else:
        # Slightly increase risk for parse errors
        if parse_errors:
            risk_score = 25
            reasons.extend(parse_errors)

    risk_level = "HIGH" if risk_score >= 75 else "MEDIUM" if risk_score >= 25 else "LOW"

    return {
        "extracted_data": parsed,
        "ocr_analysis": ocr_analysis,
        "mrz_verification": mrz_verification,
        "document_validation": document_validation,
        "tampering_analysis": tampering_result,
        "stamp_analysis": stamp_analysis,
        "face_verification": face_verification,
        "watchlist": watchlist,
        "risk": {"score": risk_score, "level": risk_level, "reasons": reasons},
    }