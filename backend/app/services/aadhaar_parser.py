import re
from datetime import datetime
from typing import Optional
 
from app.services.ocr_service import extract_text
 
 
# =========================================================
# MAIN ENTRY POINTS
# =========================================================
 
def parse_aadhaar(file_path: str) -> dict:
    """
    Run OCR on an Aadhaar image/PDF and parse it into structured data.
 
    This is a thin wrapper: all the actual field-extraction logic
    lives in parse_aadhaar_text(), which works on plain text and can
    be tested independently of any image file.
    """
 
    raw_text = extract_text(file_path)
 
    return parse_aadhaar_text(raw_text)
 
 
def parse_aadhaar_text(raw_text: str) -> dict:
    """
    Parse Aadhaar fields from already-extracted OCR text.
 
    Parameters
    ----------
    raw_text : str
        Raw OCR output, as returned by ocr_service.extract_text().
        May be the front, back, or both sides concatenated.
 
    Returns
    -------
    dict
        See module docstring for field list. Any field that could
        not be confidently located is set to None rather than
        raising an error or guessing.
    """
 
    if not raw_text or not raw_text.strip():
        return _empty_result(raw_text or "")
 
    lines = _normalize_lines(raw_text)
    normalized_text = "\n".join(lines)
 
    aadhaar_number, aadhaar_checksum_valid = _parse_aadhaar_number(normalized_text)
 
    result = {
        "document_type": "AADHAAR",
 
        "aadhaar_number": aadhaar_number,
        "aadhaar_number_checksum_valid": aadhaar_checksum_valid,
 
        "name": _find_labeled_value(lines, NAME_LABELS) or _guess_name_near_dob(lines),
 
        "gender": _parse_gender(lines, normalized_text),
 
        "date_of_birth": _normalize_aadhaar_date(
            _find_labeled_value(lines, DOB_LABELS)
        ),
        "year_of_birth": _parse_year_of_birth(lines),
 
        "guardian_name": _parse_guardian_name(lines),
 
        "address": _parse_address(lines) or _guess_address_fallback(lines),
 
        "vid": _parse_vid(lines, normalized_text),
 
        "raw_text": raw_text.strip(),
    }
 
    return result
 
 
def _empty_result(raw_text: str) -> dict:
    """
    Shape returned when OCR produced no usable text at all. Every
    field is None rather than the function raising an error.
    """
 
    return {
        "document_type": "AADHAAR",
        "aadhaar_number": None,
        "aadhaar_number_checksum_valid": None,
        "name": None,
        "gender": None,
        "date_of_birth": None,
        "year_of_birth": None,
        "guardian_name": None,
        "address": None,
        "vid": None,
        "raw_text": raw_text.strip(),
    }
 
 
# =========================================================
# LABEL PATTERNS
# =========================================================
 
NAME_LABELS = [
    r"\bNAME\b",
]
 
DOB_LABELS = [
    r"\bDATE\s*OF\s*BIRTH\b",
    r"\bD\.?\s*O\.?\s*B\.?\b",
]
 
YOB_LABELS = [
    r"\bYEAR\s*OF\s*BIRTH\b",
    r"\bY\.?\s*O\.?\s*B\.?\b",
]
 
GENDER_LABELS = [
    r"\bGENDER\b",
    r"\bSEX\b",
]
 
GUARDIAN_LABEL_PATTERN = re.compile(
    r"\b([SDWC])\s*/\s*O\b\.?|"
    r"\bSON\s+OF\b|\bDAUGHTER\s+OF\b|\bWIFE\s+OF\b|\bCARE\s+OF\b",
    re.IGNORECASE,
)
 
ADDRESS_LABELS = [
    r"\bADDRESS\b",
]
 
VID_LABELS = [
    r"\bVID\b",
]
 
# Used only to detect "does this line look like a label" when
# checking a lookahead line for _find_labeled_value.
_ALL_LABEL_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in (
        NAME_LABELS
        + DOB_LABELS
        + YOB_LABELS
        + GENDER_LABELS
        + ADDRESS_LABELS
        + VID_LABELS
    )
]
 
 
# =========================================================
# TEXT NORMALIZATION
# (kept self-contained here rather than imported from
# visa_parser.py -- see module docstring on independence)
# =========================================================
 
def _normalize_lines(raw_text: str) -> list[str]:
    """
    Split OCR text into cleaned, non-empty lines: collapse internal
    whitespace, strip stray OCR border artifacts, drop blank lines,
    and collapse letter/digit-spaced OCR artifacts (see below).
    """
 
    lines = []
 
    for raw_line in raw_text.splitlines():
 
        line = raw_line.strip()
 
        if not line:
            continue
 
        line = re.sub(r"\s+", " ", line)
        line = re.sub(r"^[\|_\-~»«]+\s*", "", line)
        line = re.sub(r"\s*[\|_\-~»«]+$", "", line)
        line = _collapse_character_spacing(line)
        line = line.strip()
 
        if line:
            lines.append(line)
 
    return lines
 
 
_LETTER_SPACING_PATTERN = re.compile(r"(?:\b[A-Za-z]\b[ \t]){2,}\b[A-Za-z]\b")
_DIGIT_SPACING_PATTERN = re.compile(r"(?:\b\d\b[ \t]){2,}\b\d\b")
 
 
def _collapse_character_spacing(line: str) -> str:
    """
    Tesseract sometimes inserts a space between every individual
    character or digit (e.g. "F E M A L E", "2 3 4 5 6 7 8 9 0 1 2
    4") on lower-quality scans. Collapse runs of 3+ consecutive
    single-character tokens back into one word/number. Requiring
    3+ tokens (not 2) keeps this from misfiring on genuine short
    words in normal text, where two single-letter words in a row
    is rare and three is essentially never legitimate.
    """
 
    line = _LETTER_SPACING_PATTERN.sub(lambda m: m.group(0).replace(" ", ""), line)
    line = _DIGIT_SPACING_PATTERN.sub(lambda m: m.group(0).replace(" ", ""), line)
 
    return line
 
 
def _clean_value(raw: str) -> str:
    """
    Strip a label's leftover punctuation/separators from the start
    of an extracted value (e.g. ": RAHUL SHARMA" -> "RAHUL SHARMA").
    """
 
    if raw is None:
        return ""
 
    cleaned = raw.strip()
    cleaned = re.sub(r"^[:\-.\|#]+\s*", "", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned)
 
    return cleaned.strip()
 
 
def _looks_like_label(text: str) -> bool:
    """
    Heuristic: a short line that itself matches a known label
    pattern is almost certainly another label, not a value.
    """
 
    if len(text) > 40:
        return False
 
    return any(pattern.search(text) for pattern in _ALL_LABEL_PATTERNS)
 
 
def _find_labeled_value(
    lines: list[str],
    label_patterns: list[str],
    max_lookahead: int = 2,
) -> Optional[str]:
    """
    Search all lines for any of the given label patterns and read
    the value from the same line's remainder, or from one of the
    next `max_lookahead` lines if the label appeared alone.
    """
 
    compiled_patterns = [
        re.compile(pattern, re.IGNORECASE) for pattern in label_patterns
    ]
 
    for index, line in enumerate(lines):
 
        for pattern in compiled_patterns:
 
            match = pattern.search(line)
 
            if not match:
                continue
 
            same_line_remainder = _clean_value(line[match.end():])
 
            if same_line_remainder and not _looks_like_label(same_line_remainder):
                return same_line_remainder
 
            for offset in range(1, max_lookahead + 1):
 
                lookahead_index = index + offset
 
                if lookahead_index >= len(lines):
                    break
 
                candidate = _clean_value(lines[lookahead_index])
 
                if candidate and not _looks_like_label(candidate):
                    return candidate
 
    return None
 
 
# =========================================================
# AADHAAR NUMBER: PATTERN + CHECKSUM (not label-based)
#
# Many real Aadhaar cards print the 12-digit number completely
# unlabeled (large font, standalone line), so label search alone
# is unreliable. Instead, every 12-digit grouped candidate in the
# text is found and checked against the Verhoeff checksum UIDAI
# uses to generate Aadhaar numbers -- the first candidate that
# passes is returned as a confirmed match. If none pass, the first
# candidate found is still returned (OCR digit errors are common)
# but flagged via aadhaar_number_checksum_valid = False, so
# downstream validation knows to treat it with caution rather than
# trust it silently.
# =========================================================
 
_AADHAAR_NUMBER_PATTERN = re.compile(r"\b(\d{4})[ \t]?(\d{4})[ \t]?(\d{4})\b")
_TRAILING_DIGIT_GROUP_PATTERN = re.compile(r"^[ \t]?\d{4}")
 
 
def _parse_aadhaar_number(text: str) -> tuple[Optional[str], Optional[bool]]:
 
    candidates = []
 
    for match in _AADHAAR_NUMBER_PATTERN.finditer(text):
        digits = "".join(match.groups())
        start, end = match.span()
 
        # Reject if immediately preceded by another digit (this
        # 12-digit span is the tail of a longer number).
        before = text[start - 1] if start > 0 else ""
        if before.isdigit():
            continue
 
        # Reject if immediately followed by a digit OR by another
        # space-separated 4-digit group -- the latter case catches
        # a 16-digit VID, whose first 12 digits would otherwise
        # look exactly like a standalone Aadhaar number.
        after = text[end:end + 5]
        if after[:1].isdigit() or _TRAILING_DIGIT_GROUP_PATTERN.match(after):
            continue
 
        candidates.append(digits)
 
    if not candidates:
        return None, None
 
    for digits in candidates:
        if _validate_verhoeff(digits):
            formatted = f"{digits[0:4]} {digits[4:8]} {digits[8:12]}"
            return formatted, True
 
    # No candidate passed checksum -- return the first as an
    # unconfirmed best guess, clearly flagged as such.
    digits = candidates[0]
    formatted = f"{digits[0:4]} {digits[4:8]} {digits[8:12]}"
    return formatted, False
 
 
# --- Verhoeff checksum algorithm (used for real Aadhaar numbers) ---
 
_VERHOEFF_D_TABLE = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
]
 
_VERHOEFF_P_TABLE = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
]
 
 
def _validate_verhoeff(number_str: str) -> bool:
    """
    Validate a digit string against the Verhoeff checksum algorithm.
    UIDAI generates the final digit of every real Aadhaar number
    this way, so this confirms mathematical consistency -- exactly
    like passport_parser.py's MRZ check digits, this proves the
    number is well-formed, not that the card is genuine.
    """
 
    if not number_str.isdigit():
        return False
 
    checksum = 0
    reversed_digits = [int(d) for d in reversed(number_str)]
 
    for i, digit in enumerate(reversed_digits):
        checksum = _VERHOEFF_D_TABLE[checksum][_VERHOEFF_P_TABLE[i % 8][digit]]
 
    return checksum == 0
 
 
# =========================================================
# VID (Virtual ID) -- 16-digit alternate identifier
# =========================================================
 
_VID_PATTERN = re.compile(r"\b(\d{4})[ \t]?(\d{4})[ \t]?(\d{4})[ \t]?(\d{4})\b")
 
 
def _parse_vid(lines: list[str], raw_text: str) -> Optional[str]:
 
    labeled_value = _find_labeled_value(lines, VID_LABELS)
 
    if labeled_value:
        match = _VID_PATTERN.search(labeled_value)
        if match:
            digits = "".join(match.groups())
            return f"{digits[0:4]} {digits[4:8]} {digits[8:12]} {digits[12:16]}"
 
    return None
 
 
# =========================================================
# GENDER
# =========================================================
 
def _parse_gender(lines: list[str], raw_text: str) -> Optional[str]:
 
    labeled_value = _find_labeled_value(lines, GENDER_LABELS)
 
    search_text = labeled_value if labeled_value else raw_text
 
    if re.search(r"\bFEMALE\b", search_text, re.IGNORECASE):
        return "Female"
    if re.search(r"\bTRANSGENDER\b", search_text, re.IGNORECASE):
        return "Transgender"
    if re.search(r"\bMALE\b", search_text, re.IGNORECASE):
        return "Male"
 
    return None
 
 
# =========================================================
# GUARDIAN NAME (S/O, D/O, W/O, C/O)
# =========================================================
 
def _parse_guardian_name(lines: list[str]) -> Optional[str]:
 
    for line in lines:
 
        match = GUARDIAN_LABEL_PATTERN.search(line)
 
        if not match:
            continue
 
        remainder = _clean_value(line[match.end():])
 
        # Trim at the next comma, if present -- guardian name is
        # usually followed by the rest of the address.
        remainder = remainder.split(",")[0].strip()
 
        if remainder and not _looks_like_label(remainder):
            return remainder
 
    return None
 
 
# =========================================================
# NAME FALLBACK (no NAME label present)
#
# Conservative: only fires when the labeled search found nothing.
# Looks for a plausible name-looking line directly above the DOB
# line, since that's the common unlabeled layout.
# =========================================================
 
def _is_plausible_name_line(line: str) -> bool:
    """
    Letters/spaces/periods only, 2-4 words, no digits, not a known
    label -- deliberately strict so garbled OCR noise never passes.
    """
 
    if _looks_like_label(line):
        return False
 
    if not re.fullmatch(r"[A-Za-z.\s]{4,40}", line):
        return False
 
    words = line.split()
 
    return 2 <= len(words) <= 4
 
 
def _guess_name_near_dob(lines: list[str], window: int = 3) -> Optional[str]:
 
    dob_pattern = re.compile("|".join(DOB_LABELS), re.IGNORECASE)
    dob_index = None
 
    for index, line in enumerate(lines):
        if dob_pattern.search(line):
            dob_index = index
            break
 
    if dob_index is None:
        return None
 
    for offset in range(1, window + 1):
        candidate_index = dob_index - offset
        if candidate_index < 0:
            break
        if _is_plausible_name_line(lines[candidate_index]):
            return lines[candidate_index]
 
    return None
#
# Captures the "Address:" label and subsequent lines until a
# natural stopping point: a 6-digit PIN code line, a VID label,
# a repeated Aadhaar-number-like line, or a line count cap.
# =========================================================
 
_PIN_CODE_LINE_PATTERN = re.compile(r"\b\d{6}\b")
 
 
def _parse_address(lines: list[str], max_lines: int = 6) -> Optional[str]:
 
    address_label_pattern = re.compile(ADDRESS_LABELS[0], re.IGNORECASE)
 
    start_index = None
    first_line_remainder = ""
 
    for index, line in enumerate(lines):
 
        match = address_label_pattern.search(line)
 
        if match:
            start_index = index
            first_line_remainder = _clean_value(line[match.end():])
            break
 
    if start_index is None:
        return None
 
    collected = []
 
    if first_line_remainder and not _looks_like_label(first_line_remainder):
        collected.append(first_line_remainder)
 
    for offset in range(1, max_lines + 1):
 
        line_index = start_index + offset
 
        if line_index >= len(lines):
            break
 
        line = lines[line_index]
 
        if VID_LABELS and re.search(VID_LABELS[0], line, re.IGNORECASE):
            break
 
        if _AADHAAR_NUMBER_PATTERN.fullmatch(line.replace(" ", "")[:12]):
            break
 
        if _is_garbled(line):
            continue
 
        collected.append(line)
 
        if _PIN_CODE_LINE_PATTERN.search(line):
            break
 
    if not collected:
        return None
 
    return ", ".join(collected)
 
 
def _is_garbled(line: str) -> bool:
    """
    Conservative "is this OCR noise" check -- used only to skip
    lines while collecting multi-line address text, never to
    reject an already label/pattern-matched field.
    """
 
    if not line:
        return True
 
    useful = sum(1 for ch in line if ch.isalnum() or ch.isspace() or ch in ",.-/")
 
    return (useful / len(line)) < 0.6
 
 
def _guess_address_fallback(lines: list[str], max_lines: int = 5) -> Optional[str]:
    """
    Used only when no "Address" label was found. Anchors on a
    guardian marker (S/O, D/O, W/O, C/O) or a bare 6-digit PIN
    code -- both are strong, address-specific signals even
    without an explicit label -- then scans forward from that
    anchor using the same stop conditions as the labeled address
    parser (VID label, a repeated Aadhaar-number-like line, or the
    PIN code line itself), skipping garbled/label lines along the
    way. Does not look backward from the anchor, since an
    unrelated preceding line (e.g. OCR noise) has no reliable
    relationship to the address that follows.
    """
 
    anchor_index = None
 
    for index, line in enumerate(lines):
        if GUARDIAN_LABEL_PATTERN.search(line) or _PIN_CODE_LINE_PATTERN.search(line):
            anchor_index = index
            break
 
    if anchor_index is None:
        return None
 
    collected = []
 
    for offset in range(0, max_lines):
 
        line_index = anchor_index + offset
 
        if line_index >= len(lines):
            break
 
        line = lines[line_index]
 
        if VID_LABELS and re.search(VID_LABELS[0], line, re.IGNORECASE):
            break
 
        if _AADHAAR_NUMBER_PATTERN.fullmatch(line.replace(" ", "")[:12]):
            break
 
        if _is_garbled(line) or _looks_like_label(line):
            continue
 
        collected.append(line)
 
        if _PIN_CODE_LINE_PATTERN.search(line):
            break
 
    return ", ".join(collected) if collected else None
 
 
# =========================================================
# DATE OF BIRTH / YEAR OF BIRTH
# =========================================================
 
_MONTH_NAME_TO_NUMBER = {
    "JAN": 1, "FEB": 2, "MAR": 3, "APR": 4,
    "MAY": 5, "JUN": 6, "JUL": 7, "AUG": 8,
    "SEP": 9, "SEPT": 9, "OCT": 10, "NOV": 11, "DEC": 12,
}
 
_DATE_PATTERNS = [
    re.compile(r"(\d{4})-(\d{1,2})-(\d{1,2})"),                   # ISO
    re.compile(r"(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})"),        # DD/MM/YYYY
    re.compile(r"(\d{1,2})\s*([A-Za-z]{3,9})\.?,?\s*(\d{2,4})"),   # DD Mon YYYY
]
 
 
def _resolve_year(year_str: str) -> Optional[int]:
 
    if len(year_str) == 4:
        return int(year_str)
 
    if len(year_str) == 2:
        current_yy = datetime.now().year % 100
        yy = int(year_str)
        century = 2000 if yy <= current_yy else 1900
        return century + yy
 
    return None
 
 
def _try_build_date(year: int, month: int, day: int) -> Optional[str]:
 
    try:
        return datetime(year=year, month=month, day=day).strftime("%d/%m/%Y")
    except ValueError:
        return None
 
 
def _normalize_aadhaar_date(raw_value: Optional[str]) -> Optional[str]:
    """
    Convert a raw OCR date string into DD/MM/YYYY. Returns None if
    no supported pattern produces a valid calendar date.
    """
 
    if not raw_value:
        return None
 
    text = raw_value.strip()
 
    match = _DATE_PATTERNS[0].search(text)
    if match:
        year, month, day = match.groups()
        parsed = _try_build_date(int(year), int(month), int(day))
        if parsed:
            return parsed
 
    match = _DATE_PATTERNS[1].search(text)
    if match:
        day, month, year_str = match.groups()
        year = _resolve_year(year_str)
        if year:
            parsed = _try_build_date(year, int(month), int(day))
            if parsed:
                return parsed
 
    match = _DATE_PATTERNS[2].search(text)
    if match:
        day, month_name, year_str = match.groups()
        month = _MONTH_NAME_TO_NUMBER.get(month_name.upper()[:3])
        year = _resolve_year(year_str)
        if month and year:
            parsed = _try_build_date(year, month, int(day))
            if parsed:
                return parsed
 
    return None
 
 
def _parse_year_of_birth(lines: list[str]) -> Optional[str]:
    """
    Older Aadhaar cards print only a Year of Birth, not a full DOB.
    Only used as a fallback -- callers should prefer date_of_birth
    when both are present.
    """
 
    labeled_value = _find_labeled_value(lines, YOB_LABELS)
 
    if not labeled_value:
        return None
 
    match = re.search(r"\b(19|20)\d{2}\b", labeled_value)
 
    return match.group(0) if match else None
 