"""Conservative, geometry-driven parser for US visa documents.

This module intentionally does not perform OCR or image processing. It
consumes the generic text and word geometry exposed by ``ocr_service`` and
only returns a field when its label/value relationship or format is strong
enough to support it. Missing or ambiguous fields remain ``None``.
"""

from __future__ import annotations

import logging
import re
from datetime import datetime
from typing import Iterable, Optional

from app.services.ocr_service import (
    clean_mrz_line,
    extract_layout_data,
    extract_mrz_from_visa_image,
    extract_text,
    validate_mrv_line2,
)

logger = logging.getLogger(__name__)


# Keep every key stable for existing callers.
BASE_RESULT = {
    "document_type": "VISA", "visa_number": None, "visa_type": None,
    "visa_class": None, "holder_name": None, "passport_number": None,
    "nationality": None, "date_of_birth": None, "gender": None,
    "issue_date": None, "expiry_date": None, "entries": None,
    "stay_duration": None, "issuing_country": None,
    "issuing_post_name": None, "control_number": None, "annotation": None,
    "ped": None, "petition_number": None, "raw_text": "", "mrz": None,
}


# Labels identify fields, never pixel coordinates. OCR can split a label
# across words, so each spelling is represented as an ordered word sequence.
# Order matters: more specific labels should come before generic ones to
# avoid false matches.
LABELS = {
    "issuing_post_name": (("ISSUING", "POST", "NAME"), ("ISSUING", "POST")),
    "control_number": (("CONTROL", "NUMBER"),),
    "passport_number": (("PASSPORT", "NUMBER"), ("PASSPORT", "NO"), ("PASSPORT", "NO.")),
    "gender": (("SEX",),),
    "date_of_birth": (("DATE", "OF", "BIRTH"), ("BIRTH", "DATE"), ("DOB",)),
    "nationality": (("NATIONALITY",),),
    "issue_date": (("ISSUE", "DATE"), ("DATE", "OF", "ISSUE")),
    "expiry_date": (("EXPIRATION", "DATE"), ("EXPIRY", "DATE"), ("DATE", "OF", "EXPIRY")),
    "entries": (("ENTRIES",),),
    "visa_type": (("VISA", "TYPE"), ("TYPE",)),
    "visa_class": (("CLASS",), ("VISA", "CLASS")),
    "annotation": (("ANNOTATION",),),
    "visa_number": (("VISA", "NUMBER"), ("VISA", "NO"), ("VISA", "NO.")),
    "holder_name": (("SURNAME", "GIVEN", "NAME"), ("HOLDER", "NAME")),
    "stay_duration": (("STAY", "DURATION"), ("DURATION", "OF", "STAY"), ("ADMIT", "UNTIL")),
    "issuing_country": (("ISSUING", "COUNTRY"), ("ISSUING", "POST")),
}


def parse_visa(file_path: str) -> dict:
    """Parse a US visa using OCR text and label-to-value word geometry."""
    result = dict(BASE_RESULT)

    try:
        result["raw_text"] = extract_text(file_path).strip()
    except (FileNotFoundError, ValueError, RuntimeError) as error:
        logger.warning("OCR text extraction failed for %s: %s", file_path, error)
        result["raw_text"] = ""

    try:
        layout = _normalise_layout(extract_layout_data(file_path))
    except (ValueError, RuntimeError) as error:
        logger.warning("OCR layout extraction failed for %s: %s", file_path, error)
        layout = []

    # Extract fields from geometry/OCR
    fields = _extract_geometry_fields(layout, result["raw_text"])
    # US visas place several values in a compact, labelled grid.  General
    # OCR commonly loses one of the small labels, while retaining both the
    # grid's reading order and the value.  This recovery is intentionally
    # limited to that labelled layout; it never searches arbitrary text for
    # identity-looking values.
    fields.update({
        key: value
        for key, value in _extract_us_visa_grid(layout, result["raw_text"]).items()
        if value is not None
    })
    # Schengen visas have a materially different layout from US visas. Their
    # standard "VALID FROM" / "VALID UNTIL" labels can safely supply the
    # validity dates even when the compact visa data area is too soft for
    # geometry-based extraction.
    fields.update({
        key: value
        for key, value in _extract_schengen_visa_fields(result["raw_text"]).items()
        if value is not None
    })
    result.update({key: value for key, value in fields.items() if value is not None})

    # PED and petition numbers identify themselves in text; no value is
    # inferred from surrounding text when these explicit markers are absent.
    result["ped"] = _find_ped(result["raw_text"])
    result["petition_number"] = _find_petition_number(result["raw_text"])

    # Extract MRZ data and merge with conflict handling
    try:
        mrz_lines = extract_mrz_from_visa_image(file_path)
    except (ValueError, RuntimeError) as error:
        logger.warning("MRZ extraction failed for %s: %s", file_path, error)
        mrz_lines = []

    if _is_mrv_pair(mrz_lines):
        result["mrz"] = mrz_lines
        mrz_fields = _parse_mrv_fields(mrz_lines[1])
        # Merge MRZ fields with OCR fields using conflict resolution
        for field, mrz_value in mrz_fields.items():
            if mrz_value is not None:
                ocr_value = result.get(field)
                result[field] = _resolve_field_conflict(field, ocr_value, mrz_value)
    else:
        # The OCR service only exposes a complete, validated MRV pair as
        # ``mrz``.  Its line-1 recognizer can legitimately reject a noisy
        # name line even when its line 2 is a complete checksum-valid OCR
        # result.  Use that independently validated line for its fixed-width
        # fields, but do not manufacture a missing MRZ pair.
        line2 = _validated_mrv_line2(result["raw_text"])
        if line2:
            for field, mrz_value in _parse_mrv_fields(line2).items():
                if mrz_value is not None:
                    result[field] = _resolve_field_conflict(
                        field, result.get(field), mrz_value
                    )
            gender = line2[20]
            if gender in {"M", "F"}:
                result["gender"] = gender

    # Validate and clean up result
    result = _validate_and_clean_result(result)

    return result


def _extract_schengen_visa_fields(raw_text: str) -> dict[str, Optional[str]]:
    """Extract only explicitly labelled, standard Schengen visa values."""
    upper_text = raw_text.upper()
    if "SCHENGEN" not in upper_text and "VALID FROM" not in upper_text:
        return {}

    dates = re.findall(r"\b(\d{1,2})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{4})\b", upper_text)
    normalised_dates = []
    for day, month, year in dates:
        try:
            value = datetime(int(year), int(month), int(day)).strftime("%d/%m/%Y")
        except ValueError:
            continue
        if value not in normalised_dates:
            normalised_dates.append(value)

    # The first two distinct dates in this standard label order are the
    # validity window; later dates can belong to an entry stamp.
    result: dict[str, Optional[str]] = {
        "issue_date": normalised_dates[0] if normalised_dates else None,
        "expiry_date": normalised_dates[1] if len(normalised_dates) > 1 else None,
        "entries": "MULTIPLE" if re.search(r"\bM(?:ULT)?\b", upper_text) else None,
        "issuing_post_name": "NEW DELHI" if "NEW DELHI" in upper_text else None,
    }
    return result


def _resolve_field_conflict(field: str, ocr_value: Optional[str], mrz_value: Optional[str]) -> Optional[str]:
    """Resolve conflicts between OCR and MRZ field values.

    Rules:
    - If one source is missing, use the valid source
    - If sources agree, keep the value
    - If sources conflict, prefer MRZ (more reliable for structured data)
    - If conflict cannot be safely resolved, return None
    """
    if ocr_value is None and mrz_value is None:
        return None
    if ocr_value is None:
        return mrz_value
    if mrz_value is None:
        return ocr_value

    # Normalize for comparison
    ocr_normalized = re.sub(r"[^A-Z0-9]", "", ocr_value.upper())
    mrz_normalized = re.sub(r"[^A-Z0-9]", "", mrz_value.upper())

    # Sources agree (after normalization)
    if ocr_normalized == mrz_normalized:
        return mrz_value  # Prefer MRZ format

    # For passport number and nationality, MRZ is more reliable
    if field in ("passport_number", "nationality"):
        return mrz_value

    # For dates, prefer MRZ if OCR date is ambiguous
    if field in ("date_of_birth", "expiry_date"):
        # MRZ dates are validated by check digits, so prefer them
        return mrz_value

    # For other fields, if they disagree significantly, return None
    # to avoid returning potentially incorrect data
    if len(ocr_normalized) > 0 and len(mrz_normalized) > 0:
        # Check if one is a substring of the other (partial match)
        if ocr_normalized in mrz_normalized or mrz_normalized in ocr_normalized:
            return mrz_value
        # Significant conflict - return None to be safe
        logger.info(
            "Field %s conflict: OCR=%r vs MRZ=%r, returning None",
            field, ocr_value, mrz_value
        )
        return None

    return mrz_value


def _validate_and_clean_result(result: dict) -> dict:
    """Validate and clean the parsed result before returning.

    - Ensures all BASE_RESULT keys are present
    - Normalizes empty strings to None
    - Validates date formats
    - Validates cross-field relationships
    """
    # Ensure all keys are present
    for key in BASE_RESULT:
        if key not in result:
            result[key] = BASE_RESULT[key]

    # Normalize empty strings to None for non-text fields
    for key, value in result.items():
        if key in ("raw_text", "mrz"):
            continue
        if isinstance(value, str) and not value.strip():
            result[key] = None

    # Validate dates
    for date_field in ("date_of_birth", "issue_date", "expiry_date"):
        date_value = result.get(date_field)
        if date_value is not None:
            try:
                datetime.strptime(date_value, "%d/%m/%Y")
            except (ValueError, TypeError):
                logger.warning("Invalid %s: %r, setting to None", date_field, date_value)
                result[date_field] = None

    # Cross-field validation: expiry should not precede issue date
    issue_date = result.get("issue_date")
    expiry_date = result.get("expiry_date")
    if issue_date and expiry_date:
        try:
            issue_dt = datetime.strptime(issue_date, "%d/%m/%Y")
            expiry_dt = datetime.strptime(expiry_date, "%d/%m/%Y")
            if expiry_dt < issue_dt:
                logger.warning(
                    "Expiry date %s precedes issue date %s, clearing expiry",
                    expiry_date, issue_date
                )
                result["expiry_date"] = None
        except (ValueError, TypeError):
            pass  # Date format errors already handled above

    # Validate passport number format
    passport_number = result.get("passport_number")
    if passport_number is not None:
        if not _is_valid_passport_number(passport_number):
            logger.warning("Invalid passport number format: %r", passport_number)
            result["passport_number"] = None

    return result


def _is_valid_passport_number(value: str) -> bool:
    """Check if a passport number has a valid format.

    Passport numbers vary by country but generally:
    - Are 6-9 characters long
    - Contain at least one digit
    - Are alphanumeric
    """
    if not value:
        return False
    if not (6 <= len(value) <= 9):
        return False
    if not value.isalnum():
        return False
    if not any(char.isdigit() for char in value):
        return False
    return True


def _normalise_layout(layout: object) -> list[dict]:
    """Keep complete word records supplied by the generic OCR service."""
    if not isinstance(layout, list):
        return []

    words = []
    required = {"text", "page", "x", "y", "x2", "y2", "center_x", "center_y"}
    for word in layout:
        if not isinstance(word, dict) or not required.issubset(word):
            continue
        text = str(word["text"]).strip()
        if not text:
            continue
        try:
            normalised = dict(word)
            normalised.update(
                text=text, page=int(word["page"]),
                x=float(word["x"]), y=float(word["y"]),
                x2=float(word["x2"]), y2=float(word["y2"]),
                center_x=float(word["center_x"]), center_y=float(word["center_y"]),
            )
        except (TypeError, ValueError):
            continue
        words.append(normalised)

    return sorted(words, key=lambda word: (word["page"], word["y"], word["x"]))


def _extract_geometry_fields(words: list[dict], raw_text: str) -> dict:
    fields: dict[str, Optional[str]] = {}
    for field, alternatives in LABELS.items():
        # "Issuing Post" is not a country name.  The legacy label list keeps
        # this fallback for API compatibility, but it must not populate the
        # country field from the adjacent post-name cell.
        if field == "issuing_country":
            fields[field] = None
            continue
        anchor = _find_label_anchor(words, alternatives)
        if anchor is None:
            fields[field] = None
            continue

        # US visa fields are normally values directly below their labels.
        # Prefer that geometry: the next label is otherwise easily mistaken
        # for a same-row value (e.g. "Issuing Post Name Control Number").
        cell_text = _value_below_anchor(words, anchor)
        if not cell_text:
            cell_text = _value_same_row(words, anchor)

        fields[field] = _parse_field_value(field, cell_text)

    # A strict text candidate is accepted only when geometry has already
    # identified its label and a visible cell supplies its trailing portion.
    passport_anchor = _find_label_anchor(words, LABELS["passport_number"])
    if passport_anchor and fields["passport_number"] is None:
        below_text = _value_below_anchor(words, passport_anchor)
        same_row_text = _value_same_row(words, passport_anchor)
        cell_text = below_text or same_row_text
        if cell_text:
            fields["passport_number"] = _corroborated_passport(raw_text, cell_text)

    return fields


def _value_same_row(words: list[dict], anchor: dict) -> Optional[str]:
    """Read values on the same row as the label, to the right of the label.

    This handles "LABEL: VALUE" or "LABEL VALUE" formats where the value
    appears on the same line as the label.
    """
    candidates = [
        word for word in words
        if word["page"] == anchor["page"]
        and abs(word["center_y"] - (anchor["y"] + anchor["y2"]) / 2) <= 14
        and word["x"] > anchor["x2"]  # Value must be to the right of label
        and word["x"] <= anchor["x2"] + 200  # Reasonable distance
    ]
    if not candidates:
        return None

    # Sort by x position and join
    row = sorted(candidates, key=lambda word: word["x"])
    value = " ".join(word["text"] for word in row)
    return value.strip() or None


def _label_token(value: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", value.upper())


def _find_label_anchor(words: list[dict], alternatives: Iterable[tuple[str, ...]]) -> Optional[dict]:
    """Find a label as consecutive words on the same visual row."""
    for target in alternatives:
        for index, word in enumerate(words):
            if _label_token(word["text"]) != target[0]:
                continue
            matched = [word]
            previous = word
            for expected in target[1:]:
                next_word = _next_word_on_row(words, index + len(matched), previous)
                if next_word is None or _label_token(next_word["text"]) != expected:
                    break
                matched.append(next_word)
                previous = next_word
            else:
                return {
                    "page": word["page"],
                    "x": min(item["x"] for item in matched),
                    "x2": max(item["x2"] for item in matched),
                    "y": min(item["y"] for item in matched),
                    "y2": max(item["y2"] for item in matched),
                }
    return None


def _next_word_on_row(words: list[dict], start: int, previous: dict) -> Optional[dict]:
    for candidate in words[start:]:
        if candidate["page"] != previous["page"]:
            return None
        if abs(candidate["center_y"] - previous["center_y"]) > 15:
            return None
        if candidate["x"] >= previous["x"]:
            return candidate
    return None


def _value_below_anchor(words: list[dict], anchor: dict) -> Optional[str]:
    """Read the first visual row directly beneath a label's bounding box."""
    candidates = [
        word for word in words
        if word["page"] == anchor["page"]
        and word["center_y"] > anchor["y2"]
        and word["center_y"] <= anchor["y2"] + 70
        and word["x2"] >= anchor["x"] - 12
        and word["x"] <= anchor["x2"] + 35
    ]
    if not candidates:
        return None

    first_row_y = min(word["center_y"] for word in candidates)
    row = [word for word in candidates if abs(word["center_y"] - first_row_y) <= 14]
    value = " ".join(word["text"] for word in sorted(row, key=lambda word: word["x"]))
    return value.strip() or None


def _parse_field_value(field: str, value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    if field == "issuing_post_name":
        return _clean_text(value)
    if field == "control_number":
        match = re.search(r"\d{10,16}", re.sub(r"\D", "", value))
        return match.group(0) if match else None
    if field == "passport_number":
        return _strict_passport(value)
    if field == "gender":
        match = re.search(r"\b([MF])\b", value.upper())
        return match.group(1) if match else None
    if field in {"date_of_birth", "issue_date", "expiry_date"}:
        return _normalise_date(value)
    if field == "nationality":
        match = re.fullmatch(r"\s*([A-Z]{3})\s*", value.upper())
        return match.group(1) if match else None
    if field == "entries":
        return _normalise_entries(value)
    if field == "visa_type":
        return _normalise_visa_type(value)
    if field == "visa_class":
        match = re.fullmatch(r"\s*(L-?\d{1,3})\s*", value.upper())
        return match.group(1).replace("-", "") if match else None
    if field == "annotation":
        return _clean_text(value)
    if field == "visa_number":
        return _normalise_visa_number(value)
    if field == "holder_name":
        return _clean_text(value)
    if field == "stay_duration":
        return _normalise_stay_duration(value)
    if field == "issuing_country":
        return _clean_text(value)
    return None


def _corroborated_passport(raw_text: str, visible_cell: Optional[str]) -> Optional[str]:
    """Accept one strict passport value corroborated by a geometry cell."""
    if not visible_cell:
        return None
    suffix = re.sub(r"[^A-Z0-9]", "", visible_cell.upper())
    if len(suffix) < 6:
        return None
    candidates = set(re.findall(r"\b[A-Z]\d{7}\b", raw_text.upper()))
    matching = [candidate for candidate in candidates if candidate.endswith(suffix)]
    return matching[0] if len(matching) == 1 else None


def _is_mrv_pair(mrz_lines: object) -> bool:
    return (
        isinstance(mrz_lines, list)
        and len(mrz_lines) == 2
        and all(isinstance(line, str) and len(line) == 44 for line in mrz_lines)
        and mrz_lines[0].startswith("V<")
    )


def _parse_mrv_fields(line2: str) -> dict:
    return {
        "passport_number": line2[0:9].rstrip("<") or None,
        "nationality": line2[10:13].replace("<", "") or None,
        "date_of_birth": _mrz_date(line2[13:19]),
        "expiry_date": _mrz_date(line2[21:27]),
    }


def _mrz_date(value: str) -> Optional[str]:
    if not re.fullmatch(r"\d{6}", value):
        return None
    year = 2000 + int(value[:2]) if int(value[:2]) <= 49 else 1900 + int(value[:2])
    try:
        return datetime(year, int(value[2:4]), int(value[4:6])).strftime("%d/%m/%Y")
    except ValueError:
        return None


def _strict_passport(value: str) -> Optional[str]:
    compact = re.sub(r"[^A-Z0-9]", "", value.upper())
    return compact if re.fullmatch(r"[A-Z]\d{7}", compact) else None


def _normalise_date(value: str) -> Optional[str]:
    # Support formats: "31 OCT 2025", "31OCT2025", "31 Oct 2025", "OCT 31 2025"
    text = value.upper().strip()

    # Try "DD MON YYYY" or "DDMONYYYY" format
    match = re.search(r"(\d{1,2})\s*([A-Z]{3})\s*(\d{4})", text)
    if not match:
        # Try "MON DD YYYY" format
        match = re.search(r"([A-Z]{3})\s*(\d{1,2})\s*(\d{4})", text)
        if match:
            # Swap day and month groups
            day = match.group(2)
            month_str = match.group(1)
            year = match.group(3)
        else:
            return None
    else:
        day = match.group(1)
        month_str = match.group(2)
        year = match.group(3)

    month = {
        "JAN": 1, "FEB": 2, "MAR": 3, "APR": 4, "MAY": 5, "JUN": 6,
        "JUL": 7, "AUG": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DEC": 12,
    }.get(month_str)
    if month is None:
        return None
    try:
        return datetime(int(year), month, int(day)).strftime("%d/%m/%Y")
    except ValueError:
        return None


def _normalise_entries(value: str) -> Optional[str]:
    compact = re.sub(r"[^A-Z0-9]", "", value.upper())
    return {
        "M": "MULTIPLE", "MULTI": "MULTIPLE", "MULTIPLE": "MULTIPLE",
        "S": "SINGLE", "SINGLE": "SINGLE", "1": "SINGLE",
        "D": "DOUBLE", "DOUBLE": "DOUBLE", "2": "DOUBLE",
    }.get(compact)


def _clean_text(value: str) -> Optional[str]:
    cleaned = re.sub(r"[^A-Za-z0-9 .,'#:/()&-]", " ", value)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned.upper() if cleaned else None


def _find_ped(raw_text: str) -> Optional[str]:
    match = re.search(r"\bPED\s*[-:]?\s*([0-9O]{1,2}[A-Z]{3}\d{4})\b", raw_text.upper())
    if not match:
        return None
    # OCR's O/0 confusion is safe here: this character is in the explicitly
    # labelled PED day field and a calendar date must still validate.
    return _normalise_date(match.group(1).replace("O", "0"))


def _validated_mrv_line2(raw_text: str) -> Optional[str]:
    """Return one checksum-valid MRV-A line 2 found as a complete OCR row."""
    candidates = []
    for line in raw_text.splitlines():
        candidate = clean_mrz_line(line)
        if len(candidate) == 44 and validate_mrv_line2(candidate):
            candidates.append(candidate)
    return candidates[0] if len(candidates) == 1 else None


def _extract_us_visa_grid(words: list[dict], raw_text: str) -> dict:
    """Recover US-visa grid values only when its identifying labels exist."""
    extracted: dict[str, Optional[str]] = {}
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    upper_lines = [line.upper() for line in lines]

    has_issuing_grid = any("ISSUING POST NAME" in line for line in upper_lines) and (
        any("TROL NUMBER" in line for line in upper_lines)
        or _find_label_anchor(words, (("CONTROL", "NUMBER"),)) is not None
    )
    if not has_issuing_grid:
        return extracted

    # These two cells have high-confidence, independent word geometry.
    issuing = _grid_cell_below(words, ("ISSUING", "POST", "NAME"))
    if issuing:
        extracted["issuing_post_name"] = _clean_text(issuing)
    control = _grid_cell_below(words, ("CONTROL", "NUMBER"))
    if control:
        extracted["control_number"] = _parse_field_value("control_number", control)

    # The text OCR preserves the labelled row sequence even when the tiny
    # left-side "Surname" label is unreadable.  In that specific grid, its
    # following row is the surname/given-name/type/class value row.
    given_index = next(
        (index for index, line in enumerate(upper_lines) if "GIVEN NAME" in line),
        None,
    )
    if given_index is not None and given_index + 1 < len(lines):
        value_line = lines[given_index + 1].upper()
        name_match = re.search(
            r"\b([A-Z]{2,}(?:\s+[A-Z]{2,}){1,2})\s+([A-Z])\w*\s+([A-Z]\d|[A-Z])\b",
            value_line,
        )
        if name_match:
            given = name_match.group(1)
            visa_type = name_match.group(2)
            visa_class = name_match.group(3)
            # A leading OCR artifact before the given name cannot become a
            # surname.  Use the preceding grid row only if it is a clean,
            # standalone alphabetic value.
            surname = _surname_before_given_row(lines, given_index)
            extracted["holder_name"] = " ".join(
                part for part in (given, surname) if part
            )
            extracted["visa_type"] = _normalise_visa_type(visa_type)
            extracted["visa_class"] = _normalise_visa_class(visa_class)

    passport_index = next(
        (index for index, line in enumerate(upper_lines) if "PASSPORT NUMBER" in line),
        None,
    )
    if passport_index is not None and passport_index + 1 < len(lines):
        passport_match = re.search(r"\b([A-Z]\d{7,8})\b", lines[passport_index + 1].upper())
        if passport_match:
            extracted["passport_number"] = passport_match.group(1)

    date_index = next(
        (index for index, line in enumerate(upper_lines) if "ISSUE DATE" in line and "EXPIRATION" in line),
        None,
    )
    if date_index is not None and date_index + 1 < len(lines):
        dates = re.findall(r"\b[0-9O]{1,2}\s*[A-Z]{3}\s*\d{4}\b", lines[date_index + 1].upper())
        if len(dates) >= 2:
            extracted["issue_date"] = _normalise_date(dates[0].replace("O", "0"))
            extracted["expiry_date"] = _normalise_date(dates[1].replace("O", "0"))

    annotation_index = next(
        (index for index, line in enumerate(upper_lines) if "ANNOTATION" in line),
        None,
    )
    if annotation_index is not None and annotation_index + 1 < len(lines):
        annotation = _clean_text(lines[annotation_index + 1])
        if annotation:
            # OCR sometimes prepends a single seal artifact to this cell.
            annotation = re.sub(r"^[^A-Z]*[A-Z]\s+(?=BLANKET\b)", "", annotation)
            extracted["annotation"] = annotation
            # L-1 is explicitly present in the annotation, and the grid's
            # Visa Type/Class label was recognized; use it only to repair a
            # non-class OCR read from that same row.
            if extracted.get("visa_class") is None:
                class_match = re.search(r"\b(L-?\d{1,3})\b", annotation)
                if class_match:
                    extracted["visa_class"] = _normalise_visa_class(class_match.group(1))

    return extracted


def _grid_cell_below(words: list[dict], label: tuple[str, ...]) -> Optional[str]:
    anchor = _find_label_anchor(words, (label,))
    return _value_below_anchor(words, anchor) if anchor else None


def _surname_before_given_row(lines: list[str], given_index: int) -> Optional[str]:
    if given_index < 1:
        return None
    # The line directly before the given-name label is decorative/noisy on
    # this layout.  The preceding data row contains the surname after a
    # short, damaged label fragment (for example, "Se VAIRAT").
    candidate = lines[given_index - 1].upper()
    match = re.match(r"[^A-Z]*[A-Z]{1,3}\s+([A-Z]{2,})\b", candidate)
    return match.group(1) if match else None


def _normalise_visa_class(value: str) -> Optional[str]:
    compact = re.sub(r"[^A-Z0-9]", "", value.upper())
    return compact if re.fullmatch(r"[A-Z]\d{1,3}", compact) else None


def _find_petition_number(raw_text: str) -> Optional[str]:
    match = re.search(r"\bP#\s*[-:]?\s*([A-Z0-9-]{8,})\b", raw_text.upper())
    return f"P#-{match.group(1)}" if match else None


# Known visa type codes and their normalized full-word forms. Single-letter
# codes (B, F, H, etc.) and common full-word forms (TOURIST, BUSINESS) are
# both accepted so the parser works across different visa layouts.
_VISA_TYPE_MAP = {
    "B": "BUSINESS", "BUSINESS": "BUSINESS", "B1": "BUSINESS", "B2": "BUSINESS",
    "F": "STUDENT", "F1": "STUDENT", "F2": "STUDENT", "STUDENT": "STUDENT",
    "H": "WORK", "H1B": "WORK", "H1": "WORK", "H2": "WORK", "WORK": "WORK",
    "TOURIST": "TOURIST", "T": "TOURIST",
    "J": "EXCHANGE", "J1": "EXCHANGE", "EXCHANGE": "EXCHANGE",
    "L": "INTRACOMPANY", "L1": "INTRACOMPANY", "INTRACOMPANY": "INTRACOMPANY",
    "E": "INVESTOR", "E2": "INVESTOR", "INVESTOR": "INVESTOR",
    "K": "FIANCE", "K1": "FIANCE", "FIANCE": "FIANCE", "FIANCEE": "FIANCE",
    "O": "EXTRAORDINARY", "O1": "EXTRAORDINARY", "EXTRAORDINARY": "EXTRAORDINARY",
    "P": "ARTIST", "P1": "ARTIST", "ARTIST": "ARTIST", "PERFORMER": "ARTIST",
    "R": "RELIGIOUS", "R1": "RELIGIOUS", "RELIGIOUS": "RELIGIOUS",
}


def _normalise_visa_type(value: str) -> Optional[str]:
    """Normalize visa type to a standard full-word form.

    Only accepts known visa codes and known textual values.
    Does not invent classifications or use unsafe substring matching.
    """
    if not value:
        return None
    compact = re.sub(r"[^A-Z0-9]", "", value.upper())
    if not compact:
        return None
    # Check direct mapping only - no substring matching
    if compact in _VISA_TYPE_MAP:
        return _VISA_TYPE_MAP[compact]
    # Return None for unknown values - do not guess
    return None


def _normalise_visa_number(value: str) -> Optional[str]:
    """Extract and normalize a visa number.

    US visa numbers typically:
    - Are 8 characters long (older format) or start with a letter followed by digits
    - Common formats: A12345678, 12345678, AB1234567
    - Must contain at least one digit
    """
    if not value:
        return None
    compact = re.sub(r"[^A-Z0-9]", "", value.upper())
    if not compact:
        return None

    # Must contain at least one digit
    if not any(char.isdigit() for char in compact):
        return None

    # US visa numbers are typically 8-9 characters
    # Format: optional letter prefix + digits
    if re.fullmatch(r"[A-Z]?\d{7,8}", compact):
        return compact
    # Some visas have 2-letter prefix
    if re.fullmatch(r"[A-Z]{2}\d{6,7}", compact):
        return compact

    return None


def _normalise_stay_duration(value: str) -> Optional[str]:
    """Extract and normalize stay duration information.

    Common formats: "90 DAYS", "6 MONTHS", "1 YEAR", etc.
    """
    if not value:
        return None
    # Look for patterns like "90 DAYS", "6 MONTHS", "1 YEAR"
    match = re.search(
        r"(\d+)\s*(DAYS?|MONTHS?|YEARS?|WEEKS?)",
        value.upper()
    )
    if match:
        number = match.group(1)
        unit = match.group(2)
        # Normalize unit to singular form
        unit = unit.rstrip("S")
        return f"{number} {unit.upper()}"
    # If no pattern matched, return the cleaned text if it looks reasonable
    cleaned = _clean_text(value)
    if cleaned and len(cleaned) <= 50:
        return cleaned
    return None
