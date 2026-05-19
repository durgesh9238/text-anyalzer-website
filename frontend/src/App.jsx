/**
 * App.jsx — Deep Document Analyzer PRO
 * Main application entry: 3D background, upload form, results dashboard.
 * Supports both file upload AND direct text paste modes.
 */
import { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import Background3D from './components/Background3D';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import './index.css';

const API_FILE_URL = 'http://localhost:8000/api/analyze';
const API_TEXT_URL = 'http://localhost:8000/api/analyze-text';
const ACCEPTED     = ['.txt', '.pdf', '.docx'];
const MAX_CHARS    = 200_000;

/* ── Tab Bar ── */
function TabBar({ active, onChange }) {
  return (
    <div className="tab-bar" role="tablist">
      <button
        id="tab-upload"
        className={`tab-btn${active === 'upload' ? ' active' : ''}`}
        role="tab"
        aria-selected={active === 'upload'}
        aria-controls="panel-upload"
        onClick={() => onChange('upload')}
      >
        <span className="tab-icon">📁</span> Upload File
      </button>
      <button
        id="tab-paste"
        className={`tab-btn${active === 'paste' ? ' active' : ''}`}
        role="tab"
        aria-selected={active === 'paste'}
        aria-controls="panel-paste"
        onClick={() => onChange('paste')}
      >
        <span className="tab-icon">📋</span> Paste Text
      </button>
    </div>
  );
}

/* ── Upload Panel ── */
function UploadPanel({ onResult }) {
  const [file, setFile]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) { setFile(selected); setError(''); }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) { setFile(dropped); setError(''); }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Please select a document to analyze.'); return; }

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['txt', 'pdf', 'docx'].includes(ext)) {
      setError('Unsupported file type. Please upload a .txt, .pdf, or .docx file.');
      return;
    }

    setLoading(true); setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axios.post(API_FILE_URL, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form
      id="panel-upload"
      role="tabpanel"
      aria-labelledby="tab-upload"
      className="upload-section"
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Drop Zone */}
      <div
        className={`upload-zone${dragOver ? ' drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.pdf,.docx"
          onChange={handleFileChange}
          id="document-upload"
          aria-label="Upload document for analysis"
          onClick={(e) => e.stopPropagation()}
        />
        <span className="upload-icon">🚀</span>
        <h3>{dragOver ? 'Drop it here!' : 'Upload Your Document'}</h3>
        <p>Drag &amp; drop your file here, or click to browse</p>
        <div className="format-chips">
          {ACCEPTED.map((f) => <span key={f} className="format-chip">{f}</span>)}
        </div>
      </div>

      {/* Selected File */}
      {file && (
        <motion.div
          className="file-selected"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          ✅ <strong>{file.name}</strong>
          <span style={{ color: 'rgba(34,211,162,0.6)', marginLeft: 'auto', fontSize: '0.8rem' }}>
            {(file.size / 1024).toFixed(1)} KB
          </span>
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <motion.div className="error-banner" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          <span>⚠️</span> {error}
        </motion.div>
      )}

      {/* Action */}
      {loading ? (
        <motion.div className="loading-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="spinner" />
          <p>Extracting text and running NLP analysis…</p>
        </motion.div>
      ) : (
        <motion.button
          type="submit"
          className="btn-analyze"
          disabled={!file || loading}
          whileHover={file ? { scale: 1.01 } : {}}
          whileTap={file ? { scale: 0.99 } : {}}
          id="analyze-btn"
          aria-label="Start document analysis"
        >
          🔬 Analyze Document
        </motion.button>
      )}
    </motion.form>
  );
}

/* ── Paste Text Panel ── */
function PastePanel({ onResult }) {
  const [text, setText]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const charCount = text.length;
  const overLimit = charCount > MAX_CHARS;

  const handleClear = () => { setText(''); setError(''); };

  const handlePaste = async (e) => {
    e.preventDefault();
    if (!text.trim()) { setError('Please enter or paste some text first.'); return; }
    if (overLimit) { setError(`Text exceeds the ${MAX_CHARS.toLocaleString()}-character limit.`); return; }

    setLoading(true); setError('');
    try {
      const response = await axios.post(API_TEXT_URL, { text });
      onResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      id="panel-paste"
      role="tabpanel"
      aria-labelledby="tab-paste"
      className="paste-section"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Textarea header */}
      <div className="paste-header">
        <span className="paste-label">✍️ Paste or type your text below</span>
        <div className="paste-header-actions">
          <span className={`char-counter${overLimit ? ' over-limit' : ''}`}>
            {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()} chars
          </span>
          {text && (
            <motion.button
              className="btn-clear"
              type="button"
              onClick={handleClear}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              id="clear-text-btn"
              aria-label="Clear text"
            >
              ✕ Clear
            </motion.button>
          )}
        </div>
      </div>

      {/* Textarea */}
      <textarea
        className={`paste-textarea${overLimit ? ' over-limit' : ''}`}
        id="paste-textarea"
        placeholder="Paste your article, essay, report, or any text here…"
        value={text}
        onChange={(e) => { setText(e.target.value); setError(''); }}
        rows={12}
        aria-label="Text input for analysis"
        spellCheck="true"
      />

      {/* Char bar */}
      <div className="char-bar-bg">
        <motion.div
          className={`char-bar-fill${overLimit ? ' over-limit' : ''}`}
          animate={{ width: `${Math.min((charCount / MAX_CHARS) * 100, 100)}%` }}
          transition={{ duration: 0.15 }}
        />
      </div>

      {/* Error */}
      {error && (
        <motion.div className="error-banner" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          <span>⚠️</span> {error}
        </motion.div>
      )}

      {/* Action */}
      {loading ? (
        <motion.div className="loading-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="spinner" />
          <p>Running NLP analysis on your text…</p>
        </motion.div>
      ) : (
        <motion.button
          type="button"
          className="btn-analyze"
          disabled={!text.trim() || loading || overLimit}
          onClick={handlePaste}
          whileHover={text.trim() && !overLimit ? { scale: 1.01 } : {}}
          whileTap={text.trim() && !overLimit ? { scale: 0.99 } : {}}
          id="analyze-text-btn"
          aria-label="Analyze pasted text"
        >
          🔬 Analyze Text
        </motion.button>
      )}
    </motion.div>
  );
}

/* ── App Root ── */
export default function App() {
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('upload');

  const handleResult = (data) => setResult(data);
  const handleReset  = () => setResult(null);

  return (
    <>
      {/* Full-screen 3D Anti-Gravity Background */}
      <Background3D />

      {/* Main UI */}
      <div className="page-wrapper">
        {/* Hero Header */}
        <header className="app-header">
          <div className="badge">⚡ Powered by NLP &amp; AI</div>
          <h1>Deep Document<br />Analyzer PRO</h1>
          <p>
            Upload a document <em>or paste text directly</em> and receive enterprise-grade NLP insights —
            sentiment, keywords, readability, and more — in seconds.
          </p>
        </header>

        {/* Glass Card */}
        <main className="glass-card" role="main">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              >
                <AnalyticsDashboard data={result} onReset={handleReset} />
              </motion.div>
            ) : (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                {/* Tab Bar */}
                <TabBar active={activeTab} onChange={setActiveTab} />

                {/* Tab Panels */}
                <AnimatePresence mode="wait">
                  {activeTab === 'upload' ? (
                    <UploadPanel key="upload" onResult={handleResult} />
                  ) : (
                    <PastePanel key="paste" onResult={handleResult} />
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </>
  );
}
