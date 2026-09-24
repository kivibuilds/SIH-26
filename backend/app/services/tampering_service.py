import io
from pathlib import Path
 
import numpy as np
from PIL import Image, ExifTags
 
 
# =========================================================
# CONFIGURATION
# =========================================================
 
# Software names commonly found in EXIF "Software" tags when an
# image has been edited (not exhaustive -- absence proves nothing,
# presence is a risk indicator only).
EDITING_SOFTWARE_KEYWORDS = [
    "photoshop",
    "gimp",
    "paint.net",
    "affinity",
    "pixelmator",
    "canva",
    "snapseed",
]
 
ELA_JPEG_QUALITY = 90
BLOCK_SIZE = 16


def compare_document_files(reference_path: str, uploaded_path: str) -> dict:
    """Compare an uploaded image with the previously registered image."""
    try:
        with Image.open(reference_path) as reference_image, Image.open(uploaded_path) as uploaded_image:
            reference_rgb = reference_image.convert("RGB")
            uploaded_rgb = uploaded_image.convert("RGB")
            reference_array = np.asarray(reference_rgb, dtype=np.int16)
            uploaded_array = np.asarray(uploaded_rgb, dtype=np.int16)
            result = {
                "reference_format": (reference_image.format or "UNKNOWN").upper(),
                "uploaded_format": (uploaded_image.format or "UNKNOWN").upper(),
                "reference_dimensions": {"width": reference_rgb.width, "height": reference_rgb.height},
                "uploaded_dimensions": {"width": uploaded_rgb.width, "height": uploaded_rgb.height},
            }
            if reference_array.shape != uploaded_array.shape:
                result.update({
                    "comparison": "DIMENSIONS_CHANGED",
                    "changed_pixels": None,
                    "changed_pixel_percentage": None,
                    "changed_region": None,
                })
                return result

            changed_mask = np.any(reference_array != uploaded_array, axis=2)
            changed_coordinates = np.argwhere(changed_mask)
            changed_pixels = int(changed_mask.sum())
            total_pixels = int(changed_mask.size)
            if changed_pixels:
                top, left = changed_coordinates.min(axis=0)
                bottom, right = changed_coordinates.max(axis=0)
                changed_region = {
                    "x": int(left),
                    "y": int(top),
                    "width": int(right - left + 1),
                    "height": int(bottom - top + 1),
                }
            else:
                changed_region = None
            result.update({
                "comparison": "PIXELS_CHANGED" if changed_pixels else "IDENTICAL_PIXELS",
                "changed_pixels": changed_pixels,
                "total_pixels": total_pixels,
                "changed_pixel_percentage": round(changed_pixels / total_pixels * 100, 4),
                "changed_region": changed_region,
            })
            return result
    except (OSError, ValueError) as error:
        return {
            "comparison": "PIXEL_COMPARISON_UNAVAILABLE",
            "reason": str(error),
        }
 
# Z-score-style anomaly ratios above which a block is considered
# a localized outlier. Divided into the raw ratio to normalize
# into a 0-1 confidence contribution.
ELA_NORMALIZATION_DIVISOR = 8.0
NOISE_NORMALIZATION_DIVISOR = 8.0
 
# Absolute-magnitude scales. A block can only score highly if it is
# BOTH a strong relative outlier (z-score-style ratio, above) AND has
# a non-trivial absolute difference/variance -- this prevents a
# uniform, low-variation background (common on real ID documents)
# from producing false positives purely because its baseline std is
# tiny, which makes any small fluctuation look like a huge z-score.
ELA_ABSOLUTE_SCALE = 20.0
NOISE_ABSOLUTE_SCALE = 100.0
 
# Weights used to combine the three signals into one confidence
# score. Must sum to <= 1.0 (metadata is a flat bonus, not scaled).
ELA_WEIGHT = 0.45
NOISE_WEIGHT = 0.35
METADATA_WEIGHT = 0.20
 
# Sub-scores above this are surfaced as individual indicators.
INDICATOR_THRESHOLD = 0.40
 
# Combined confidence at/above this marks tampering as "detected".
DETECTION_THRESHOLD = 0.50
 
 
# =========================================================
# TOP-LEVEL ENTRY POINT
# =========================================================
 
def analyze_tampering(file_path: str) -> dict:
    """
    Run all tampering-detection checks on a document image.
 
    Returns
    -------
    dict
        {
            "tampering_analysis": {
                "detected": bool,
                "confidence": float (0-1),
                "indicators": [str, ...],
                "details": {
                    "metadata": {...},
                    "error_level_analysis": {...},
                    "noise_analysis": {...},
                }
            }
        }
    """
 
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Document image not found: {file_path}")
 
    metadata_result = analyze_metadata(file_path)
    ela_result = compute_error_level_analysis(file_path)
    noise_result = compute_noise_inconsistency(file_path)
 
    # Down-weight ELA when the source isn't JPEG-derived -- there's
    # no meaningful re-compression history to analyze on a PNG.
    ela_weight = ELA_WEIGHT if metadata_result["is_jpeg_derived"] else ELA_WEIGHT * 0.3
 
    confidence = (
        ela_weight * ela_result["score"]
        + NOISE_WEIGHT * noise_result["score"]
        + (METADATA_WEIGHT if metadata_result["editing_software_detected"] else 0.0)
    )
    confidence = round(min(confidence, 1.0), 2)
 
    indicators = []
 
    if ela_result["score"] >= INDICATOR_THRESHOLD:
        if metadata_result["is_jpeg_derived"]:
            indicators.append(
                "Possible localized compression inconsistency "
                "(a region may have been edited or pasted in)."
            )
        else:
            indicators.append(
                "Minor compression-level inconsistency detected "
                "(low confidence -- source is not JPEG-derived, "
                "so this signal is weak)."
            )
 
    if noise_result["score"] >= INDICATOR_THRESHOLD:
        indicators.append(
            "Inconsistent noise pattern detected across the image "
            "(possible splicing of a photograph or text region)."
        )
 
    if metadata_result["editing_software_detected"]:
        indicators.append(
            "Image metadata indicates it was processed with editing "
            f"software: {metadata_result['editing_software_detected']}."
        )
 
    for warning in metadata_result["warnings"]:
        indicators.append(warning)
 
    detected = confidence >= DETECTION_THRESHOLD
 
    return {
        "tampering_analysis": {
            "detected": detected,
            "confidence": confidence,
            "indicators": indicators,
            "details": {
                "metadata": metadata_result,
                "error_level_analysis": ela_result,
                "noise_analysis": noise_result,
            },
        }
    }
 
 
# =========================================================
# 1. METADATA ANALYSIS
# =========================================================
 
def analyze_metadata(file_path: str) -> dict:
    """
    Inspect image metadata for editing-software fingerprints and
    format anomalies. Absence of suspicious metadata does NOT mean
    an image is untouched -- metadata is trivially strippable.
    """
 
    warnings = []
    editing_software_detected = None
 
    with Image.open(file_path) as image:
        image_format = (image.format or "UNKNOWN").upper()
        width, height = image.size
 
        exif_data = {}
        raw_exif = image.getexif()
 
        if raw_exif:
            for tag_id, value in raw_exif.items():
                tag_name = ExifTags.TAGS.get(tag_id, tag_id)
                exif_data[tag_name] = value
 
    is_jpeg_derived = image_format in ("JPEG", "JPG")
 
    software_tag = str(exif_data.get("Software", "")).lower()
    for keyword in EDITING_SOFTWARE_KEYWORDS:
        if keyword in software_tag:
            editing_software_detected = exif_data.get("Software")
            break
 
    if not is_jpeg_derived:
        warnings.append(
            f"Source image is {image_format}, not JPEG -- this format "
            "typically carries no EXIF history, so metadata analysis "
            "here is limited."
        )
 
    if width < 400 or height < 300:
        warnings.append(
            f"Image resolution is unusually low ({width}x{height}), "
            "which can reduce reliability of forensic analysis."
        )
 
    return {
        "format": image_format,
        "is_jpeg_derived": is_jpeg_derived,
        "dimensions": {"width": width, "height": height},
        "editing_software_detected": editing_software_detected,
        "warnings": warnings,
    }
 
 
# =========================================================
# 2. ERROR LEVEL ANALYSIS (ELA)
# =========================================================
 
def compute_error_level_analysis(
    file_path: str,
    quality: int = ELA_JPEG_QUALITY,
) -> dict:
    """
    Re-encode the image as JPEG at a known quality and measure the
    per-pixel difference from the original. Regions that were edited
    or pasted in from a different source typically have a different
    compression history and stand out as localized outliers relative
    to the rest of the image.
    """
 
    with Image.open(file_path) as original:
        original_rgb = original.convert("RGB")
 
        buffer = io.BytesIO()
        original_rgb.save(buffer, "JPEG", quality=quality)
        buffer.seek(0)
 
        with Image.open(buffer) as recompressed:
            original_array = np.asarray(original_rgb, dtype=np.int16)
            recompressed_array = np.asarray(
                recompressed.convert("RGB"), dtype=np.int16
            )
 
    # Per-pixel difference, summed across RGB channels.
    diff = np.abs(original_array - recompressed_array).sum(axis=2)
 
    block_means = _block_reduce(diff, BLOCK_SIZE, np.mean)
 
    global_mean = float(block_means.mean())
    global_std = float(block_means.std())
    max_block_mean = float(block_means.max())
 
    if global_std < 1e-6:
        anomaly_ratio = 0.0
    else:
        anomaly_ratio = (max_block_mean - global_mean) / global_std
 
    relative_score = min(anomaly_ratio / ELA_NORMALIZATION_DIVISOR, 1.0)
    absolute_score = min(max_block_mean / ELA_ABSOLUTE_SCALE, 1.0)
 
    # Require BOTH a strong relative outlier and a non-trivial
    # absolute difference -- see ELA_ABSOLUTE_SCALE comment above.
    score = round(max(relative_score * absolute_score, 0.0), 3)
 
    return {
        "global_mean_difference": round(global_mean, 2),
        "max_block_difference": round(max_block_mean, 2),
        "anomaly_ratio": round(anomaly_ratio, 2),
        "score": score,
    }
 
 
# =========================================================
# 3. NOISE INCONSISTENCY ANALYSIS
# =========================================================
 
def compute_noise_inconsistency(
    file_path: str,
    block_size: int = BLOCK_SIZE,
) -> dict:
    """
    Split the image into blocks and compute local pixel variance in
    each. A block whose variance is a strong outlier relative to the
    rest of the image suggests a region with different noise
    characteristics than its surroundings -- consistent with a
    pasted-in photograph, signature, or stamp.
    """
 
    with Image.open(file_path) as image:
        grayscale = np.asarray(image.convert("L"), dtype=np.float64)
 
    block_variances = _block_reduce(grayscale, block_size, np.var)
 
    global_mean = float(block_variances.mean())
    global_std = float(block_variances.std())
    max_block_variance = float(block_variances.max())
 
    if global_std < 1e-6:
        anomaly_ratio = 0.0
    else:
        anomaly_ratio = (max_block_variance - global_mean) / global_std
 
    relative_score = min(anomaly_ratio / NOISE_NORMALIZATION_DIVISOR, 1.0)
    absolute_score = min(max_block_variance / NOISE_ABSOLUTE_SCALE, 1.0)
 
    # Require BOTH a strong relative outlier and a non-trivial
    # absolute variance -- see NOISE_ABSOLUTE_SCALE comment above.
    score = round(max(relative_score * absolute_score, 0.0), 3)
 
    return {
        "global_mean_variance": round(global_mean, 2),
        "max_block_variance": round(max_block_variance, 2),
        "anomaly_ratio": round(anomaly_ratio, 2),
        "score": score,
    }
 
 
# =========================================================
# HELPER: BLOCK-WISE REDUCTION
# =========================================================
 
def _block_reduce(array: np.ndarray, block_size: int, reduce_fn) -> np.ndarray:
    """
    Split a 2D array into non-overlapping block_size x block_size
    blocks and apply reduce_fn (e.g. np.mean, np.var) to each,
    returning a smaller 2D array of block-level values.
 
    Edge blocks smaller than block_size (when dimensions don't
    divide evenly) are included as-is using their partial size.
    """
 
    height, width = array.shape
 
    row_edges = list(range(0, height, block_size)) + [height]
    col_edges = list(range(0, width, block_size)) + [width]
 
    n_rows = len(row_edges) - 1
    n_cols = len(col_edges) - 1
 
    result = np.zeros((n_rows, n_cols), dtype=np.float64)
 
    for i in range(n_rows):
        for j in range(n_cols):
            block = array[
                row_edges[i]:row_edges[i + 1],
                col_edges[j]:col_edges[j + 1],
            ]
            result[i, j] = reduce_fn(block)
 
    return result
 