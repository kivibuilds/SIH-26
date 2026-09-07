# SIDTD Evaluation Data

## Dataset

**Synthetic Dataset of ID and Travel Documents (SIDTD)** is the primary public document-forensics evaluation dataset for VerifyX.

## Official source

Obtain SIDTD from the dataset release published by its authors and use the accompanying official documentation. Do not use an unverified mirror. The repository intentionally does not vendor the dataset.

## License

Follow the license and usage restrictions distributed with the official SIDTD release. Confirm that the intended research/demo use is permitted before downloading or redistributing any files.

## Purpose

A small, representative subset is used to exercise the VerifyX screening, tampering-analysis, SHA-256, database audit, blockchain registration, and integrity-verification flow. Ground-truth labels remain an evaluation input and are not written to the blockchain.

## Obtain and place locally

Download SIDTD through the official release channel, then place only local, untracked files under `data/SIDTD/`.

Expected structure:

```text
data/
  README.md
  SIDTD/
    genuine/
      *.png
      *.jpg
      *.pdf
    forged/
      *.png
      *.jpg
      *.pdf
    labels.csv
```

The exact folders and label-file names may differ by release. Adapt the dataset runner to the release manifest rather than committing or renaming the source files in this repository.

## Evaluation record

For each selected file, record outside Git-tracked source data:

- filename
- genuine/forged ground truth
- VerifyX document type
- screening ID
- screening result and tampering result
- SHA-256 document hash
- blockchain status, transaction hash, and block number
- integrity verification result

Dataset files, generated reports containing sensitive data, and uploaded documents must remain uncommitted.
