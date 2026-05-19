"""
analyzer.py — NLP Analysis Engine
Handles text extraction from .txt / .pdf / .docx files
and exposes analyze() + analyze_raw_text() for the API layer.
"""

import io
import re
import math
from collections import Counter
from string import punctuation

# ── Optional heavy deps (graceful degradation) ───────────────────────────────
try:
    import pdfplumber
    _PDF_OK = True
except ImportError:
    _PDF_OK = False

try:
    from docx import Document as DocxDocument
    _DOCX_OK = True
except ImportError:
    _DOCX_OK = False

try:
    from textblob import TextBlob
    _BLOB_OK = True
except ImportError:
    _BLOB_OK = False

try:
    import nltk
    from nltk.corpus import stopwords
    try:
        _STOPWORDS = set(stopwords.words("english"))
    except LookupError:
        nltk.download("stopwords", quiet=True)
        _STOPWORDS = set(stopwords.words("english"))
    _NLTK_OK = True
except Exception:
    _STOPWORDS = set()
    _NLTK_OK = False

# Fallback minimal stop-word list when NLTK is unavailable
_MINIMAL_STOPS = {
    "the","a","an","and","or","but","in","on","at","to","for","of","with",
    "by","from","up","about","into","through","during","is","are","was",
    "were","be","been","being","have","has","had","do","does","did","will",
    "would","could","should","may","might","shall","can","not","no","nor",
    "so","yet","both","either","neither","as","if","then","than","that",
    "this","these","those","i","you","he","she","it","we","they","what",
    "which","who","whom","my","your","his","her","its","our","their",
}

STOP_WORDS: set = _STOPWORDS if _NLTK_OK else _MINIMAL_STOPS

WORDS_PER_MINUTE = 200  # average adult reading speed


# ── Text Extraction ───────────────────────────────────────────────────────────

def _extract_txt(file_bytes: bytes) -> str:
    """Decode plain-text bytes (UTF-8 with BOM fallback)."""
    try:
        return file_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        return file_bytes.decode("latin-1", errors="replace")


def _extract_pdf(file_bytes: bytes) -> str:
    if not _PDF_OK:
        raise ValueError("pdfplumber is not installed. Cannot parse PDF files.")
    pages = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                pages.append(text)
    return "\n".join(pages)


def _extract_docx(file_bytes: bytes) -> str:
    if not _DOCX_OK:
        raise ValueError("python-docx is not installed. Cannot parse DOCX files.")
    doc = DocxDocument(io.BytesIO(file_bytes))
    return "\n".join(para.text for para in doc.paragraphs)


def extract_text(filename: str, file_bytes: bytes) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    extractors = {"txt": _extract_txt, "pdf": _extract_pdf, "docx": _extract_docx}
    if ext not in extractors:
        raise ValueError(f"Unsupported file extension: '.{ext}'")
    text = extractors[ext](file_bytes)
    if not text or not text.strip():
        raise ValueError("The document appears to be empty or has no extractable text.")
    return text


# ── NLP Metrics ──────────────────────────────────────────────────────────────

def _tokenize_words(text: str) -> list[str]:
    """Simple regex word tokenizer — no NLTK required."""
    return re.findall(r"\b[a-zA-Z]+\b", text.lower())


def _count_sentences(text: str) -> int:
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    return max(len([s for s in sentences if s.strip()]), 1)


def _reading_time(word_count: int) -> str:
    minutes = word_count / WORDS_PER_MINUTE
    if minutes < 1:
        secs = math.ceil(minutes * 60)
        return f"{secs} sec read"
    mins = int(minutes)
    secs = int((minutes - mins) * 60)
    parts = [f"{mins} min"] + ([f"{secs} sec"] if secs else [])
    return " ".join(parts) + " read"


def _top_keywords(words: list[str], n: int = 10) -> list[dict]:
    filtered = [w for w in words if w not in STOP_WORDS and len(w) > 2]
    freq = Counter(filtered)
    return [{"word": w, "count": c} for w, c in freq.most_common(n)]


def _sentiment(text: str) -> dict:
    if not _BLOB_OK:
        return {"label": "Neutral", "polarity": 0.0, "subjectivity": 0.0}
    blob = TextBlob(text)
    polarity: float = round(blob.sentiment.polarity, 4)
    subjectivity: float = round(blob.sentiment.subjectivity, 4)
    if polarity > 0.05:
        label = "Positive"
    elif polarity < -0.05:
        label = "Negative"
    else:
        label = "Neutral"
    return {"label": label, "polarity": polarity, "subjectivity": subjectivity}


def _compute_metrics(text: str) -> dict:
    words = _tokenize_words(text)
    total_words = len(words)
    unique_words = len(set(words))
    total_sentences = _count_sentences(text)
    total_chars = len(text)
    total_chars_no_spaces = len(text.replace(" ", ""))
    avg_words_per_sentence = round(total_words / total_sentences, 1)
    lexical_richness = round((unique_words / total_words * 100), 1) if total_words else 0

    return {
        "total_words": total_words,
        "total_sentences": total_sentences,
        "total_characters": total_chars,
        "total_characters_no_spaces": total_chars_no_spaces,
        "unique_word_count": unique_words,
        "avg_words_per_sentence": avg_words_per_sentence,
        "lexical_richness_pct": lexical_richness,
        "reading_time": _reading_time(total_words),
        "keywords": _top_keywords(words),
        "sentiment": _sentiment(text),
    }


# ── Public API ────────────────────────────────────────────────────────────────

def analyze(filename: str, file_bytes: bytes) -> dict:
    """Analyze a document file and return NLP metrics."""
    text = extract_text(filename, file_bytes)
    return _compute_metrics(text)


def analyze_raw_text(text: str) -> dict:
    """Analyze a raw text string and return NLP metrics."""
    if not text or not text.strip():
        raise ValueError("Text cannot be empty.")
    return _compute_metrics(text)
