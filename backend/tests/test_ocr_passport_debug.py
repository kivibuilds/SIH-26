import pytest

from app.services import ocr_service
from app.services import passport_parser


VALID_LINE1 = "P<INDPATWARI<<DIVYA<MAHESH<<<<<<<<<<<<<<<<<<"


def _valid_line2():
    passport_number = "J0189638<"
    date_of_birth = "070803"
    expiry_date = "150314"
    optional_data = "<<<<<<<<<<<<<<"
    base = (
        passport_number
        + ocr_service.mrz_check_digit(passport_number)
        + "IND"
        + date_of_birth
        + ocr_service.mrz_check_digit(date_of_birth)
        + "M"
        + expiry_date
        + ocr_service.mrz_check_digit(expiry_date)
        + optional_data
        + ocr_service.mrz_check_digit(optional_data)
    )
    composite = base[0:10] + base[13:20] + base[21:43]
    return base + ocr_service.mrz_check_digit(composite)


def test_clear_mrz_is_structured():
    result = passport_parser.parse_passport_mrz([VALID_LINE1, _valid_line2()])

    assert result["passport_number"] == "J0189638"
    assert result["nationality"] == "IND"
    assert result["mrz"]["status"] == "VALID"


def test_incorrect_mrz_check_digit_is_rejected():
    valid_line2 = _valid_line2()
    invalid_line2 = valid_line2[:9] + ("9" if valid_line2[9] != "9" else "8") + valid_line2[10:]

    with pytest.raises(ValueError, match="check digit"):
        passport_parser.parse_passport_mrz([VALID_LINE1, invalid_line2])


def test_missing_mrz_keeps_readable_visible_fields(monkeypatch, tmp_path):
    image = tmp_path / "passport.png"
    image.write_bytes(b"placeholder")
    monkeypatch.setattr(ocr_service, "extract_mrz_from_image", lambda _: [])
    monkeypatch.setattr(ocr_service, "extract_text", lambda _: "PASSPORT NO: J0189638\nNATIONALITY: IND\nDATE OF BIRTH: 03/08/2007")

    result = passport_parser.parse_passport(str(image))

    assert result["passport_number"] == "J0189638"
    assert result["nationality"] == "IND"
    assert result["mrz"]["status"] == "NOT_FOUND"


def test_unreadable_mrz_is_explicit(monkeypatch, tmp_path):
    image = tmp_path / "passport.png"
    image.write_bytes(b"placeholder")
    monkeypatch.setattr(ocr_service, "extract_mrz_from_image", lambda _: (_ for _ in ()).throw(RuntimeError("OCR unavailable")))
    monkeypatch.setattr(ocr_service, "extract_text", lambda _: "")

    result = passport_parser.parse_passport(str(image))

    assert result["mrz"]["status"] == "UNREADABLE"
    assert result["passport_number"] is None


def test_ocr_metrics_name_tokens_separately(monkeypatch):
    monkeypatch.setattr(
        ocr_service,
        "extract_layout_data",
        lambda _: [
            {"text": "PASSPORT", "confidence": 92},
            {"text": "NO", "confidence": 51},
            {"text": "J0189638", "confidence": 88},
        ],
    )

    metrics = ocr_service.calculate_ocr_metrics("unused.png")

    assert metrics["tokens_detected"] == 3
    assert metrics["tokens_requiring_review"] == 1
    assert metrics["fields_detected"] == 3
    assert metrics["fields_requiring_review"] == 1
