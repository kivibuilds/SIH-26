"""Conservative passport and visa stamp screening.

This module uses explainable image heuristics only. It identifies likely
ink-rich regions and reports visual signals that may justify manual review;
it does not estimate the probability that a stamp is forged.
"""

from __future__ import annotations

import re
from collections import deque
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageFilter

from app.services.tampering_service import analyze_metadata


SUPPORTED_DOCUMENT_TYPES = {"PASSPORT", "VISA"}
_DATE_PATTERN = re.compile(r"\b(?:\d{1,2}[/-]){2}\d{2,4}\b|\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b")
_STAMP_TERMS = re.compile(r"\b(?:ENTRY|EXIT|ADMIT|VISA|IMMIGRATION|ARRIVAL|DEPARTURE|PORT|VALID|UNTIL)\b", re.IGNORECASE)
_DETECTION_MESSAGES = {
    "NO_STAMP_DETECTED": "No likely passport or visa stamp was detected in this image.",
    "UNCERTAIN": "The system could not confidently determine whether a passport or visa stamp is present.",
}


def analyze_stamp_regions(file_path: str | Path, document_type: str) -> dict[str, Any]:
    """Analyze likely stamp regions in a passport or visa image.

    Detection confidence describes support for the region detector only. It is
    deliberately not a probability that a stamp is genuine or forged.
    """
    document_type = (document_type or "").upper()
    if document_type not in SUPPORTED_DOCUMENT_TYPES:
        return _unsupported_result(document_type)

    try:
        metadata = analyze_metadata(file_path)
        with Image.open(file_path) as source:
            image = source.convert("RGB")
        quality = _image_quality(image, metadata)
        regions = _detect_regions(image)
        if not regions:
            return _empty_result("NO_STAMP_DETECTED", quality, metadata)

        gated_regions = []
        uncertain_regions = []
        for candidate in regions:
            gate_status = _stamp_gate(candidate, quality)
            if gate_status == "STAMP_DETECTED":
                gated_regions.append(candidate)
            elif gate_status == "UNCERTAIN":
                uncertain_regions.append(candidate)

        if not gated_regions:
            status = "UNCERTAIN" if uncertain_regions else "NO_STAMP_DETECTED"
            return _empty_result(status, quality, metadata)

        stamp_regions = []
        ocr_findings = []
        anomalies = []
        indicators = []
        for index, candidate in enumerate(gated_regions, start=1):
            region_id = f"STAMP-{index:02d}"
            ocr = _read_region_text(image, candidate["box"])
            region_anomalies = _region_anomalies(image, candidate["box"])
            ocr_findings.append({"region_id": region_id, **ocr})
            anomalies.extend({"region_id": region_id, **item} for item in region_anomalies)
            indicators.extend(item["description"] for item in region_anomalies)
            stamp_regions.append({
                "region_id": region_id,
                "bounding_box": candidate["bounding_box"],
                "detection_method": candidate["method"],
                "detection_confidence": candidate["confidence"],
                "confidence_meaning": "Support from color/shape/spatial heuristics, not forgery probability.",
                "ocr_text": ocr["text"],
                "anomaly_indicators": [item["code"] for item in region_anomalies],
                "evidence": candidate["evidence"],
            })

        status = "STAMP_DETECTED"
        return {
            "status": status,
            "stamp_regions": stamp_regions,
            "ocr_findings": ocr_findings,
            "anomalies": anomalies,
            "image_quality": quality,
            "indicators": indicators,
            "limitations": _limitations(quality, metadata),
        }
    except (OSError, ValueError, TypeError) as error:
        return {
            "status": "INSUFFICIENT_EVIDENCE",
            "stamp_regions": [],
            "ocr_findings": [],
            "anomalies": [],
            "image_quality": {"quality_status": "UNAVAILABLE"},
            "indicators": [],
            "limitations": [f"Stamp analysis could not read this image: {error}"],
        }


def _empty_result(status: str, quality: dict[str, Any], metadata: dict[str, Any]) -> dict[str, Any]:
    return {
        "status": status,
        "stamp_regions": [],
        "ocr_findings": [],
        "anomalies": [],
        "image_quality": quality,
        "indicators": [],
        "message": _DETECTION_MESSAGES.get(status),
        "limitations": _limitations(quality, metadata),
    }


def _unsupported_result(document_type: str) -> dict[str, Any]:
    return {
        "status": "NOT_APPLICABLE",
        "stamp_regions": [],
        "ocr_findings": [],
        "anomalies": [],
        "image_quality": {},
        "indicators": [],
        "limitations": [f"Stamp analysis is limited to passport and visa documents, not {document_type or 'UNKNOWN'}."],
    }


def _image_quality(image: Image.Image, metadata: dict[str, Any]) -> dict[str, Any]:
    gray = np.asarray(image.convert("L"), dtype=np.float32)
    if gray.size == 0:
        sharpness = 0.0
    else:
        horizontal = np.diff(gray, axis=1) if gray.shape[1] > 1 else np.zeros_like(gray)
        vertical = np.diff(gray, axis=0) if gray.shape[0] > 1 else np.zeros_like(gray)
        sharpness = float((horizontal.var() + vertical.var()) / 2.0)
    width, height = image.size
    low_resolution = width < 500 or height < 350
    low_sharpness = sharpness < 35.0
    return {
        "format": metadata.get("format", "UNKNOWN"),
        "dimensions": {"width": width, "height": height},
        "sharpness_signal": round(sharpness, 2),
        "quality_status": "LOW" if low_resolution or low_sharpness else "ADEQUATE",
        "quality_limitations": [
            message for condition, message in (
                (low_resolution, "Low image resolution may hide small or faint stamps."),
                (low_sharpness, "Low local edge variation may reduce boundary and texture analysis."),
            ) if condition
        ],
    }


def _detect_regions(image: Image.Image) -> list[dict[str, Any]]:
    original_width, original_height = image.size
    scale = min(1.0, 1400.0 / max(original_width, original_height))
    if scale < 1.0:
        working = image.resize((max(1, int(original_width * scale)), max(1, int(original_height * scale))), Image.Resampling.LANCZOS)
    else:
        working = image
    pixels = np.asarray(working.convert("RGB"), dtype=np.int16)
    channel_max = pixels.max(axis=2)
    channel_min = pixels.min(axis=2)
    chroma = channel_max - channel_min
    saturation = chroma / np.maximum(channel_max, 1)
    colored_ink = (chroma >= 24) & (saturation >= 0.16) & (channel_max <= 252) & (channel_min <= 235)
    dark_ink = (channel_max <= 125) & (chroma >= 10)
    mask = colored_ink | dark_ink
    mask_image = Image.fromarray((mask * 255).astype(np.uint8))
    mask_image = mask_image.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
    components = _components(np.asarray(mask_image) > 0)
    height, width = mask.shape
    candidates = []
    for x, y, x2, y2, area in components:
        box_width = x2 - x
        box_height = y2 - y
        box_area = box_width * box_height
        area_ratio = box_area / max(1, width * height)
        fill_ratio = area / max(1, box_area)
        aspect_ratio = max(box_width / max(1, box_height), box_height / max(1, box_width))
        if box_width < width * 0.035 or box_height < height * 0.025:
            continue
        if area_ratio < 0.0015 or area_ratio > 0.35 or fill_ratio < 0.04:
            continue
        normalized = {
            "x": round(x / width, 4),
            "y": round(y / height, 4),
            "width": round(box_width / width, 4),
            "height": round(box_height / height, 4),
        }
        candidates.append({
            "box": (x, y, x2, y2, width, height),
            "bounding_box": normalized,
            "aspect_ratio": round(aspect_ratio, 2),
            "fill_ratio": round(fill_ratio, 3),
            "colored_fraction": round(float(np.mean(colored_ink[y:y2, x:x2])), 3),
            "method": "chromatic_or_dark_ink_contour",
            "confidence": round(min(0.99, max(0.25, 0.45 + min(fill_ratio, 0.45))), 2),
            "evidence": f"Connected ink-like region covering {area_ratio:.1%} of the image with {fill_ratio:.1%} mask occupancy.",
        })
    return _merge_overlapping(candidates)


def _looks_like_document_text(candidate: dict[str, Any], ocr: dict[str, Any]) -> bool:
    """Reject obvious line/signature candidates without requiring stamp color."""
    has_stamp_terms = bool(ocr.get("terms"))
    colored_fraction = candidate.get("colored_fraction", 0.0)
    aspect_ratio = candidate.get("aspect_ratio", 99.0)
    fill_ratio = candidate.get("fill_ratio", 0.0)
    if has_stamp_terms or colored_fraction >= 0.12:
        return False
    if aspect_ratio > 4.5:
        return True
    return aspect_ratio > 2.8 and fill_ratio < 0.16


def _stamp_gate(candidate: dict[str, Any], quality: dict[str, Any]) -> str:
    """Classify visual stamp evidence without using OCR as a positive signal."""
    aspect_ratio = candidate.get("aspect_ratio", 99.0)
    fill_ratio = candidate.get("fill_ratio", 0.0)
    colored_fraction = candidate.get("colored_fraction", 0.0)
    if aspect_ratio > 2.8 or fill_ratio < 0.06 or colored_fraction < 0.04:
        return "NO_STAMP_DETECTED"

    shape_score = 1.0 if 1.0 <= aspect_ratio <= 2.4 else 0.65
    fill_score = 1.0 if 0.09 <= fill_ratio <= 0.42 else 0.55
    color_score = min(1.0, colored_fraction / 0.18)
    evidence_score = shape_score * 0.35 + fill_score * 0.2 + color_score * 0.45
    if evidence_score >= 0.68 and not (quality["quality_status"] == "LOW" and evidence_score < 0.82):
        return "STAMP_DETECTED"
    if evidence_score >= 0.45:
        return "UNCERTAIN"
    return "NO_STAMP_DETECTED"


def _components(mask: np.ndarray) -> list[tuple[int, int, int, int, int]]:
    height, width = mask.shape
    visited = np.zeros_like(mask, dtype=bool)
    components = []
    for y, x in zip(*np.where(mask & ~visited)):
        if visited[y, x]:
            continue
        queue = deque([(int(y), int(x))])
        visited[y, x] = True
        min_x = max_x = int(x)
        min_y = max_y = int(y)
        area = 0
        while queue:
            current_y, current_x = queue.popleft()
            area += 1
            min_x, max_x = min(min_x, current_x), max(max_x, current_x)
            min_y, max_y = min(min_y, current_y), max(max_y, current_y)
            for next_y in range(max(0, current_y - 1), min(height, current_y + 2)):
                for next_x in range(max(0, current_x - 1), min(width, current_x + 2)):
                    if mask[next_y, next_x] and not visited[next_y, next_x]:
                        visited[next_y, next_x] = True
                        queue.append((next_y, next_x))
        components.append((min_x, min_y, max_x + 1, max_y + 1, area))
    return components


def _merge_overlapping(candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    selected = []
    for candidate in sorted(candidates, key=lambda item: item["bounding_box"]["width"] * item["bounding_box"]["height"], reverse=True):
        current = candidate["bounding_box"]
        overlaps = False
        for existing in selected:
            left = max(current["x"], existing["bounding_box"]["x"])
            top = max(current["y"], existing["bounding_box"]["y"])
            right = min(current["x"] + current["width"], existing["bounding_box"]["x"] + existing["bounding_box"]["width"])
            bottom = min(current["y"] + current["height"], existing["bounding_box"]["y"] + existing["bounding_box"]["height"])
            if right > left and bottom > top:
                overlaps = True
                break
        if not overlaps:
            selected.append(candidate)
    return sorted(selected, key=lambda item: (item["bounding_box"]["y"], item["bounding_box"]["x"]))


def _read_region_text(image: Image.Image, box: tuple[int, int, int, int, int, int]) -> dict[str, Any]:
    x, y, x2, y2, width, height = box
    crop = image.crop((int(x * image.width / width), int(y * image.height / height), int(x2 * image.width / width), int(y2 * image.height / height)))
    try:
        from app.services.ocr_service import _ocr_to_text
        text = _ocr_to_text(crop.resize((max(crop.width * 2, 1), max(crop.height * 2, 1)), Image.Resampling.LANCZOS), config="--psm 6").strip()
    except Exception as error:
        return {"text": "", "status": "UNAVAILABLE", "uncertainty": str(error), "dates": [], "terms": []}
    return {
        "text": text,
        "status": "READABLE" if text else "UNREADABLE",
        "uncertainty": "OCR text is partial and may contain recognition errors." if text else "No reliable text was read from this region.",
        "dates": _DATE_PATTERN.findall(text),
        "terms": sorted(set(match.group(0).upper() for match in _STAMP_TERMS.finditer(text))),
    }


def _region_anomalies(image: Image.Image, box: tuple[int, int, int, int, int, int]) -> list[dict[str, Any]]:
    x, y, x2, y2, width, height = box
    crop = np.asarray(image.crop((int(x * image.width / width), int(y * image.height / height), int(x2 * image.width / width), int(y2 * image.height / height))).convert("L"), dtype=np.float32)
    if min(crop.shape) < 8:
        return [{"code": "LOW_REGION_RESOLUTION", "description": "Stamp-like region is too small for reliable boundary analysis."}]
    border = max(2, min(crop.shape) // 12)
    border_pixels = np.concatenate((crop[:border].ravel(), crop[-border:].ravel(), crop[:, :border].ravel(), crop[:, -border:].ravel()))
    interior = crop[border:-border, border:-border]
    edge_density = float(np.mean(np.abs(np.diff(crop, axis=0)) > 35) + np.mean(np.abs(np.diff(crop, axis=1)) > 35)) / 2
    border_density = float(np.mean(np.abs(np.diff(border_pixels)) > 35)) if border_pixels.size > 1 else 0.0
    anomalies = []
    if border_density > max(0.25, edge_density * 1.8):
        anomalies.append({"code": "BOUNDARY_DISCONTINUITY", "description": "Potential visual anomaly detected at the stamp-like region boundary; scanning or compression can produce this signal."})
    if interior.std() > 85 and crop.std() > 0:
        anomalies.append({"code": "INTERNAL_TEXTURE_VARIATION", "description": "Stamp-like region has uneven internal texture; image quality or legitimate overprinting may explain it."})
    return anomalies


def _limitations(quality: dict[str, Any], metadata: dict[str, Any]) -> list[str]:
    limitations = [
        "Visual signals are screening evidence only and cannot establish that a stamp is forged.",
        "Missing EXIF metadata is not treated as suspicious evidence.",
    ]
    limitations.extend(quality.get("quality_limitations", []))
    if metadata.get("warnings"):
        limitations.append("Metadata interpretation is limited because image provenance and editing history are not recoverable from pixels alone.")
    return limitations
