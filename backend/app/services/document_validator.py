from datetime import datetime

from app.services.ocr_service import mrz_check_digit
from app.services.passport_parser import parse_mrz_date, parse_mrz_gender


# =========================================================
# CONSTANTS
# =========================================================

REQUIRED_FIELDS = [
    "full_name",
    "passport_number",
    "nationality",
    "date_of_birth",
    "gender",
    "expiry_date",
]

# Core fields a VISA record must have to be considered structurally
# usable. visa_type, date_of_birth, issue_date, entries,
# stay_duration, and issuing_country are still checked when present,
# but a missing value there produces a warning, not an error -- real
# visa OCR frequently misses one of those without the document being
# unusable.
REQUIRED_FIELDS_VISA = [
    "visa_number",
    "holder_name",
    "passport_number",
    "nationality",
    "expiry_date",
]

# Core fields an AADHAAR record must have. date_of_birth and
# year_of_birth are handled separately as an either/or requirement
# (see validate_aadhaar_dob_or_yob) rather than listed here. vid and
# address are intentionally never required -- see
# _validate_aadhaar_document.
REQUIRED_FIELDS_AADHAAR = [
    "name",
    "aadhaar_number",
    "gender",
]

# "Transgender" added for Aadhaar -- passport's MRZ sex field can
# only ever produce Male/Female/Unspecified, so this is additive and
# does not change passport validation behavior.
VALID_GENDER_VALUES = {"Male", "Female", "Unspecified", "Transgender"}

DATE_FORMAT = "%d/%m/%Y"


# =========================================================
# TOP-LEVEL ENTRY POINT
# =========================================================

def validate_document(identity: dict) -> dict:
    """
    Route to the appropriate validation logic based on
    identity["document_type"], and return a result in the same
    shape regardless of document type:

        {
            "status": "VALID" | "INVALID",
            "validation_score": int (0-100),
            "expiry_status": "ACTIVE" | "EXPIRED" | "UNKNOWN",
            "errors": [...],
            "warnings": [...],
            "checks": {...},   # keys differ per document type
        }
    """

    document_type = (identity.get("document_type") or "").upper()

    if document_type == "VISA":
        return _validate_visa_document(identity)

    if document_type == "AADHAAR":
        return _validate_aadhaar_document(identity)

    if document_type == "PASSPORT" or not document_type:
        # Missing document_type falls back to passport behavior for
        # backward compatibility -- passport_parser.py always sets
        # it, so this only matters for callers built before this
        # routing existed.
        return _validate_passport_document(identity)

    return {
        "status": "INVALID",
        "validation_score": 0,
        "expiry_status": "UNKNOWN",
        "errors": [f"Unsupported document_type: {identity.get('document_type')!r}"],
        "warnings": [],
        "checks": {},
    }


# =========================================================
# PASSPORT VALIDATION
# (unchanged logic -- only renamed from validate_document)
# =========================================================

def _validate_passport_document(identity: dict) -> dict:
    """
    Run all document validation checks against parsed passport
    identity data.

    Parameters
    ----------
    identity : dict
        The structured output of identity_parser.parse_passport_mrz().

    Returns
    -------
    dict
        {
            "status": "VALID" | "INVALID",
            "validation_score": int (0-100),
            "expiry_status": "ACTIVE" | "EXPIRED" | "UNKNOWN",
            "errors": [...],
            "warnings": [...],
            "checks": {
                "required_fields": bool,
                "passport_number": bool,
                "nationality": bool,
                "dates": bool,
                "gender": bool,
                "mrz_checksums": bool,
                "consistency": bool,
            }
        }
    """

    errors = []
    warnings = []

    # -----------------------------------------------------
    # 1. Required fields
    # -----------------------------------------------------

    try:
        required_ok, missing_fields = validate_required_fields(identity)
        if not required_ok:
            errors.append(
                "Missing required field(s): " + ", ".join(missing_fields)
            )
    except Exception as error:
        required_ok = False
        errors.append(f"Required field check failed unexpectedly: {error}")

    # -----------------------------------------------------
    # 2. Passport number format
    # -----------------------------------------------------

    try:
        passport_ok, passport_errors = validate_passport_number(
            identity.get("passport_number", "")
        )
        errors.extend(passport_errors)
    except Exception as error:
        passport_ok = False
        errors.append(f"Passport number check failed unexpectedly: {error}")

    # -----------------------------------------------------
    # 3. Nationality / issuing country codes
    # -----------------------------------------------------

    try:
        nationality_ok, nationality_errors = validate_nationality_country_code(
            identity
        )
        errors.extend(nationality_errors)
    except Exception as error:
        nationality_ok = False
        errors.append(f"Nationality/country code check failed unexpectedly: {error}")

    # -----------------------------------------------------
    # 4. Gender
    # -----------------------------------------------------

    try:
        gender_ok, gender_errors = validate_gender(
            identity.get("gender", "")
        )
        errors.extend(gender_errors)
    except Exception as error:
        gender_ok = False
        errors.append(f"Gender check failed unexpectedly: {error}")

    # -----------------------------------------------------
    # 5. Dates + expiry status
    # -----------------------------------------------------

    try:
        dates_ok, expiry_status, date_errors, date_warnings = validate_dates(
            identity.get("date_of_birth", ""),
            identity.get("expiry_date", ""),
        )
        errors.extend(date_errors)
        warnings.extend(date_warnings)
    except Exception as error:
        dates_ok = False
        expiry_status = "UNKNOWN"
        errors.append(f"Date validation failed unexpectedly: {error}")

    # -----------------------------------------------------
    # 6. MRZ checksums
    # -----------------------------------------------------

    try:
        checksum_ok, checksum_errors = validate_mrz_checksums(
            identity.get("mrz", {})
        )
        errors.extend(checksum_errors)
    except Exception as error:
        checksum_ok = False
        errors.append(f"MRZ checksum validation failed unexpectedly: {error}")

    # -----------------------------------------------------
    # 7. Consistency between parsed fields and raw MRZ
    # -----------------------------------------------------

    try:
        consistency_ok, consistency_errors = validate_consistency(identity)
        errors.extend(consistency_errors)
    except Exception as error:
        consistency_ok = False
        errors.append(f"Consistency check failed unexpectedly: {error}")

    # -----------------------------------------------------
    # Assemble result
    # -----------------------------------------------------

    checks = {
        "required_fields": required_ok,
        "passport_number": passport_ok,
        "nationality": nationality_ok,
        "dates": dates_ok,
        "gender": gender_ok,
        "mrz_checksums": checksum_ok,
        "consistency": consistency_ok,
    }

    validation_score = calculate_validation_score(checks)

    status = "VALID" if len(errors) == 0 else "INVALID"

    return {
        "status": status,
        "validation_score": validation_score,
        "expiry_status": expiry_status,
        "errors": errors,
        "warnings": warnings,
        "checks": checks,
    }


# =========================================================
# VISA VALIDATION
# =========================================================

def _validate_visa_document(identity: dict) -> dict:
    """
    Run document validation checks against parsed VISA identity
    data (the structured output of visa_parser.parse_visa()).

    No MRZ/consistency checks -- visas in this pipeline aren't
    parsed from MRZ data.
    """

    errors = []
    warnings = []

    # ---- 1. Required fields ----

    missing_fields = [
        field
        for field in REQUIRED_FIELDS_VISA
        if not identity.get(field)
    ]
    required_ok = len(missing_fields) == 0
    if not required_ok:
        errors.append(
            "Missing required field(s): " + ", ".join(missing_fields)
        )

    # ---- 2. Visa number ----

    visa_number = identity.get("visa_number")
    visa_number_ok = bool(visa_number)
    if not visa_number_ok:
        errors.append("Visa number is empty.")

    # ---- 3. Holder name ----

    holder_name = identity.get("holder_name")
    holder_name_ok = bool(holder_name)
    if not holder_name_ok:
        errors.append("Holder name is empty.")

    # ---- 4. Passport number (reuses the passport validator --
    #         same field shape) ----

    try:
        passport_ok, passport_errors = validate_passport_number(
            identity.get("passport_number", "")
        )
        errors.extend(passport_errors)
    except Exception as error:
        passport_ok = False
        errors.append(f"Passport number check failed unexpectedly: {error}")

    # ---- 5. Nationality ----

    try:
        nationality_ok, nationality_errors = validate_visa_nationality(
            identity.get("nationality")
        )
        errors.extend(nationality_errors)
    except Exception as error:
        nationality_ok = False
        errors.append(f"Nationality check failed unexpectedly: {error}")

    # ---- 6. Dates: DOB (optional), issue date (optional),
    #         expiry date (required), reusing validate_dates() for
    #         the DOB/expiry ordering + expiry-status logic ----

    try:
        dates_ok, expiry_status, date_errors, date_warnings = validate_visa_dates(
            identity.get("date_of_birth"),
            identity.get("issue_date"),
            identity.get("expiry_date", ""),
        )
        errors.extend(date_errors)
        warnings.extend(date_warnings)
    except Exception as error:
        dates_ok = False
        expiry_status = "UNKNOWN"
        errors.append(f"Date validation failed unexpectedly: {error}")

    # ---- 7. Issuing country (checked if present, not required --
    #         visa OCR frequently misses this field) ----

    issuing_country = identity.get("issuing_country")
    issuing_country_ok = bool(issuing_country)
    if not issuing_country_ok:
        warnings.append("Issuing country could not be determined.")

    # ---- Optional-but-checked fields: visa_type, entries,
    #      stay_duration. Missing -> warning only, never an error. ----

    for field_name, label in (
        ("visa_type", "Visa type"),
        ("entries", "Entries"),
        ("stay_duration", "Stay duration"),
    ):
        if not identity.get(field_name):
            warnings.append(f"{label} could not be determined.")

    checks = {
        "required_fields": required_ok,
        "visa_number": visa_number_ok,
        "holder_name": holder_name_ok,
        "passport_number": passport_ok,
        "nationality": nationality_ok,
        "dates": dates_ok,
        "issuing_country": issuing_country_ok,
    }

    validation_score = calculate_validation_score(checks)
    status = "VALID" if len(errors) == 0 else "INVALID"

    return {
        "status": status,
        "validation_score": validation_score,
        "expiry_status": expiry_status,
        "errors": errors,
        "warnings": warnings,
        "checks": checks,
    }


def validate_visa_nationality(nationality) -> tuple[bool, list[str]]:
    """
    Lenient nationality check for visas. Visa nationality is often
    an ICAO 3-letter code (like a passport's), but unlike
    validate_nationality_country_code() this does not also demand
    issuing_country be a code -- visa_parser's issuing_country is a
    free-form country name (e.g. "United States Of America"), not a
    code, so that stricter dual-field check does not apply here.
    """

    if not nationality:
        return False, ["Nationality is empty."]

    if not (2 <= len(nationality) <= 40) or not all(
        char.isalpha() or char.isspace() for char in nationality
    ):
        return False, [f"Nationality does not look like a valid value: {nationality!r}"]

    return True, []


def validate_visa_dates(
    date_of_birth,
    issue_date,
    expiry_date: str,
) -> tuple[bool, str, list[str], list[str]]:
    """
    Validate visa dates. Reuses validate_dates() for the DOB/expiry
    ordering and expiry-status logic (identical rules to passports),
    then layers on an issue_date check, since visas have a field
    passports don't.

    date_of_birth and issue_date are both optional on a visa --
    missing either produces a warning, not an error. expiry_date is
    required (enforced separately, in REQUIRED_FIELDS_VISA).
    """

    errors = []
    warnings = []

    # DOB is optional for visas -- validate_dates() requires a
    # DOB string, so substitute a value that will cleanly fail
    # parsing (producing a warning here, not fed into date-ordering
    # errors) when DOB is absent.
    if date_of_birth:
        dates_ok, expiry_status, dob_expiry_errors, dob_expiry_warnings = validate_dates(
            date_of_birth, expiry_date
        )
        errors.extend(dob_expiry_errors)
        warnings.extend(dob_expiry_warnings)
    else:
        warnings.append("Date of birth could not be determined.")
        # Still need an expiry_status even without a DOB to compare
        # against -- resolve it directly.
        try:
            expiry_date_parsed = datetime.strptime(expiry_date, DATE_FORMAT)
            today = datetime.now()
            if expiry_date_parsed >= today:
                expiry_status = "ACTIVE"
            else:
                expiry_status = "EXPIRED"
                warnings.append(
                    f"Visa expired on {expiry_date}. This is a warning, "
                    "not proof of forgery -- flag for officer review."
                )
            dates_ok = True
        except (ValueError, TypeError):
            expiry_status = "UNKNOWN"
            dates_ok = False
            errors.append(f"Expiry date is not a valid date: {expiry_date!r}")

    if issue_date:
        try:
            issue_date_parsed = datetime.strptime(issue_date, DATE_FORMAT)
            try:
                expiry_date_parsed = datetime.strptime(expiry_date, DATE_FORMAT)
                if issue_date_parsed > expiry_date_parsed:
                    dates_ok = False
                    errors.append(
                        "Issue date is after expiry date "
                        f"({issue_date} > {expiry_date})"
                    )
            except (ValueError, TypeError):
                pass  # expiry-date-format error already recorded above
        except (ValueError, TypeError):
            dates_ok = False
            errors.append(f"Issue date is not a valid date: {issue_date!r}")
    else:
        warnings.append("Issue date could not be determined.")

    return dates_ok, expiry_status, errors, warnings


# =========================================================
# AADHAAR VALIDATION
# =========================================================

def _validate_aadhaar_document(identity: dict) -> dict:
    """
    Run document validation checks against parsed AADHAAR identity
    data (the structured output of aadhaar_parser.parse_aadhaar()).

    No MRZ checks -- Aadhaar has no MRZ. vid and address are never
    required; their absence produces no error or warning, since a
    large share of real Aadhaar OCR captures (front-of-card only)
    legitimately never has them.
    """

    errors = []
    warnings = []

    # ---- 1. Required fields ----

    missing_fields = [
        field
        for field in REQUIRED_FIELDS_AADHAAR
        if not identity.get(field)
    ]
    required_ok = len(missing_fields) == 0
    if not required_ok:
        errors.append(
            "Missing required field(s): " + ", ".join(missing_fields)
        )

    # ---- 2. Aadhaar number format ----

    aadhaar_number = identity.get("aadhaar_number")
    aadhaar_number_ok = bool(
aadhaar_number
and aadhaar_number.replace(" ", "").isdigit()
and len(aadhaar_number.replace(" ", "")) == 12
    )
    if not aadhaar_number_ok:
        errors.append(f"Aadhaar number is not 12 digits: {aadhaar_number!r}")

    # ---- 3. Aadhaar checksum (Verhoeff, computed by aadhaar_parser)
    #         -- a hard error, mirroring how an MRZ checksum
    #         mismatch is a hard error for passports. Only
    #         evaluated when a number was actually found -- its
    #         absence is already covered by check #2 above. ----

    aadhaar_checksum_valid = identity.get("aadhaar_number_checksum_valid")

    if aadhaar_number_ok:
        checksum_ok = bool(aadhaar_checksum_valid)
        if not checksum_ok:
            errors.append(
                "Aadhaar number failed Verhoeff checksum validation "
                f"(aadhaar_checksum_valid={aadhaar_checksum_valid!r})."
            )
    else:
        checksum_ok = False

    # ---- 4. Gender (reuses the shared gender validator) ----

    try:
        gender_ok, gender_errors = validate_gender(identity.get("gender", ""))
        errors.extend(gender_errors)
    except Exception as error:
        gender_ok = False
        errors.append(f"Gender check failed unexpectedly: {error}")

    # ---- 5. Name ----

    full_name = identity.get("name")
    name_ok = bool(full_name)
    if not name_ok:
        errors.append("Name is empty.")

    # ---- 6. Date of birth OR year of birth (required, either/or) ----

    try:
        dob_or_yob_ok, dob_errors, dob_warnings = validate_aadhaar_dob_or_yob(
            identity.get("date_of_birth"),
            identity.get("year_of_birth"),
        )
        errors.extend(dob_errors)
        warnings.extend(dob_warnings)
    except Exception as error:
        dob_or_yob_ok = False
        errors.append(f"Date of birth / year of birth check failed unexpectedly: {error}")

    # ---- Optional fields: vid, address. Never affect validity. ----

    checks = {
        "required_fields": required_ok,
        "aadhaar_number": aadhaar_number_ok,
        "aadhaar_checksum": checksum_ok,
        "gender": gender_ok,
        "name": name_ok,
        "dob_or_yob": dob_or_yob_ok,
    }

    validation_score = calculate_validation_score(checks)
    status = "VALID" if len(errors) == 0 else "INVALID"

    # Aadhaar cards do not carry a document expiry date -- "UNKNOWN"
    # reuses the existing expiry_status vocabulary rather than
    # introducing a new value downstream consumers wouldn't expect.
    expiry_status = "UNKNOWN"

    return {
        "status": status,
        "validation_score": validation_score,
        "expiry_status": expiry_status,
        "errors": errors,
        "warnings": warnings,
        "checks": checks,
    }


def validate_aadhaar_dob_or_yob(
    date_of_birth,
    year_of_birth,
) -> tuple[bool, list[str], list[str]]:
    """
    Aadhaar requires either a full date of birth or, on older card
    layouts, just a year of birth -- never both, never neither.
    Validates whichever one is present; never fabricates the other.
    """

    errors = []
    warnings = []

    if date_of_birth:
        try:
            dob_date = datetime.strptime(date_of_birth, DATE_FORMAT)
        except (ValueError, TypeError):
            errors.append(f"Date of birth is not a valid date: {date_of_birth!r}")
            return False, errors, warnings

        if dob_date > datetime.now():
            errors.append(f"Date of birth is in the future: {date_of_birth}")
            return False, errors, warnings

        return True, errors, warnings

    if year_of_birth:
        try:
            year = int(year_of_birth)
        except (ValueError, TypeError):
            errors.append(f"Year of birth is not a valid year: {year_of_birth!r}")
            return False, errors, warnings

        current_year = datetime.now().year
        if not (1900 <= year <= current_year):
            errors.append(f"Year of birth is out of range: {year_of_birth!r}")
            return False, errors, warnings

        warnings.append(
            "Only year of birth is available, not a full date of birth."
        )
        return True, errors, warnings

    errors.append("Neither date_of_birth nor year_of_birth is present.")
    return False, errors, warnings


# =========================================================
# 1. REQUIRED FIELDS
# =========================================================

def validate_required_fields(identity: dict) -> tuple[bool, list[str]]:
    """
    Confirm all required identity fields are present and non-empty.
    """

    missing = [
        field
        for field in REQUIRED_FIELDS
        if not identity.get(field)
    ]

    return (len(missing) == 0, missing)


# =========================================================
# 2. PASSPORT NUMBER FORMAT
# =========================================================

def validate_passport_number(passport_number: str) -> tuple[bool, list[str]]:
    """
    Basic passport number format check.

    Passport number formats vary by country, so this intentionally
    uses a permissive, generic rule rather than one country's exact
    format: 6-9 alphanumeric characters, at least one digit.
    """

    errors = []

    if not passport_number:
        errors.append("Passport number is empty.")
        return False, errors

    if not (6 <= len(passport_number) <= 9):
        errors.append(
            "Passport number length looks unusual "
            f"({len(passport_number)} characters): {passport_number!r}"
        )

    if not passport_number.isalnum():
        errors.append(
            f"Passport number contains unexpected characters: {passport_number!r}"
        )

    if not any(char.isdigit() for char in passport_number):
        errors.append(
            f"Passport number contains no digits: {passport_number!r}"
        )

    return (len(errors) == 0, errors)


# =========================================================
# 3. NATIONALITY / ISSUING COUNTRY CODES
# =========================================================

def validate_nationality_country_code(identity: dict) -> tuple[bool, list[str]]:
    """
    Confirm nationality and issuing_country are well-formed
    3-letter ICAO country codes (format only -- this does not
    check the code against a real country list).
    """

    errors = []

    for field_name in ("nationality", "issuing_country"):

        value = identity.get(field_name, "")

        if len(value) != 3 or not value.isalpha() or not value.isupper():
            errors.append(
                f"{field_name} is not a valid 3-letter country code: {value!r}"
            )

    return (len(errors) == 0, errors)


# =========================================================
# 4. GENDER
# =========================================================

def validate_gender(gender: str) -> tuple[bool, list[str]]:
    """
    Confirm gender is one of the values identity_parser produces
    from the MRZ sex field (M -> Male, F -> Female, < -> Unspecified).
    """

    if gender in VALID_GENDER_VALUES:
        return True, []

    return False, [f"Invalid gender value: {gender!r}"]


# =========================================================
# 5. DATES + EXPIRY STATUS
# =========================================================

def validate_dates(
    date_of_birth: str,
    expiry_date: str
) -> tuple[bool, str, list[str], list[str]]:
    """
    Validate DOB and expiry date, and determine expiry status.

    Returns
    -------
    (dates_ok, expiry_status, errors, warnings)

    An EXPIRED passport produces a WARNING only -- it does not make
    dates_ok False and does not by itself mean the document is invalid
    or forged.
    """

    errors = []
    warnings = []

    dob_date = None
    expiry_date_parsed = None

    # ---- Parse DOB ----
    try:
        dob_date = datetime.strptime(date_of_birth, DATE_FORMAT)
    except (ValueError, TypeError):
        errors.append(f"Date of birth is not a valid date: {date_of_birth!r}")

    # ---- Parse expiry ----
    try:
        expiry_date_parsed = datetime.strptime(expiry_date, DATE_FORMAT)
    except (ValueError, TypeError):
        errors.append(f"Expiry date is not a valid date: {expiry_date!r}")

    today = datetime.now()

    # ---- DOB must not be in the future ----
    if dob_date is not None and dob_date > today:
        errors.append(
            f"Date of birth is in the future: {date_of_birth}"
        )

    # ---- Expiry must be after DOB ----
    if dob_date is not None and expiry_date_parsed is not None:
        if expiry_date_parsed <= dob_date:
            errors.append(
                "Expiry date is not after date of birth "
                f"({expiry_date} <= {date_of_birth})"
            )

    # ---- Expiry status (ACTIVE vs EXPIRED) ----
    expiry_status = "UNKNOWN"

    if expiry_date_parsed is not None:
        if expiry_date_parsed >= today:
            expiry_status = "ACTIVE"
        else:
            expiry_status = "EXPIRED"
            warnings.append(
                f"Passport expired on {expiry_date}. This is a warning, "
                "not proof of forgery -- flag for officer review."
            )

    dates_ok = (len(errors) == 0)

    return dates_ok, expiry_status, errors, warnings


# =========================================================
# 6. MRZ CHECKSUM VALIDATION
# =========================================================

def validate_mrz_checksums(mrz: dict) -> tuple[bool, list[str]]:
    """
    Independently recompute each ICAO TD3 check digit (7-3-1
    weighting, via ocr_service.mrz_check_digit) from the raw MRZ
    line 2 and compare it against the check digit the parser
    already extracted.

    The optional-data check digit is allowed to be '<' when the
    optional field is unused, per the ICAO spec -- that case is
    skipped rather than treated as a failure.
    """

    errors = []

    line2 = mrz.get("line2", "")

    if len(line2) != 44:
        return False, [
            f"MRZ line 2 is not 44 characters, cannot verify checksums: {line2!r}"
        ]

    checks = [
        ("passport_number_check_digit", line2[0:9], mrz.get("passport_number_check_digit")),
        ("date_of_birth_check_digit", line2[13:19], mrz.get("date_of_birth_check_digit")),
        ("expiry_date_check_digit", line2[21:27], mrz.get("expiry_date_check_digit")),
        ("optional_data_check_digit", line2[28:42], mrz.get("optional_data_check_digit")),
    ]

    for label, field, expected_digit in checks:

        if expected_digit is None:
            errors.append(f"{label} is missing from parsed MRZ data.")
            continue

        # Unused optional field may legitimately use '<' instead
        # of a digit -- not an error.
        if not str(expected_digit).isdigit():
            continue

        computed = mrz_check_digit(field)

        if computed != expected_digit:
            errors.append(
                f"{label} mismatch: computed {computed}, "
                f"expected {expected_digit}"
            )

    # ---- Composite check digit ----

    composite_field = line2[0:10] + line2[13:20] + line2[21:43]
    composite_expected = mrz.get("composite_check_digit")

    if composite_expected is None:
        errors.append("composite_check_digit is missing from parsed MRZ data.")
    else:
        computed_composite = mrz_check_digit(composite_field)
        if computed_composite != composite_expected:
            errors.append(
                f"composite_check_digit mismatch: computed {computed_composite}, "
                f"expected {composite_expected}"
            )

    return (len(errors) == 0, errors)


# =========================================================
# 7. CONSISTENCY: parsed fields vs raw MRZ line 2
# =========================================================

def validate_consistency(identity: dict) -> tuple[bool, list[str]]:
    """
    Independently re-derive passport number, nationality, DOB,
    expiry date, and gender directly from the raw MRZ line 2 and
    confirm they agree with the parser's structured output. This
    guards against the parser producing structured fields that
    silently drift from the underlying MRZ data.
    """

    errors = []

    mrz = identity.get("mrz", {})
    line2 = mrz.get("line2", "")

    if len(line2) != 44:
        return False, [
            f"MRZ line 2 is not 44 characters, cannot check consistency: {line2!r}"
        ]

    # ---- Passport number ----
    raw_passport_number = line2[0:9].replace("<", "")
    if raw_passport_number != identity.get("passport_number"):
        errors.append(
            "Passport number does not match raw MRZ: "
            f"parsed={identity.get('passport_number')!r}, "
            f"mrz={raw_passport_number!r}"
        )

    # ---- Nationality ----
    raw_nationality = line2[10:13]
    if raw_nationality != identity.get("nationality"):
        errors.append(
            "Nationality does not match raw MRZ: "
            f"parsed={identity.get('nationality')!r}, "
            f"mrz={raw_nationality!r}"
        )

    # ---- Date of birth ----
    try:
        raw_dob = parse_mrz_date(line2[13:19])
        if raw_dob != identity.get("date_of_birth"):
            errors.append(
                "Date of birth does not match raw MRZ: "
                f"parsed={identity.get('date_of_birth')!r}, "
                f"mrz={raw_dob!r}"
            )
    except ValueError as error:
        errors.append(f"Could not re-derive date of birth from MRZ: {error}")

    # ---- Expiry date ----
    try:
        raw_expiry = parse_mrz_date(line2[21:27])
        if raw_expiry != identity.get("expiry_date"):
            errors.append(
                "Expiry date does not match raw MRZ: "
                f"parsed={identity.get('expiry_date')!r}, "
                f"mrz={raw_expiry!r}"
            )
    except ValueError as error:
        errors.append(f"Could not re-derive expiry date from MRZ: {error}")

    # ---- Gender ----
    raw_gender = parse_mrz_gender(line2[20])
    if raw_gender != identity.get("gender"):
        errors.append(
            "Gender does not match raw MRZ: "
            f"parsed={identity.get('gender')!r}, "
            f"mrz={raw_gender!r}"
        )

    return (len(errors) == 0, errors)


# =========================================================
# VALIDATION SCORE
# =========================================================

def calculate_validation_score(checks: dict) -> int:
    """
    Simple pass/fail scoring: each check category is weighted
    equally. This reflects STRUCTURAL validity only -- it is not
    a fraud/risk score (that comes later in the pipeline).
    """

    if not checks:
        return 0

    passed = sum(1 for value in checks.values() if value)
    total = len(checks)

    return round(100 * passed / total)