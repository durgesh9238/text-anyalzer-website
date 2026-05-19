"""
main.py — Deep Document Analyzer PRO  |  FastAPI Entry Point
Run with: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from analyzer import analyze, analyze_raw_text

# ---------------------------------------------------------------------------
# App Instance
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Deep Document Analyzer PRO",
    description=(
        "Enterprise-grade document analysis API powered by NLP. "
        "Accepts .txt, .pdf, and .docx files and returns deep semantic insights."
    ),
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS — allow Vite dev server and CRA dev server
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

ALLOWED_EXTENSIONS = {"txt", "pdf", "docx"}
MAX_FILE_SIZE_MB = 10


@app.get("/", tags=["Health"])
async def health_check():
    """Simple liveness probe."""
    return {"status": "ok", "service": "Deep Document Analyzer PRO"}


@app.post("/api/analyze", tags=["Analysis"])
async def analyze_document(file: UploadFile = File(...)):
    """
    Analyze an uploaded document (.txt, .pdf, or .docx).

    Returns comprehensive NLP metrics including:
    - Word / sentence / character counts
    - Estimated reading time
    - Lexical richness percentage
    - Top-5 keywords (stop-word filtered)
    - Sentiment analysis (Positive / Negative / Neutral)
    """
    # Validate file presence
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file provided.")

    # Validate extension
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=(
                f"Unsupported file type '.{ext}'. "
                f"Accepted formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}."
            ),
        )

    # Read file bytes
    file_bytes = await file.read()

    # Validate size (10 MB cap)
    size_mb = len(file_bytes) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({size_mb:.1f} MB). Maximum allowed: {MAX_FILE_SIZE_MB} MB.",
        )

    # Run analysis
    try:
        result = analyze(file.filename, file_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        # Catch-all for unexpected parsing errors
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(exc)}",
        )

    return {
        "filename": file.filename,
        "file_size_kb": round(len(file_bytes) / 1024, 2),
        "analysis": result,
    }


# ── Pasted-text request model ──────────────────────────────────────────────

class TextInput(BaseModel):
    text: str


@app.post("/api/analyze-text", tags=["Analysis"])
async def analyze_text(body: TextInput):
    """
    Analyze raw pasted text (no file upload required).

    Returns the same comprehensive NLP metrics as /api/analyze.
    """
    if not body.text or not body.text.strip():
        raise HTTPException(status_code=400, detail="Text body is empty.")

    if len(body.text) > 200_000:
        raise HTTPException(
            status_code=413,
            detail="Text too large. Maximum allowed: 200,000 characters.",
        )

    try:
        result = analyze_raw_text(body.text)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(exc)}")

    char_count = len(body.text)
    return {
        "filename": "Pasted Text",
        "file_size_kb": round(char_count / 1024, 2),
        "analysis": result,
    }
