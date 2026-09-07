"""Run the existing VerifyX upload and screening APIs over the SIDTD-style dataset."""

import argparse
import csv
import json
import mimetypes
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}
DOCUMENT_SPECS = (("aadhaar", "AADHAAR", "Aadhaar"), ("passport", "PASSPORT", "Passport"))
CSV_FIELDS = [
    "document_type",
    "dataset_label",
    "filename",
    "document_id",
    "screening_id",
    "screening_status",
    "risk_score",
    "risk_level",
    "mrz_status",
    "tampering_detected",
    "blockchain_status",
    "transaction_hash",
    "block_number",
    "document_hash",
    "record_hash",
    "error",
    "complete_screening_response",
]


def parse_args():
    default_dataset = Path.home() / "Desktop" / "VerifyX-Dataset"
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dataset-root",
        type=Path,
        default=default_dataset,
        help=f"Dataset root containing aadhaar/ and passport/ (default: {default_dataset})",
    )
    parser.add_argument(
        "--api-base-url",
        default="http://127.0.0.1:8000/api",
        help="VerifyX API base URL (default: http://127.0.0.1:8000/api)",
    )
    parser.add_argument("--timeout", type=float, default=300.0, help="HTTP timeout per API request in seconds")
    return parser.parse_args()


def image_files(folder):
    return sorted(
        (path for path in folder.iterdir() if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS),
        key=lambda path: path.name.lower(),
    )


def validate_dataset(dataset_root):
    collections = {}
    for folder_name, api_type, label in DOCUMENT_SPECS:
        folder = dataset_root / folder_name
        if not folder.is_dir():
            raise FileNotFoundError(f"Dataset folder not found: {folder}")
        files = image_files(folder)
        if len(files) != 200:
            raise ValueError(f"Expected exactly 200 images in {folder}, found {len(files)}")
        collections[label] = [(path, api_type) for path in files]
    return collections["Aadhaar"] + collections["Passport"]


def multipart_upload(file_path, document_type):
    boundary = f"----VerifyXBatch{uuid.uuid4().hex}"
    content_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
    file_bytes = file_path.read_bytes()
    parts = [
        f"--{boundary}\r\n".encode(),
        b'Content-Disposition: form-data; name="document_type"\r\n\r\n',
        document_type.encode(),
        f"\r\n--{boundary}\r\n".encode(),
        f'Content-Disposition: form-data; name="file"; filename="{file_path.name}"\r\n'.encode(),
        f"Content-Type: {content_type}\r\n\r\n".encode(),
        file_bytes,
        f"\r\n--{boundary}--\r\n".encode(),
    ]
    return b"".join(parts), f"multipart/form-data; boundary={boundary}"


def post_json(url, body, content_type, timeout):
    request = Request(url, data=body, method="POST", headers={"Content-Type": content_type, "Accept": "application/json"})
    try:
        with urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {error.code}: {detail[:1000]}") from error
    except (URLError, TimeoutError) as error:
        raise RuntimeError(str(error)) from error


def post_empty(url, timeout):
    return post_json(url, b"", "application/json", timeout)


def response_row(document_type, dataset_label, filename):
    return {
        "document_type": document_type,
        "dataset_label": dataset_label,
        "filename": filename,
        "document_id": None,
        "screening_id": None,
        "screening_status": "FAILED",
        "risk_score": None,
        "risk_level": None,
        "mrz_status": None,
        "tampering_detected": None,
        "blockchain_status": None,
        "transaction_hash": None,
        "block_number": None,
        "document_hash": None,
        "record_hash": None,
        "error": None,
        "complete_screening_response": None,
    }


def process_document(file_path, document_type, dataset_label, api_base_url, timeout):
    row = response_row(document_type, dataset_label, file_path.name)
    try:
        body, content_type = multipart_upload(file_path, document_type)
        uploaded = post_json(f"{api_base_url}/documents/upload", body, content_type, timeout)
        row["document_id"] = uploaded.get("document_id")
        document_id = uploaded.get("document_id")
        if not document_id:
            raise RuntimeError("Upload response did not include document_id")

        screening = post_empty(f"{api_base_url}/screening/analyze/{document_id}", timeout)
        blockchain = screening.get("blockchain") or {}
        risk = screening.get("risk") or {}
        mrz = screening.get("mrz_verification") or {}
        tampering = screening.get("tampering_analysis") or {}
        row.update({
            "screening_status": "SUCCESS",
            "screening_id": screening.get("screening_id"),
            "risk_score": risk.get("score"),
            "risk_level": risk.get("level"),
            "mrz_status": mrz.get("status"),
            "tampering_detected": tampering.get("detected"),
            "blockchain_status": blockchain.get("status"),
            "transaction_hash": blockchain.get("transaction_hash"),
            "block_number": blockchain.get("block_number"),
            "document_hash": blockchain.get("document_hash") or blockchain.get("hash"),
            "record_hash": blockchain.get("result_hash"),
            "complete_screening_response": json.dumps(screening, sort_keys=True, default=str),
        })
    except Exception as error:
        row["error"] = str(error)
    return row


def write_results(results, output_dir):
    output_dir.mkdir(parents=True, exist_ok=True)
    json_path = output_dir / "audit_results.json"
    csv_path = output_dir / "audit_results.csv"
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total": len(results),
        "results": results,
    }
    json_path.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_FIELDS)
        writer.writeheader()
        writer.writerows(results)


def print_summary(results):
    successful = [row for row in results if row["screening_status"] == "SUCCESS"]
    blockchain_confirmed = [row for row in results if row["blockchain_status"] == "CONFIRMED"]
    blockchain_unconfirmed = [row for row in results if row["blockchain_status"] in {"FAILED", "PENDING"}]
    mrz_valid = [row for row in results if row["mrz_status"] in {"VALID", "MATCH"}]
    tampering = [row for row in results if row["tampering_detected"] is True]
    print("\nFinal summary")
    print(f"total processed: {len(results)}")
    print(f"Aadhaar count: {sum(row['dataset_label'] == 'Aadhaar' for row in results)}")
    print(f"Passport count: {sum(row['dataset_label'] == 'Passport' for row in results)}")
    print(f"successful screenings: {len(successful)}")
    print(f"failed screenings: {len(results) - len(successful)}")
    print(f"blockchain CONFIRMED count: {len(blockchain_confirmed)}")
    print(f"blockchain FAILED/PENDING count: {len(blockchain_unconfirmed)}")
    print(f"MRZ valid count where applicable: {len(mrz_valid)}")
    print(f"tampering detected count: {len(tampering)}")


def main():
    args = parse_args()
    dataset = validate_dataset(args.dataset_root)
    results = []
    for index, (file_path, document_type) in enumerate(dataset, start=1):
        label = "Aadhaar" if document_type == "AADHAAR" else "Passport"
        print(f"[{index}/400] {label}...", flush=True)
        results.append(process_document(file_path, document_type, label, args.api_base_url.rstrip("/"), args.timeout))

    output_dir = Path(__file__).resolve().parents[1] / "dataset_results"
    write_results(results, output_dir)
    print_summary(results)
    print(f"Results written to {output_dir}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (FileNotFoundError, ValueError) as error:
        print(f"Dataset validation failed: {error}", file=sys.stderr)
        sys.exit(1)
