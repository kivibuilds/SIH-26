def verify_face(document_path: str, selfie_path: str) -> dict:
    """Compare a selfie with the document portrait when face_recognition is installed."""
    try:
        import face_recognition
    except (ImportError, RuntimeError, SystemExit) as error:
        raise RuntimeError("install the optional face_recognition package to enable biometric matching") from error

    document_image = face_recognition.load_image_file(document_path)
    selfie_image = face_recognition.load_image_file(selfie_path)
    document_encodings = face_recognition.face_encodings(document_image)
    selfie_encodings = face_recognition.face_encodings(selfie_image)

    if not document_encodings or not selfie_encodings:
        return {
            "status": "REVIEW",
            "match": False,
            "confidence": 0.0,
            "reason": "A face could not be detected in the document photo or selfie.",
        }

    distance = float(face_recognition.face_distance([document_encodings[0]], selfie_encodings[0])[0])
    confidence = max(0.0, min(1.0, 1.0 - distance))
    matched = bool(face_recognition.compare_faces([document_encodings[0]], selfie_encodings[0], tolerance=0.6)[0])
    return {
        "status": "MATCH" if matched else "MISMATCH",
        "match": matched,
        "confidence": confidence,
        "reason": "Selfie compared with the document portrait.",
    }