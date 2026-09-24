"""
OCR service for the VerifyX / AI Identity Screening backend.

Supported document formats:
    - PNG
    - JPG / JPEG
    - PDF

Supported document workflows:
    - General document OCR
    - Layout-aware OCR data for field parsers
    - Passport TD3 MRZ candidate extraction
    - Visa MRV-A MRZ candidate extraction

Design rules:
    1. OCR only extracts text / coordinates. It does not decide identity.
    2. MRZ candidates are never fabricated by padding missing characters.
    3. Check-digit correction only uses explicit, position-aware OCR
       confusions. It never changes arbitrary characters just to make a
       checksum pass.
    4. All public helpers used by the existing parsers are retained.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

try:
    import pytesseract
except ImportError:  # pragma: no cover - test environments may omit Tesseract
    pytesseract = None
try:
    from PIL import Image, ImageOps, ImageFilter
except ImportError:  # pragma: no cover - test environments may omit Pillow
    Image = None
    ImageOps = None
    ImageFilter = None

try:
    import pymupdf
except ImportError:  # pragma: no cover - depends on deployment image
    pymupdf = None


# ============================================================================
# CONFIGURATION
# ============================================================================

TESSERACT_PATH = Path(r"C:\Program Files\Tesseract-OCR\tesseract.exe")
if TESSERACT_PATH.exists():
    if pytesseract is not None:
        pytesseract.pytesseract.tesseract_cmd = str(TESSERACT_PATH)

SUPPORTED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg"}
SUPPORTED_EXTENSIONS = SUPPORTED_IMAGE_EXTENSIONS | {".pdf"}

MRZ_ALLOWED_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<"
MRZ_WEIGHTS = (7, 3, 1)

# General OCR variants. A single, moderate scale retains the document's
# spatial relationships and avoids multiplying API latency on every upload.
TEXT_UPSCALE_FACTORS = (3,)
TEXT_THRESHOLDS = (None, 170)
TEXT_PSM_MODES = (6, 11)

# MRZ variants need stronger upscaling and a character whitelist. The small,
# deliberately bounded threshold set favours repeatable extraction over an
# expensive search that could turn weak OCR into a plausible-looking result.
MRZ_UPSCALE_FACTOR = 4
MRZ_THRESHOLDS = (None, 160, 190)
MRZ_PSM_MODES = (6, 11)

MRZ_WHITELIST_CONFIG = (
    "-c tessedit_char_whitelist="
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<"
)

# Local tessdata directory (project-relative) for optional community models
# such as an OCR-B/MRZ traineddata. This keeps usage project-local and
# configurable without hardcoding user-specific paths.
LOCAL_TESSDATA_DIR = Path(__file__).resolve().parents[3] / "tessdata"

_ID_DOCUMENT_LABEL_KEYWORDS = (
    "NAME", "SURNAME", "GIVEN", "NUMBER", "PASSPORT", "NATIONALITY",
    "DATE", "BIRTH", "ISSUE", "EXPIR", "SEX", "GENDER", "ADDRESS",
    "TYPE", "CLASS", "CONTROL", "ENTRIES", "VISA", "ISSUING",
)

# OCR confusions permitted only where they are plausible. We deliberately do
# not have broad substitutions such as every 1 -> I or every 0 -> O.
CONFUSABLES: dict[str, tuple[str, ...]] = {
    "0": ("O", "Q", "D"),
    "O": ("0", "Q", "D"),
    "1": ("I", "L"),
    "I": ("1", "L"),
    "L": ("1", "I"),
    "2": ("Z"),
    "Z": ("2"),
    "5": ("S"),
    "S": ("5"),
    "6": ("G", "C"),
    "G": ("6", "C"),
    "8": ("B"),
    "B": ("8"),
    "9": ("G", "Q"),
    "G": ("9", "Q"),
}


# ============================================================================
# SMALL DATA STRUCTURE FOR LAYOUT OCR
# ============================================================================

@dataclass(frozen=True)
class OCRWord:
    text: str
    confidence: float
    page: int
    x: int
    y: int
    width: int
    height: int

    @property
    def x2(self) -> int:
        return self.x + self.width

    @property
    def y2(self) -> int:
        return self.y + self.height

    @property
    def center_x(self) -> float:
        return self.x + self.width / 2

    @property
    def center_y(self) -> float:
        return self.y + self.height / 2


# ============================================================================
# FILE / IMAGE HANDLING
# ============================================================================

def _validate_file_path(file_path: str | Path) -> Path:
    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f"OCR input file not found: {path}")

    if not path.is_file():
        raise ValueError(f"OCR input path is not a file: {path}")

    if path.suffix.lower() not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file type {path.suffix!r}. "
            f"Supported types: {sorted(SUPPORTED_EXTENSIONS)}"
        )

    return path


def _render_pdf_pages(file_path: str | Path, scale: float = 3.0) -> list[Image.Image]:
    """Render every PDF page into an RGB PIL image suitable for OCR."""
    path = _validate_file_path(file_path)

    if pymupdf is None:
        raise RuntimeError(
            "PDF OCR requires PyMuPDF. Install the 'pymupdf' package before "
            "processing PDF documents."
        )

    pages: list[Image.Image] = []

    try:
        document = pymupdf.open(path)
    except Exception as error:
        raise ValueError(f"Could not open PDF for OCR: {path}") from error

    with document:
        for page in document:
            pixmap = page.get_pixmap(
                matrix=pymupdf.Matrix(scale, scale),
                alpha=False,
            )
            image = Image.frombytes(
                "RGB",
                (pixmap.width, pixmap.height),
                pixmap.samples,
            )
            pages.append(image)

    return pages


def _load_document_pages(file_path: str | Path) -> list[Image.Image]:
    path = _validate_file_path(file_path)

    if path.suffix.lower() == ".pdf":
        return _render_pdf_pages(path)

    try:
        with Image.open(path) as image:
            return [image.convert("RGB")]
    except (OSError, ValueError) as error:
        raise ValueError(f"Could not open image for OCR: {path}") from error


def _preprocess_text_image(
    image: Image.Image,
    scale: int,
    threshold: Optional[int],
) -> Image.Image:
    grayscale = ImageOps.grayscale(image)

    if scale != 1:
        grayscale = grayscale.resize(
            (
                max(1, grayscale.width * scale),
                max(1, grayscale.height * scale),
            ),
            Image.Resampling.LANCZOS,
        )

    if threshold is None:
        return grayscale

    return grayscale.point(
        lambda pixel, t=threshold: 0 if pixel < t else 255
    )


def _ocr_to_text(image: Image.Image, *, config: str, lang: str = "eng") -> str:
    """Run Tesseract with a clear error if the local engine is unavailable.

    The optional `lang` parameter allows using alternative traineddata (for
    example an 'ocrb' MRZ model) without changing global defaults.
    """
    if pytesseract is None:
        raise RuntimeError(
            "The 'pytesseract' Python package is not installed. Install it to use OCR features."
        )
    try:
        return pytesseract.image_to_string(image, lang=lang, config=config)
    except AttributeError:
        # Defensive: if pytesseract is present but missing expected attrs
        raise RuntimeError("pytesseract is not usable in this environment.")
    except pytesseract.TesseractNotFoundError as error:
        raise RuntimeError(
            "Tesseract OCR is not installed or is not available on PATH."
        ) from error
    except pytesseract.TesseractError as error:
        raise RuntimeError(f"Tesseract OCR failed: {error}") from error


def _ocr_to_data(image: Image.Image, *, config: str, lang: str = "eng") -> dict:
    """Return Tesseract word data with the same useful error behaviour.

    The optional `lang` parameter allows using alternative traineddata (for
    example an 'ocrb' MRZ model) without changing global defaults.
    """
    if pytesseract is None:
        raise RuntimeError(
            "The 'pytesseract' Python package is not installed. Install it to use OCR features."
        )
    try:
        return pytesseract.image_to_data(
            image,
            lang=lang,
            config=config,
            output_type=pytesseract.Output.DICT,
        )
    except AttributeError:
        raise RuntimeError("pytesseract is not usable in this environment.")
    except pytesseract.TesseractNotFoundError as error:
        raise RuntimeError(
            "Tesseract OCR is not installed or is not available on PATH."
        ) from error
    except pytesseract.TesseractError as error:
        raise RuntimeError(f"Tesseract OCR failed: {error}") from error


# ============================================================================
# GENERAL OCR
# ============================================================================

def _score_ocr_candidate(text: str) -> tuple[int, int]:
    """
    Score OCR output without extracting fields.

    First score:
        number of recognizable ID-document keywords.

    Second score:
        amount of alphanumeric content.

    The score is only used to choose among preprocessing variants.
    """
    upper_text = text.upper()

    keyword_score = sum(
        1 for keyword in _ID_DOCUMENT_LABEL_KEYWORDS if keyword in upper_text
    )

    alphanumeric_count = sum(
        1 for char in upper_text if char.isalnum()
    )

    return keyword_score, alphanumeric_count


def extract_text_from_image(file_path: str | Path) -> str:
    """
    Extract general OCR text from an image.

    Several preprocessing variants are tried. The best result is selected
    using document-text richness, not document-specific field assumptions.
    """
    pages = _load_document_pages(file_path)

    if not pages:
        return ""

    page_outputs: list[str] = []

    for page_image in pages:
        best_text = ""
        best_score = (-1, -1)

        for scale in TEXT_UPSCALE_FACTORS:
            for threshold in TEXT_THRESHOLDS:
                candidate = _preprocess_text_image(
                    page_image,
                    scale=scale,
                    threshold=threshold,
                )

                for psm in TEXT_PSM_MODES:
                    text = _ocr_to_text(
                        candidate,
                        config=f"--psm {psm}",
                    ).strip()

                    score = _score_ocr_candidate(text)

                    if score > best_score:
                        best_score = score
                        best_text = text

        page_outputs.append(best_text)

    return "\n\n".join(
        text for text in page_outputs if text
    ).strip()


def extract_text_from_pdf(file_path: str | Path) -> str:
    """Compatibility wrapper for PDF callers."""
    return extract_text(file_path)


def extract_text(file_path: str | Path) -> str:
    """Main general OCR entry point."""
    path = _validate_file_path(file_path)

    if path.suffix.lower() == ".pdf":
        return extract_text_from_image(path)

    return extract_text_from_image(path)


def extract_passport_identity_text(file_path: str | Path) -> str:
    """Return OCR text used by visible passport-field fallback parsing."""
    return extract_text(file_path)


# ============================================================================
# LAYOUT-AWARE OCR
# ============================================================================

def _tesseract_data_to_words(
    data: dict,
    page_number: int,
    source_scale: int,
) -> list[OCRWord]:
    words: list[OCRWord] = []

    total = len(data.get("text", []))

    for index in range(total):
        text = (data["text"][index] or "").strip()
        if not text:
            continue

        try:
            confidence = float(data["conf"][index])
        except (TypeError, ValueError):
            confidence = -1.0

        try:
            # Layout OCR runs on an enlarged image for better recognition.
            # Convert coordinates back to the source document's pixel space so
            # downstream parsers receive stable, meaningful geometry.
            x = round(int(data["left"][index]) / source_scale)
            y = round(int(data["top"][index]) / source_scale)
            width = round(int(data["width"][index]) / source_scale)
            height = round(int(data["height"][index]) / source_scale)
        except (TypeError, ValueError):
            continue

        if width <= 0 or height <= 0:
            continue

        words.append(
            OCRWord(
                text=text,
                confidence=confidence,
                page=page_number,
                x=x,
                y=y,
                width=width,
                height=height,
            )
        )

    return words


def extract_layout_data(file_path: str | Path) -> list[dict]:
    """
    Return OCR words with coordinates for document-specific parsers.

    Each returned dict contains:
        text, confidence, page, x, y, width, height, x2, y2,
        center_x, center_y

    This is intentionally generic. Visa/passport/Aadhaar field association
    belongs in their parsers, not here.
    """
    pages = _load_document_pages(file_path)
    results: list[dict] = []

    layout_scale = 3

    for page_number, page_image in enumerate(pages, start=1):
        # Use a moderate upscale to preserve page geometry while improving
        # character recognition.
        prepared = _preprocess_text_image(
            page_image,
            scale=layout_scale,
            threshold=None,
        )

        data = _ocr_to_data(prepared, config="--psm 6")

        words = _tesseract_data_to_words(
            data,
            page_number,
            source_scale=layout_scale,
        )

        results.extend(
            {
                "text": word.text,
                "confidence": word.confidence,
                "page": word.page,
                "x": word.x,
                "y": word.y,
                "width": word.width,
                "height": word.height,
                "x2": word.x2,
                "y2": word.y2,
                "center_x": word.center_x,
                "center_y": word.center_y,
            }
            for word in words
        )

    return results


def calculate_ocr_metrics(file_path: str | Path, review_threshold: float = 70.0) -> dict:
    """Calculate document-level OCR metrics from Tesseract word confidence."""
    words = extract_layout_data(file_path)
    scored_words = [
        word for word in words
        if isinstance(word.get("confidence"), (int, float))
        and word["confidence"] >= 0
    ]
    review_words = [
        word for word in scored_words
        if word["confidence"] < review_threshold
    ]

    return {
        "confidence": round(
            sum(word["confidence"] for word in scored_words) / len(scored_words),
            1,
        ) if scored_words else None,
        "tokens_detected": len(words),
        "tokens_requiring_review": len(review_words),
        "fields_detected": len(scored_words),
        "fields_requiring_review": len(review_words),
        "review_threshold": review_threshold,
        "words": scored_words,
    }


# ============================================================================
# MRZ CHECK DIGIT UTILITIES
# ============================================================================

def mrz_char_value(char: str) -> int:
    """
    ICAO MRZ character values:
        '<' = 0
        '0'-'9' = 0-9
        'A'-'Z' = 10-35
    """
    if char == "<":
        return 0

    if char.isdigit():
        return int(char)

    if "A" <= char <= "Z":
        return ord(char) - ord("A") + 10

    return 0


def mrz_check_digit(field: str) -> str:
    """Calculate the ICAO MRZ 7-3-1 check digit."""
    total = 0

    for index, char in enumerate(field):
        total += mrz_char_value(char) * MRZ_WEIGHTS[index % 3]

    return str(total % 10)


def correct_field_against_check_digit(
    field: str,
    expected_check: str,
) -> str:
    """
    Correct at most one OCR confusion when a field checksum proves that
    the field is wrong.

    No character is changed unless:
        - it has a known OCR-confusable alternative, and
        - that single substitution makes the check digit match.
    """
    field = clean_mrz_line(field)

    if len(field) == 0 or not expected_check.isdigit():
        return field

    if mrz_check_digit(field) == expected_check:
        return field

    for index, char in enumerate(field):
        for alternative in CONFUSABLES.get(char, ()):
            candidate = (
                field[:index]
                + alternative
                + field[index + 1:]
            )

            if mrz_check_digit(candidate) == expected_check:
                return candidate

    return field


# ============================================================================
# MRZ TEXT CLEANING / NORMALIZATION
# ============================================================================

def clean_mrz_line(line: str) -> str:
    """Keep only legal MRZ characters and remove whitespace."""
    upper = (line or "").upper().strip().replace(" ", "")

    return "".join(
        character
        for character in upper
        if character in MRZ_ALLOWED_CHARS
    )


def normalize_mrz_line1(line1: str) -> str:
    """
    Normalize a TD3/MRV-A line-1 candidate without inventing missing text.

    Long runs of OCR garbage near the trailing filler area are converted to
    '<'. Interior name content is preserved.
    """
    cleaned = clean_mrz_line(line1)

    if not cleaned:
        return ""

    # A run of filler after the surname/given-name separator is the only
    # reliable evidence that a name field has ended.  We never pad a short
    # OCR result: this normalization is limited to an already complete line
    # and replaces only OCR noise occupying existing trailing positions.
    if len(cleaned) != 44 or "<<" not in cleaned[5:]:
        return cleaned

    match = re.search(r"<{5,}", cleaned[5:])
    if not match:
        return cleaned

    filler_start = 5 + match.start()
    return cleaned[:filler_start] + ("<" * (44 - filler_start))


# ============================================================================
# PASSPORT TD3 LINE 2
# ============================================================================

def _correct_td3_line2_internal(line2: str) -> str:
    chars = list(clean_mrz_line(line2))

    if len(chars) != 44:
        return "".join(chars)

    # Passport number: positions 0-8, check at 9
    chars[0:9] = list(
        correct_field_against_check_digit(
            "".join(chars[0:9]),
            chars[9],
        )
    )

    # Date of birth: positions 13-18, check at 19
    chars[13:19] = list(
        correct_field_against_check_digit(
            "".join(chars[13:19]),
            chars[19],
        )
    )

    # Date of expiry: positions 21-26, check at 27
    chars[21:27] = list(
        correct_field_against_check_digit(
            "".join(chars[21:27]),
            chars[27],
        )
    )

    # Optional data: positions 28-41, check at 42
    chars[28:42] = list(
        correct_field_against_check_digit(
            "".join(chars[28:42]),
            chars[42],
        )
    )

    return "".join(chars)


def _apply_constrained_nationality_confusions(line2: str) -> str:
    """
    Correct only position-aware OCR ambiguities in the nationality field.

    The nationality segment is a 3-character alphabetic ICAO code at MRZ
    positions 10-12. We do not accept arbitrary replacements elsewhere in the
    MRZ.  The candidate is only kept when the full TD3 line still verifies its
    field and composite check digits exactly.
    """
    cleaned = clean_mrz_line(line2)
    if len(cleaned) != 44:
        return cleaned

    for position in range(10, 13):
        original = cleaned[position]
        if not original.isdigit():
            continue
        for candidate_char in CONFUSABLES.get(original, ()):
            if not candidate_char.isalpha() or not candidate_char.isupper():
                continue
            candidate = cleaned[:position] + candidate_char + cleaned[position + 1:]
            if validate_mrz_line2(candidate):
                return candidate

    return cleaned


def correct_mrz_line2(line2: str) -> str:
    """
    Correct passport TD3 line 2 using its field check digits.

    The final composite check digit is never overwritten to manufacture
    validity. It is only evaluated by validate_mrz_line2().
    """
    raw = clean_mrz_line(line2)
    if len(raw) != 44:
        return raw

    corrected = _correct_td3_line2_internal(raw)
    if len(corrected) != 44:
        return corrected

    return _apply_constrained_nationality_confusions(corrected)


def normalize_mrz_ocr_confusions(line2: str) -> str:
    """Constrained OCR normalization for ambiguous MRZ letter/digit pairs."""
    return _apply_constrained_nationality_confusions(clean_mrz_line(line2))


def validate_mrz_line2(line2: str) -> bool:
    """Validate all TD3 line-2 field and composite check digits."""
    line2 = clean_mrz_line(line2)

    if len(line2) != 44:
        return False

    if not all(
        character.isalnum() or character == "<"
        for character in line2
    ):
        return False

    # Passport number
    if not line2[9].isdigit():
        return False
    if mrz_check_digit(line2[0:9]) != line2[9]:
        return False

    # DOB
    if not line2[19].isdigit():
        return False
    if mrz_check_digit(line2[13:19]) != line2[19]:
        return False

    # Expiry
    if not line2[27].isdigit():
        return False
    if mrz_check_digit(line2[21:27]) != line2[27]:
        return False

    # Optional data
    if not line2[42].isdigit():
        return False
    if mrz_check_digit(line2[28:42]) != line2[42]:
        return False

    # Composite:
    # 0-9 + 13-19 + 21-42
    composite_field = (
        line2[0:10]
        + line2[13:20]
        + line2[21:43]
    )

    return mrz_check_digit(composite_field) == line2[43]


# ============================================================================
# VISA MRV-A LINE 2
# ============================================================================

def correct_mrv_line2(line2: str) -> str:
    """
    Correct the three MRV-A field-level checks:
        document number, DOB, expiry.
    """
    chars = list(clean_mrz_line(line2))

    if len(chars) != 44:
        return "".join(chars)

    # Document number 0-8, check at 9
    chars[0:9] = list(
        correct_field_against_check_digit(
            "".join(chars[0:9]),
            chars[9],
        )
    )

    # DOB 13-18, check at 19
    chars[13:19] = list(
        correct_field_against_check_digit(
            "".join(chars[13:19]),
            chars[19],
        )
    )

    # Expiry 21-26, check at 27
    chars[21:27] = list(
        correct_field_against_check_digit(
            "".join(chars[21:27]),
            chars[27],
        )
    )

    return "".join(chars)


def validate_mrv_line2(line2: str) -> bool:
    """Validate MRV-A field-level checks without inventing extra checks."""
    line2 = clean_mrz_line(line2)

    if len(line2) != 44:
        return False

    for check_position in (9, 19, 27):
        if not line2[check_position].isdigit():
            return False

    if mrz_check_digit(line2[0:9]) != line2[9]:
        return False

    if mrz_check_digit(line2[13:19]) != line2[19]:
        return False

    if mrz_check_digit(line2[21:27]) != line2[27]:
        return False

    return True


# ============================================================================
# MRZ CANDIDATE GENERATION
# ============================================================================

def _mrz_score(line: str, document_code_prefix: str) -> float:
    """
    Score an individual MRZ candidate without declaring it valid.

    Higher:
        - exact 44 chars
        - expected document code
        - alphabetic issuing-state positions
        - plausible check-digit positions
    """
    candidate = clean_mrz_line(line)

    if not candidate:
        return -1.0

    score = 0.0

    if len(candidate) == 44:
        score += 100
    elif 38 <= len(candidate) <= 48:
        score += 20 - abs(44 - len(candidate))
    else:
        return score

    if candidate.startswith(document_code_prefix):
        score += 40

    if len(candidate) >= 5:
        score += sum(
            1 for char in candidate[2:5]
            if char.isalpha() or char == "<"
        ) * 2

    if len(candidate) >= 10 and candidate[9].isdigit():
        score += 5

    if len(candidate) >= 28 and candidate[27].isdigit():
        score += 5

    return score


@dataclass(frozen=True)
class _MRZRow:
    """One OCR row reconstructed solely from horizontally adjacent words."""

    text: str
    x: float
    y: float
    x2: float
    y2: float
    source: str


def _rows_from_ocr_data(
    data: dict,
    *,
    source_scale: int,
    y_offset: int,
    source: str,
) -> list[_MRZRow]:
    """Cluster whitelist OCR words into visual rows without cross-row joins."""
    words: list[dict] = []
    for index, raw_text in enumerate(data.get("text", [])):
        text = clean_mrz_line(raw_text)
        if not text:
            continue
        try:
            x = int(data["left"][index]) / source_scale
            y = int(data["top"][index]) / source_scale + y_offset
            width = int(data["width"][index]) / source_scale
            height = int(data["height"][index]) / source_scale
        except (KeyError, TypeError, ValueError):
            continue
        if width > 0 and height > 0:
            words.append({"text": text, "x": x, "y": y, "x2": x + width,
                          "y2": y + height, "cy": y + height / 2})

    words.sort(key=lambda item: (item["cy"], item["x"]))
    clusters: list[list[dict]] = []
    for word in words:
        if clusters and abs(word["cy"] - clusters[-1][0]["cy"]) <= 14:
            clusters[-1].append(word)
        else:
            clusters.append([word])

    rows: list[_MRZRow] = []
    for cluster in clusters:
        cluster.sort(key=lambda item: item["x"])
        # Split visually separate content; only nearby words may be joined.
        segments: list[list[dict]] = [[]]
        previous = None
        for word in cluster:
            if previous is not None and word["x"] - previous["x2"] > 60:
                segments.append([])
            segments[-1].append(word)
            previous = word
        for segment in segments:
            text = "".join(word["text"] for word in segment)
            if len(text) < 12:
                continue
            rows.append(_MRZRow(
                text=text, x=segment[0]["x"], y=min(word["y"] for word in segment),
                x2=max(word["x2"] for word in segment),
                y2=max(word["y2"] for word in segment), source=source,
            ))
    return rows


def _detect_mrz_region(image: Image.Image) -> tuple[int, int, list[_MRZRow]]:
    """Find a bounded lower-page region containing two long aligned OCR rows."""
    scan = _preprocess_text_image(image, scale=2, threshold=None)
    data = _ocr_to_data(scan, config=f"--psm 11 {MRZ_WHITELIST_CONFIG}")
    rows = _rows_from_ocr_data(data, source_scale=2, y_offset=0, source="scan")
    height = image.height
    eligible = [row for row in rows if row.y >= height * 0.45 and len(row.text) >= 20]

    best: Optional[tuple[_MRZRow, _MRZRow]] = None
    best_score = -1.0
    for first_index, first in enumerate(eligible):
        for second in eligible[first_index + 1:]:
            gap = second.y - first.y
            if not 12 <= gap <= max(120, height * 0.18):
                continue
            alignment = max(0.0, 100.0 - abs(first.x - second.x))
            score = len(first.text) + len(second.text) + alignment + (first.y / height) * 10
            if score > best_score:
                best_score, best = score, (first, second)

    if best is None:
        # Conservative bounded fallback. It is still only a search region;
        # the pair must pass geometry and checksum validation below.
        return int(height * 0.55), height, rows

    top = max(0, int(best[0].y - 24))
    bottom = min(height, int(best[1].y2 + 24))
    return top, bottom, rows


def _collect_mrz_rows(
    image: Image.Image,
    document_code_prefix: str,
    crop_top_ratio: float = 0.55,
) -> list[_MRZRow]:
    """Run a small, geometry-preserving OCR set over a detected MRZ region."""
    crop_top, crop_bottom, scan_rows = _detect_mrz_region(image)
    crop = image.crop((0, crop_top, image.width, crop_bottom))
    # The broad scan is locator-only.  It must not itself become identity
    # evidence: whitelist OCR over a whole page can yield accidental 44-char
    # strings.  Re-OCR the located rows in isolation instead.
    rows: list[_MRZRow] = []
    for scan_row in sorted(
        (row for row in scan_rows if row.y >= image.height * 0.45 and len(row.text) >= 20),
        key=lambda row: row.y,
    )[-4:]:
        top = max(0, int(scan_row.y - 14))
        bottom = min(image.height, int(scan_row.y2 + 14))
        left = max(0, int(scan_row.x - 20))
        right = min(image.width, int(scan_row.x2 + 20))
        isolated = _preprocess_text_image(
            image.crop((left, top, right, bottom)), scale=6, threshold=None,
        )
        text = clean_mrz_line(_ocr_to_text(
            isolated, config=f"--psm 7 {MRZ_WHITELIST_CONFIG}",
        ))
        if len(text) >= 12:
            rows.append(_MRZRow(
                text=text, x=scan_row.x, y=scan_row.y, x2=scan_row.x2,
                y2=scan_row.y2, source="targeted-row",
            ))

    # The two lowest long rows are the strongest MRZ-region hypothesis.  OCR
    # each half separately, with their boundary at the midpoint, so adjacent
    # rows cannot merge into an apparently complete string.
    likely_rows = sorted(
        (row for row in scan_rows if row.y >= image.height * 0.45 and len(row.text) >= 20),
        key=lambda row: row.y,
    )[-2:]
    if len(likely_rows) == 2:
        boundary = (likely_rows[0].y + likely_rows[1].y) / 2
        bounds = (
            (max(0, int(likely_rows[0].y - 14)), min(image.height, int(boundary + 10))),
            (max(0, int(boundary + 15)), min(image.height, int(likely_rows[1].y2 + 48))),
        )
        for scan_row, (top, bottom) in zip(likely_rows, bounds):
            for threshold in (160, None):
                isolated = _preprocess_text_image(
                    image.crop((20, top, image.width - 10, bottom)),
                    scale=6, threshold=threshold,
                )
                text = clean_mrz_line(_ocr_to_text(
                    isolated, config=f"--psm 6 {MRZ_WHITELIST_CONFIG}",
                ))
                if len(text) >= 12:
                    rows.append(_MRZRow(
                        text=text, x=scan_row.x, y=scan_row.y, x2=scan_row.x2,
                        y2=scan_row.y2, source=f"targeted-pair-{threshold}",
                    ))
    for threshold in (None, 160):
        prepared = _preprocess_text_image(crop, scale=MRZ_UPSCALE_FACTOR, threshold=threshold)
        data = _ocr_to_data(prepared, config=f"--psm 6 {MRZ_WHITELIST_CONFIG}")
        rows.extend(_rows_from_ocr_data(
            data, source_scale=MRZ_UPSCALE_FACTOR, y_offset=crop_top,
            source=f"crop-psm6-{threshold}",
        ))
    return rows


def _collect_mrz_lines(
    image: Image.Image,
    document_code_prefix: str,
    crop_top_ratio: float,
) -> list[str]:
    """Compatibility wrapper returning reconstructed visual-row text."""
    rows = _collect_mrz_rows(image, document_code_prefix, crop_top_ratio)
    return sorted({row.text for row in rows}, key=lambda value: _mrz_score(value, document_code_prefix), reverse=True)


def _candidate_pairs(
    candidates: list[str],
    prefix: str,
) -> list[tuple[str, str]]:
    """
    Build line-1/line-2 pair candidates from OCR results.

    Compatibility helper for callers that only have text candidates.  Public
    extraction uses `_rank_mrz_pairs`, which additionally requires spatial
    evidence.  This helper intentionally performs no prefix coercion.
    """

    line1_candidates: list[str] = []

    for candidate in candidates:
        if len(candidate) != 44:
            continue

        normalized = normalize_mrz_line1(candidate)

        if len(normalized) == 44 and normalized.startswith(prefix):
            line1_candidates.append(normalized)

    # Only accept exact 44-character candidates for line 2. We do not pad
    # or fabricate characters. This keeps TD3 validation strict.
    line2_candidates = [candidate for candidate in candidates if len(candidate) == 44]

    pairs: list[tuple[str, str]] = []

    for line1 in line1_candidates:
        for line2 in line2_candidates:
            if validate_mrz_line2(line2) or validate_mrv_line2(line2):
                pairs.append((line1, line2))

    return pairs


def _line1_from_row(
    row: _MRZRow,
    prefix: str,
    line2_is_valid: bool,
    row_gap: float,
) -> Optional[str]:
    """Validate a line-1 row and apply only evidence-backed tail cleanup."""
    candidate = clean_mrz_line(row.text)
    if len(candidate) != 44 or "<<" not in candidate[5:]:
        return None

    if candidate.startswith(prefix):
        normalized = normalize_mrz_line1(candidate)
    elif (
        # Some visa OCR configurations read the mandatory '<' as N.  This is
        # accepted only in a fully corroborated MRV pair: expected issuing
        # code, name separator, close aligned row, and checksum-valid line 2.
        # It is deliberately not a generic "V -> V<" rewrite.
        prefix == "V<"
        and candidate.startswith("VN")
        and candidate[2:5].isalpha()
        and line2_is_valid
        and row_gap <= 120
    ):
        normalized = "V<" + candidate[2:]
        normalized = normalize_mrz_line1(normalized)
    else:
        return None

    if not normalized.startswith(prefix) or len(normalized) != 44:
        return None
    return normalized


def _rank_mrz_pairs(
    rows: list[_MRZRow],
    prefix: str,
    line2_validator,
    line2_corrector,
) -> list[tuple[float, str, str]]:
    """Return validated, spatially coherent MRZ pairs ordered by confidence."""
    pairs: list[tuple[float, str, str]] = []
    for first in rows:
        for second in rows:
            if second.y <= first.y:
                continue
            row_gap = second.y - first.y
            if not 12 <= row_gap <= 120:
                continue
            if abs(first.x - second.x) > 80:
                continue

            raw_line2 = clean_mrz_line(second.text)
            if len(raw_line2) != 44:
                continue
            corrected_line2 = line2_corrector(raw_line2)
            if not line2_validator(corrected_line2):
                continue
            line1 = _line1_from_row(first, prefix, True, row_gap)
            if line1 is None:
                continue

            score = (
                400.0
                + _mrz_score(line1, prefix)
                + _mrz_score(corrected_line2, prefix)
                + max(0.0, 80.0 - abs(first.x - second.x))
                + max(0.0, 80.0 - row_gap)
            )
            pairs.append((score, line1, corrected_line2))
    return sorted(pairs, key=lambda item: item[0], reverse=True)


def _extract_valid_mrz_pair(
    page: Image.Image,
    prefix: str,
    line2_validator,
    line2_corrector,
) -> Optional[tuple[str, str]]:
    rows = _collect_mrz_rows(page, prefix)
    pairs = _rank_mrz_pairs(rows, prefix, line2_validator, line2_corrector)
    return (pairs[0][1], pairs[0][2]) if pairs else None

# ============================================================================
# MRZ OCR REGION COMPATIBILITY HELPER
# ============================================================================

def _ocr_mrz_region(
    image: Image.Image,
    top_ratio: float,
    prefix: str,
) -> tuple[list[str], list[str]]:
    """
    Compatibility helper retained for the existing tests/debug scripts.

    Returns:
        (line1_candidates, line2_candidates)
    """
    candidates = _collect_mrz_lines(
        image=image,
        document_code_prefix=prefix,
        crop_top_ratio=top_ratio,
    )

    line1 = [
        candidate
        for candidate in candidates
        if len(candidate) == 44 and candidate.startswith(prefix)
    ]

    line2 = [
        candidate
        for candidate in candidates
        if len(candidate) == 44
    ]

    return line1, line2


# ============================================================================
# PUBLIC PASSPORT MRZ EXTRACTION
# ============================================================================

def extract_mrz_from_image(file_path: str | Path) -> list[str]:
    """
    Extract a complete passport TD3 MRZ.

    Returns:
        [line1, line2] only when two complete 44-character candidates can be
        identified.

    Otherwise:
        []
    """
    pages = _load_document_pages(file_path)

    # First, try the spatially coherent pair extractor (most reliable).
    for page in pages:
        pair = _extract_valid_mrz_pair(
            page, "P<", validate_mrz_line2, correct_mrz_line2,
        )
        if pair:
            return list(pair)

    # Fallback: try a text-candidate based approach across pages. This is
    # looser and only used when the spatial extractor fails.
    best_pair: Optional[tuple[str, str]] = None
    best_score = -1.0

    for page in pages:
        candidates = _collect_mrz_lines(
            image=page,
            document_code_prefix="P<",
            crop_top_ratio=0.55,
        )

        pairs = _candidate_pairs(candidates, prefix="P<")

        for line1, line2 in pairs:
            normalized_line1 = normalize_mrz_line1(line1)
            corrected_line2 = correct_mrz_line2(line2)

            if (
                len(normalized_line1) != 44
                or len(corrected_line2) != 44
            ):
                continue

            # A 44-character shape alone is not reliable enough to expose as
            # a passport MRZ. All TD3 check digits must agree after at most
            # the explicitly allowed one-character corrections above.
            if not validate_mrz_line2(corrected_line2):
                continue

            score = _mrz_score(normalized_line1, "P<")
            score += 200

            if score > best_score:
                best_score = score
                best_pair = (
                    normalized_line1,
                    corrected_line2,
                )

    if best_pair:
        return list(best_pair)

    # Final bounded OCR pass. We do not keep expanding the search space after
    # the current state has already failed strict validation. The goal is to
    # fail fast with a clear structured error instead of hanging on unbounded
    # preprocessing variants.
    crop_top_candidates = (0.55, 0.60)
    rotation_candidates = (0, 2, -2)
    max_attempts = 24
    attempts = 0

    for page in pages:
        w, h = page.size
        for crop_top_ratio in crop_top_candidates:
            try:
                crop = page.crop((0, int(h * crop_top_ratio), w, h))
            except Exception:
                continue

            for rotation in rotation_candidates:
                try:
                    if rotation != 0:
                        rotated = crop.rotate(rotation, resample=Image.BICUBIC, expand=False)
                    else:
                        rotated = crop
                except Exception:
                    rotated = crop

                for psm in MRZ_PSM_MODES:
                    for thresh in (None, 160):
                        try:
                            base_prep = _preprocess_text_image(rotated, scale=MRZ_UPSCALE_FACTOR, threshold=thresh)
                        except Exception:
                            continue

                        attempts += 1
                        if attempts > max_attempts:
                            return []

                        try:
                            ocrb_path = LOCAL_TESSDATA_DIR / "ocrb.traineddata"
                            if ocrb_path.exists():
                                ocr_config = f"--tessdata-dir {str(LOCAL_TESSDATA_DIR)} --psm {psm} {MRZ_WHITELIST_CONFIG}"
                                text = _ocr_to_text(base_prep, config=ocr_config, lang="ocrb")
                            else:
                                text = _ocr_to_text(base_prep, config=f"--psm {psm} {MRZ_WHITELIST_CONFIG}")
                        except Exception:
                            continue

                        lines = [clean_mrz_line(l) for l in text.splitlines() if l.strip()]
                        for i in range(len(lines) - 1):
                            l1, l2 = lines[i], lines[i + 1]
                            if len(l1) == 44 and len(l2) == 44:
                                corrected = correct_mrz_line2(l2)
                                if validate_mrz_line2(corrected):
                                    return [normalize_mrz_line1(l1), corrected]

    return []

    best_pair: Optional[tuple[str, str]] = None
    best_score = -1.0

    for page in pages:
        candidates = _collect_mrz_lines(
            image=page,
            document_code_prefix="P<",
            crop_top_ratio=0.55,
        )

        pairs = _candidate_pairs(candidates, prefix="P<")

        for line1, line2 in pairs:
            normalized_line1 = normalize_mrz_line1(line1)
            corrected_line2 = correct_mrz_line2(line2)

            if (
                len(normalized_line1) != 44
                or len(corrected_line2) != 44
            ):
                continue

            # A 44-character shape alone is not reliable enough to expose as
            # a passport MRZ. All TD3 check digits must agree after at most
            # the explicitly allowed one-character corrections above.
            if not validate_mrz_line2(corrected_line2):
                continue

            score = _mrz_score(normalized_line1, "P<")
            score += 200

            if score > best_score:
                best_score = score
                best_pair = (
                    normalized_line1,
                    corrected_line2,
                )

    return list(best_pair) if best_pair else []


# ============================================================================
# PUBLIC VISA MRZ EXTRACTION
# ============================================================================

def extract_mrz_from_visa_image(file_path: str | Path) -> list[str]:
    """
    Extract a complete MRV-A visa MRZ when present.

    The visa parser can also use normal OCR/layout OCR for visas that do not
    contain a machine-readable zone.
    """
    pages = _load_document_pages(file_path)
    for page in pages:
        pair = _extract_valid_mrz_pair(
            page, "V<", validate_mrv_line2, correct_mrv_line2,
        )
        if pair:
            return list(pair)
    return []

    best_pair: Optional[tuple[str, str]] = None
    best_score = -1.0

    for page in pages:
        candidates = _collect_mrz_lines(
            image=page,
            document_code_prefix="V<",
            crop_top_ratio=0.70,
        )

        pairs = _candidate_pairs(candidates, prefix="V<")

        for line1, line2 in pairs:
            normalized_line1 = normalize_mrz_line1(line1)
            corrected_line2 = correct_mrv_line2(line2)

            if (
                len(normalized_line1) != 44
                or len(corrected_line2) != 44
            ):
                continue

            # US visa MRV-A documents have three field-level check digits.
            # Do not return a merely plausible pair when they do not verify.
            if not validate_mrv_line2(corrected_line2):
                continue

            score = _mrz_score(normalized_line1, "V<")
            score += 200

            if score > best_score:
                best_score = score
                best_pair = (
                    normalized_line1,
                    corrected_line2,
                )

    return list(best_pair) if best_pair else []


# ============================================================================
# OPTIONAL DEBUG HELPER
# ============================================================================

def inspect_ocr_layout(file_path: str | Path) -> dict:
    """
    Convenient debug payload for developers.

    This does not parse any document fields. It exposes the general OCR text
    plus the word geometry that document-specific parsers can consume.
    """
    return {
        "text": extract_text(file_path),
        "layout": extract_layout_data(file_path),
    }


def inspect_mrz_candidates(file_path: str | Path, *, visa: bool = False) -> dict:
    """Developer-only MRZ diagnostics; this is not used by API routes."""
    prefix = "V<" if visa else "P<"
    validator = validate_mrv_line2 if visa else validate_mrz_line2
    corrector = correct_mrv_line2 if visa else correct_mrz_line2
    pages = _load_document_pages(file_path)
    if not pages:
        return {"rows": [], "pairs": [], "selected": []}
    rows = _collect_mrz_rows(pages[0], prefix)
    pairs = _rank_mrz_pairs(rows, prefix, validator, corrector)
    return {
        "rows": [
            {"text": row.text, "x": row.x, "y": row.y, "source": row.source}
            for row in rows
        ],
        "pairs": [
            {"score": score, "line1": line1, "line2": line2}
            for score, line1, line2 in pairs
        ],
        "selected": list(pairs[0][1:]) if pairs else [],
    }
