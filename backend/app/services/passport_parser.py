
from datetime import datetime


# =========================================================
# TD3 MRZ LAYOUT REFERENCE (both lines are 44 characters)
#
# LINE 1:
#   0        document code (e.g. 'P')
#   1        document subtype (often '<' if unused)
#   2-4      issuing country (3 letters)
#   5-43     name field: SURNAME<<GIVEN<NAMES<<<<<<<<<<<<<
#
# LINE 2:
#   0-8      passport/document number (9 chars)
#   9        passport number check digit
#   10-12    nationality (3 letters)
#   13-18    date of birth, YYMMDD
#   19       date of birth check digit
#   20       sex (M / F / <)
#   21-26    date of expiry, YYMMDD
#   27       date of expiry check digit
#   28-41    optional / personal number (14 chars)
#   42       optional data check digit
#   43       composite (final) check digit
# =========================================================

MRZ_LINE_LENGTH = 44
MRZ_ALLOWED_CHARS = frozenset("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<")
MRZ_WEIGHTS = (7, 3, 1)


# =========================================================
# PUBLIC ENTRY POINTS
# =========================================================

def parse_passport(file_path: str) -> dict:
    """
    Extract and parse a passport TD3 MRZ from a document file.

    OCR is deliberately kept outside this parser. The OCR service owns image
    handling and conservative MRZ extraction; this module only validates and
    parses the two returned MRZ lines.
    """
    from app.services.ocr_service import extract_mrz_from_image

    mrz_lines = extract_mrz_from_image(file_path)
    if not isinstance(mrz_lines, list) or len(mrz_lines) != 2:
        raise ValueError(
            "Passport OCR did not return exactly two TD3 MRZ lines; "
            f"received {mrz_lines!r}."
        )

    return parse_passport_mrz(mrz_lines)


def parse_passport_mrz(mrz_lines: list[str]) -> dict:
    """
    Parse two TD3 MRZ lines into a structured identity dictionary.

    Parameters
    ----------
    mrz_lines : list[str]
        Exactly two 44-character MRZ strings, e.g.
        [
            "P<INDPATWARI<<DIVYA<MAHESH<<<<<<<<<<<<<<<<<<",
            "J0189638<8IND0708030M1503140<<<<<<<<<<<<<<4"
        ]

    Returns
    -------
    dict
        Structured identity data. See module docstring / spec for
        the exact shape.

    Raises
    ------
    ValueError
        If the input does not structurally match a TD3 passport MRZ.
        This function never silently produces corrupted identity data.
    """

    from app.services.ocr_service import normalize_mrz_line1, normalize_mrz_ocr_confusions

    _validate_mrz_lines(mrz_lines)

    raw_line1, raw_line2 = mrz_lines
    line1 = normalize_mrz_line1(raw_line1)
    line2 = normalize_mrz_ocr_confusions(raw_line2)

    line1_data = parse_mrz_line1(line1)
    line2_data = parse_mrz_line2(line2)

    identity = {
        "document_type": "PASSPORT",
        "document_code": line1_data["document_code"],
        "document_subtype": line1_data["document_subtype"],
        "issuing_country": line1_data["issuing_country"],

        "surname": line1_data["surname"],
        "given_names": line1_data["given_names"],
        "full_name": line1_data["full_name"],

        "passport_number": line2_data["passport_number"],
        "nationality": line2_data["nationality"],

        "date_of_birth": line2_data["date_of_birth"],
        "gender": line2_data["gender"],
        "expiry_date": line2_data["expiry_date"],

        "optional_data": line2_data["optional_data"],

        "mrz": {
            "line1": line1,
            "line2": line2,
            "raw_line1": raw_line1,
            "raw_line2": raw_line2,
            "normalized_line1": line1,
            "normalized_line2": line2,
            "passport_number_check_digit": line2_data["passport_number_check_digit"],
            "date_of_birth_check_digit": line2_data["date_of_birth_check_digit"],
            "expiry_date_check_digit": line2_data["expiry_date_check_digit"],
            "optional_data_check_digit": line2_data["optional_data_check_digit"],
            "composite_check_digit": line2_data["composite_check_digit"],
        },
    }

    return identity


def validate_passport_mrz(mrz_lines: list[str]) -> bool:
    """Return ``True`` only for a structurally and checksum-valid TD3 MRZ."""
    try:
        _validate_mrz_lines(mrz_lines)
        # Checksum-valid YYMMDD values can still be impossible calendar dates.
        parse_mrz_date(mrz_lines[1][13:19])
        parse_mrz_date(mrz_lines[1][21:27])
    except (TypeError, ValueError):
        return False
    return True


# =========================================================
# INPUT VALIDATION
# =========================================================

def _validate_mrz_lines(mrz_lines: list[str]) -> None:
    """
    Validate the overall shape of the MRZ input before any parsing
    is attempted. Raises ValueError with a specific reason on failure.
    """

    if not isinstance(mrz_lines, list) or len(mrz_lines) != 2:
        raise ValueError(
            "Expected exactly two MRZ lines, got: "
            f"{mrz_lines!r}"
        )

    line1, line2 = mrz_lines

    if not isinstance(line1, str) or not isinstance(line2, str):
        raise ValueError(
            "Both MRZ lines must be strings."
        )

    if len(line1) != MRZ_LINE_LENGTH:
        raise ValueError(
            f"MRZ line 1 must be {MRZ_LINE_LENGTH} characters, "
            f"got {len(line1)}: {line1!r}"
        )

    if len(line2) != MRZ_LINE_LENGTH:
        raise ValueError(
            f"MRZ line 2 must be {MRZ_LINE_LENGTH} characters, "
            f"got {len(line2)}: {line2!r}"
        )

    for line_number, line in enumerate((line1, line2), start=1):
        invalid_characters = sorted(set(line) - MRZ_ALLOWED_CHARS)
        if invalid_characters:
            raise ValueError(
                f"MRZ line {line_number} contains invalid character(s): "
                f"{''.join(invalid_characters)!r}"
            )

    if not line1.startswith("P"):
        raise ValueError(
            "MRZ line 1 does not start with 'P' -- this parser only "
            f"supports TD3 passports. Got: {line1!r}"
        )

    if "<<" not in line1:
        raise ValueError(
            "MRZ line 1 does not contain the surname/given-name "
            f"separator '<<'. Got: {line1!r}"
        )

    if line2[20] not in {"M", "F", "<"}:
        raise ValueError(
            "Invalid MRZ gender character; expected 'M', 'F', or '<', "
            f"got {line2[20]!r}."
        )

    _validate_td3_check_digits(line2)


def _mrz_character_value(character: str) -> int:
    """Return the ICAO MRZ value for one already-validated character."""
    if character == "<":
        return 0
    if "0" <= character <= "9":
        return ord(character) - ord("0")
    return ord(character) - ord("A") + 10


def _mrz_check_digit(field: str) -> str:
    """Calculate the ICAO 7-3-1 check digit for an MRZ field."""
    total = sum(
        _mrz_character_value(character) * MRZ_WEIGHTS[index % 3]
        for index, character in enumerate(field)
    )
    return str(total % 10)


def _validate_td3_check_digits(line2: str) -> None:
    """Validate every required TD3 line-2 check digit without correction."""
    checks = (
        ("passport number", line2[0:9], line2[9]),
        ("date of birth", line2[13:19], line2[19]),
        ("expiry date", line2[21:27], line2[27]),
        ("optional data", line2[28:42], line2[42]),
    )

    for label, field, supplied_digit in checks:
        if not supplied_digit.isdigit():
            raise ValueError(f"{label.title()} check digit is not numeric.")
        expected_digit = _mrz_check_digit(field)
        if supplied_digit != expected_digit:
            raise ValueError(
                f"Invalid {label} check digit: expected {expected_digit!r}, "
                f"got {supplied_digit!r}."
            )

    composite_field = line2[0:10] + line2[13:20] + line2[21:43]
    supplied_composite = line2[43]
    if not supplied_composite.isdigit():
        raise ValueError("Composite check digit is not numeric.")

    expected_composite = _mrz_check_digit(composite_field)
    if supplied_composite != expected_composite:
        raise ValueError(
            f"Invalid composite check digit: expected {expected_composite!r}, "
            f"got {supplied_composite!r}."
        )


# =========================================================
# LINE 1 PARSING
# =========================================================

def parse_mrz_line1(line1: str) -> dict:
    """
    Parse TD3 MRZ line 1: document type, issuing country, and name.
    """

    document_code = line1[0]
    document_subtype = line1[1]
    issuing_country = line1[2:5]

    name_field = line1[5:44]

    surname, given_names, full_name = parse_mrz_name(name_field)

    return {
        "document_code": document_code,
        "document_subtype": document_subtype,
        "issuing_country": issuing_country,
        "surname": surname,
        "given_names": given_names,
        "full_name": full_name,
    }


# =========================================================
# NAME PARSING
# =========================================================

def parse_mrz_name(name_field: str) -> tuple[str, str, str]:
    """
    Parse the TD3 name field.

    Format: SURNAME<<GIVEN<NAMES<<<<<<<<<<<<<<<<<<<<<<<<<<

    - '<<' separates surname from given names
    - single '<' separates individual given names
    - trailing '<' characters are padding and are discarded

    Example:
        "PATWARI<<DIVYA<MAHESH<<<<<<<<<<<<<<<<<<"
    becomes:
        surname      = "PATWARI"
        given_names  = "DIVYA MAHESH"
        full_name    = "DIVYA MAHESH PATWARI"
    """

    # Strip trailing padding first so it doesn't create an
    # empty trailing given-name token.
    trimmed = name_field.rstrip("<")

    if "<<" in trimmed:
        surname_part, given_part = trimmed.split("<<", 1)
    else:
        # No given names present -- surname only.
        surname_part, given_part = trimmed, ""

    surname = surname_part.replace("<", " ").strip()

    given_names = " ".join(
        token
        for token in given_part.split("<")
        if token
    )

    full_name_parts = [
        part for part in (given_names, surname) if part
    ]
    full_name = " ".join(full_name_parts)

    return surname, given_names, full_name


# =========================================================
# LINE 2 PARSING
# =========================================================

def parse_mrz_line2(line2: str) -> dict:
    """
    Parse TD3 MRZ line 2: passport number, nationality, dates,
    sex, optional data, and all check digits.
    """

    passport_number_raw = line2[0:9]
    passport_number_check_digit = line2[9]

    nationality = line2[10:13]

    dob_raw = line2[13:19]
    dob_check_digit = line2[19]

    sex_raw = line2[20]

    expiry_raw = line2[21:27]
    expiry_check_digit = line2[27]

    optional_data_raw = line2[28:42]
    optional_data_check_digit = line2[42]

    composite_check_digit = line2[43]

    # Passport-number filler is permitted only at the end of its fixed-width
    # field. Do not erase an interior character or apply OCR corrections.
    passport_number = passport_number_raw.rstrip("<")
    optional_data = _strip_filler(optional_data_raw)

    date_of_birth = parse_mrz_date(dob_raw)
    expiry_date = parse_mrz_date(expiry_raw)

    gender = parse_mrz_gender(sex_raw)

    return {
        "passport_number": passport_number,
        "passport_number_check_digit": passport_number_check_digit,

        "nationality": nationality,

        "date_of_birth": date_of_birth,
        "date_of_birth_check_digit": dob_check_digit,

        "gender": gender,

        "expiry_date": expiry_date,
        "expiry_date_check_digit": expiry_check_digit,

        "optional_data": optional_data,
        "optional_data_check_digit": optional_data_check_digit,

        "composite_check_digit": composite_check_digit,
    }


def _strip_filler(field: str) -> str:
    """
    Remove MRZ filler characters from a human-readable optional field.
    Never alters letters or digits -- OCR correction is
    ocr_service.py's responsibility, not this module's.
    """

    return field.replace("<", "")


# =========================================================
# GENDER PARSING
# =========================================================

def parse_mrz_gender(sex_char: str) -> str:
    """
    Convert the single-character MRZ sex field into a
    human-readable value.
    """

    mapping = {
        "M": "Male",
        "F": "Female",
        "<": "Unspecified",
    }

    if sex_char not in mapping:
        raise ValueError(
            "Invalid MRZ gender character; expected 'M', 'F', or '<', "
            f"got {sex_char!r}."
        )

    return mapping[sex_char]


# =========================================================
# DATE PARSING
# =========================================================

def parse_mrz_date(yymmdd: str, current_year: int = None) -> str:
    """
    Convert an MRZ YYMMDD date into DD/MM/YYYY format.

    MRZ dates only store a two-digit year. This parser deliberately uses
    one deterministic rule for both birth and expiry dates:

        00-49 -> 2000-2049
        50-99 -> 1950-1999

    ``current_year`` is retained only for backwards-compatible callers; it
    is intentionally ignored so parsing never changes with wall-clock time.

    Raises
    ------
    ValueError
        If the field is not 6 digits or does not represent a
        real calendar date.
    """

    if len(yymmdd) != 6 or not yymmdd.isdigit():
        raise ValueError(
            f"Invalid MRZ date field, expected 6 digits: {yymmdd!r}"
        )

    yy = int(yymmdd[0:2])
    mm = int(yymmdd[2:4])
    dd = int(yymmdd[4:6])

    century = 2000 if yy <= 49 else 1900
    year = century + yy

    try:
        parsed_date = datetime(year=year, month=mm, day=dd)
    except ValueError as error:
        raise ValueError(
            f"MRZ date field {yymmdd!r} is not a valid calendar date: {error}"
        )

    return parsed_date.strftime("%d/%m/%Y")
