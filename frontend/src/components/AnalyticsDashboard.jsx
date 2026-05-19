/**
 * AnalyticsDashboard.jsx
 * Displays all NLP metrics returned by the backend API.
 * Animated with framer-motion. Pure CSS styling.
 */
import { motion } from 'framer-motion';

/* ── Animation Variants ── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } },
};

/* ── Stat Card ── */
function MetricCard({ icon, label, value, unit }) {
  return (
    <motion.div className="metric-card" variants={itemVariants}>
      <span className="metric-icon">{icon}</span>
      <span className="metric-label">{label}</span>
      <div className="metric-value">
        {value}
        {unit && <span>{unit}</span>}
      </div>
    </motion.div>
  );
}

/* ── Sentiment Badge ── */
function SentimentDisplay({ sentiment }) {
  const { label, polarity, subjectivity } = sentiment;
  const cls = label.toLowerCase();

  const ICONS = { positive: '😊', negative: '😟', neutral: '😐' };

  // Polarity is -1 to 1; convert to 0-100 for the bar
  const polarityPct = Math.round(((polarity + 1) / 2) * 100);
  const subjectivityPct = Math.round(subjectivity * 100);

  return (
    <motion.div className="sentiment-section" variants={itemVariants}>
      <span className="section-label">Sentiment Analysis</span>
      <div className="sentiment-card">
        <motion.div
          className={`sentiment-badge ${cls}`}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 14 }}
        >
          {ICONS[cls]} {label} Tone
        </motion.div>

        <div className="sentiment-meta">
          <div className="score-row">
            <span>Polarity</span>
            <div className="score-bar">
              <motion.div
                className={`score-bar-fill ${cls}`}
                initial={{ width: 0 }}
                animate={{ width: `${polarityPct}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
              />
            </div>
            <span style={{ minWidth: '3rem' }}>{polarity > 0 ? '+' : ''}{polarity.toFixed(3)}</span>
          </div>
          <div className="score-row">
            <span>Subjectivity</span>
            <div className="score-bar">
              <motion.div
                className="score-bar-fill positive"
                initial={{ width: 0 }}
                animate={{ width: `${subjectivityPct}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.6 }}
              />
            </div>
            <span style={{ minWidth: '3rem' }}>{subjectivityPct}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Keywords ── */
function KeywordsDisplay({ keywords }) {
  const maxCount = keywords.length > 0 ? keywords[0].count : 1;

  return (
    <motion.div className="keywords-section" variants={itemVariants}>
      <span className="section-label">Top Keywords</span>
      <div className="keywords-list">
        {keywords.map((kw, i) => {
          const pct = Math.round((kw.count / maxCount) * 100);
          return (
            <motion.div
              key={kw.word}
              className="keyword-row"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
            >
              <span className="keyword-rank">#{i + 1}</span>
              <span className="keyword-word">{kw.word}</span>
              <div className="keyword-bar-wrap">
                <div className="keyword-bar-bg">
                  <motion.div
                    className="keyword-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.5 + i * 0.1 }}
                  />
                </div>
              </div>
              <span className="keyword-count">{kw.count}×</span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ── Main Dashboard ── */
export default function AnalyticsDashboard({ data, onReset }) {
  const { filename, file_size_kb, analysis } = data;
  const a = analysis;

  const metrics = [
    { icon: '📝', label: 'Total Words', value: a.total_words.toLocaleString() },
    { icon: '📖', label: 'Sentences', value: a.total_sentences.toLocaleString() },
    { icon: '🔤', label: 'Characters', value: a.total_characters.toLocaleString() },
    { icon: '⏱️', label: 'Reading Time', value: a.reading_time },
    { icon: '🎯', label: 'Unique Words', value: a.unique_word_count.toLocaleString() },
    { icon: '💎', label: 'Lexical Richness', value: `${a.lexical_richness_pct}`, unit: '%' },
    { icon: '📊', label: 'Avg Words/Sentence', value: `${a.avg_words_per_sentence}` },
    { icon: '📏', label: 'Chars (no spaces)', value: a.total_characters_no_spaces.toLocaleString() },
  ];

  return (
    <motion.div
      className="dashboard"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div className="dashboard-header" variants={itemVariants}>
        <div className="dashboard-header-left">
          <h2>Analysis Complete ✨</h2>
          <span className="filename">📄 {filename}</span>
        </div>
        <span className="file-size-badge">💾 {file_size_kb} KB</span>
      </motion.div>

      {/* Metrics Grid */}
      <motion.div className="metrics-grid" variants={containerVariants}>
        {metrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </motion.div>

      {/* Sentiment */}
      <SentimentDisplay sentiment={a.sentiment} />

      {/* Keywords */}
      <KeywordsDisplay keywords={a.keywords} />

      {/* Reset */}
      <motion.button
        className="btn-reset"
        onClick={onReset}
        variants={itemVariants}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        ↩ Analyze Another Document
      </motion.button>
    </motion.div>
  );
}
