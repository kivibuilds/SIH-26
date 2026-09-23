from PIL import Image, ImageDraw, ImageFilter

from app.services import stamp_analysis
from app.services.screening_service import _generate_screening_result


def _document(size=(1000, 700), stamps=1, rotate=0):
    image = Image.new("RGB", size, "white")
    draw = ImageDraw.Draw(image)
    for index in range(stamps):
        left = 120 + index * 360
        top = 180 + (index % 2) * 80
        right = left + 230
        bottom = top + 130
        draw.ellipse((left, top, right, bottom), outline=(25, 70, 180), width=9)
        draw.arc((left + 20, top + 15, right - 20, bottom - 15), 20, 300, fill=(25, 70, 180), width=6)
        draw.text((left + 45, top + 52), "ENTRY", fill=(25, 70, 180))
    if rotate:
        image = image.rotate(rotate, expand=True, resample=Image.Resampling.BICUBIC)
    return image


def test_passport_image_detects_colored_stamp(tmp_path):
    path = tmp_path / "passport.png"
    _document().save(path)

    result = stamp_analysis.analyze_stamp_regions(path, "PASSPORT")

    assert result["status"] == "STAMP_DETECTED"
    assert result["stamp_regions"]
    assert set(result["stamp_regions"][0]["bounding_box"]) == {"x", "y", "width", "height"}
    assert 0 < result["stamp_regions"][0]["detection_confidence"] <= 1


def test_visa_image_detects_stamp(tmp_path):
    path = tmp_path / "visa.jpg"
    _document().save(path, quality=85)

    result = stamp_analysis.analyze_stamp_regions(path, "VISA")

    assert result["stamp_regions"]
    assert result["image_quality"]["format"] == "JPEG"


def test_no_visible_stamp_is_not_detected(tmp_path):
    path = tmp_path / "blank.png"
    Image.new("RGB", (1000, 700), "white").save(path)

    result = stamp_analysis.analyze_stamp_regions(path, "PASSPORT")

    assert result["status"] == "NO_STAMP_DETECTED"
    assert result["stamp_regions"] == []


def test_blurry_low_resolution_stamp_reports_quality_limit(tmp_path):
    path = tmp_path / "blurry.png"
    _document((240, 160)).filter(ImageFilter.GaussianBlur(4)).save(path)

    result = stamp_analysis.analyze_stamp_regions(path, "PASSPORT")

    assert result["image_quality"]["quality_status"] == "LOW"
    assert result["status"] == "NO_STAMP_DETECTED"


def test_weak_stamp_candidate_is_uncertain():
    candidate = {"aspect_ratio": 2.0, "fill_ratio": 0.08, "colored_fraction": 0.05}
    quality = {"quality_status": "ADEQUATE"}

    assert stamp_analysis._stamp_gate(candidate, quality) == "UNCERTAIN"


def test_rotated_document_still_finds_region(tmp_path):
    path = tmp_path / "rotated.png"
    _document(rotate=12).save(path)

    result = stamp_analysis.analyze_stamp_regions(path, "PASSPORT")

    assert result["stamp_regions"]


def test_multiple_stamp_like_regions_are_returned(tmp_path):
    path = tmp_path / "multiple.png"
    _document(stamps=2).save(path)

    result = stamp_analysis.analyze_stamp_regions(path, "VISA")

    assert len(result["stamp_regions"]) >= 2


def test_signature_like_line_is_not_reported_as_stamp(tmp_path):
    path = tmp_path / "signature.png"
    image = Image.new("RGB", (1000, 700), "white")
    draw = ImageDraw.Draw(image)
    draw.line((120, 350, 860, 370), fill=(20, 20, 20), width=8)
    image.save(path)

    result = stamp_analysis.analyze_stamp_regions(path, "PASSPORT")

    assert result["stamp_regions"] == []
    assert result["status"] == "NO_STAMP_DETECTED"


def test_plain_printed_text_is_not_reported_as_stamp(tmp_path):
    path = tmp_path / "printed-text.png"
    image = Image.new("RGB", (1000, 700), "white")
    ImageDraw.Draw(image).text((100, 300), "PASSPORT HOLDER NAME", fill=(20, 20, 20))
    image.save(path)

    result = stamp_analysis.analyze_stamp_regions(path, "PASSPORT")

    assert result["stamp_regions"] == []
    assert result["status"] == "NO_STAMP_DETECTED"


def test_plain_visa_page_is_not_reported_as_stamp(tmp_path):
    path = tmp_path / "plain-visa.png"
    image = Image.new("RGB", (1000, 700), "white")
    ImageDraw.Draw(image).text((100, 300), "VISA HOLDER NAME", fill=(20, 20, 20))
    image.save(path)

    result = stamp_analysis.analyze_stamp_regions(path, "VISA")

    assert result["status"] == "NO_STAMP_DETECTED"
    assert result["stamp_regions"] == []


def test_missing_metadata_is_a_limitation_not_a_forgery_signal(tmp_path):
    path = tmp_path / "no-exif.png"
    _document().save(path)

    result = stamp_analysis.analyze_stamp_regions(path, "PASSPORT")

    assert any("Missing EXIF" in item for item in result["limitations"])
    assert not any("EXIF" in item and "suspicious" in item.lower() for item in result["indicators"])


def test_invalid_image_is_handled(tmp_path):
    path = tmp_path / "invalid.png"
    path.write_bytes(b"not an image")

    result = stamp_analysis.analyze_stamp_regions(path, "PASSPORT")

    assert result["status"] == "INSUFFICIENT_EVIDENCE"
    assert result["stamp_regions"] == []


def test_unreadable_stamp_text_is_explicit(tmp_path, monkeypatch):
    path = tmp_path / "unreadable.png"
    _document().save(path)

    def fail_ocr(*args, **kwargs):
        raise RuntimeError("Tesseract unavailable in test")

    monkeypatch.setattr("app.services.ocr_service._ocr_to_text", fail_ocr)
    result = stamp_analysis.analyze_stamp_regions(path, "PASSPORT")

    assert result["stamp_regions"]
    assert result["ocr_findings"][0]["status"] == "UNAVAILABLE"
    assert result["ocr_findings"][0]["text"] == ""


def test_passport_pipeline_includes_stamp_analysis(tmp_path, monkeypatch):
    path = tmp_path / "passport.png"
    _document().save(path)

    monkeypatch.setattr("app.services.passport_parser.parse_passport", lambda _: {"document_type": "PASSPORT"})
    monkeypatch.setattr("app.services.document_validator.validate_document", lambda _: {"status": "VALID", "checks": {}})
    monkeypatch.setattr("app.services.ocr_service.calculate_ocr_metrics", lambda _: {"confidence": 90})
    monkeypatch.setattr("app.services.tampering_service.analyze_tampering", lambda _: {"tampering_analysis": {"detected": False, "confidence": 0, "indicators": []}})

    result = _generate_screening_result(str(path), "PASSPORT")

    assert result["stamp_analysis"]["stamp_regions"]
    assert "stamp_analysis" in result


def test_visa_pipeline_includes_stamp_analysis(tmp_path, monkeypatch):
    path = tmp_path / "visa.png"
    _document().save(path)

    monkeypatch.setattr("app.services.visa_parser.parse_visa", lambda _: {"document_type": "VISA"})
    monkeypatch.setattr("app.services.document_validator.validate_document", lambda _: {"status": "VALID", "checks": {}})
    monkeypatch.setattr("app.services.ocr_service.calculate_ocr_metrics", lambda _: {"confidence": 90})
    monkeypatch.setattr("app.services.tampering_service.analyze_tampering", lambda _: {"tampering_analysis": {"detected": False, "confidence": 0, "indicators": []}})

    result = _generate_screening_result(str(path), "VISA")

    assert result["stamp_analysis"]["status"] == "STAMP_DETECTED"
    assert result["stamp_analysis"]["indicators"] == []
