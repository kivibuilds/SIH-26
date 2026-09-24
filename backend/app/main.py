from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.database import Base, engine
from app.database import models
from app.api.documents import router as documents_router
from app.api.screening import router as screening_router
from app.api.history import router as history_router
from app.api.audit import router as audit_router

Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="AI Identity Screening System",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://localhost:5173",
        "https://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(documents_router)
app.include_router(screening_router)
app.include_router(history_router)
app.include_router(audit_router)

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "service": "AI Identity Screening System"
    }