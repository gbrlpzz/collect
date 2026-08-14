import { useState } from "react";
import { Button } from "../components/ui";
import { Icon } from "../components/Icon";
import {
  ATTENTION_CHECKS,
  ATTENTION_FIELD_KEY,
  shuffleOptions,
} from "../data/attentionChecks";
import { attentionScore, extractAttentionResponse } from "../lib/attention";

interface HistoryRecord {
  checkKey: string;
  selectedValue: string;
  correct: boolean;
  guessProbability: number;
}

/**
 * Interactive attention-verification studio. Uses the app's real check bank,
 * its real option shuffling, its real strip-before-commit logic, and its
 * real guess-adjusted score formula.
 */
export function AttentionDemo() {
  const [checkIndex, setCheckIndex] = useState(() =>
    Math.floor(Math.random() * ATTENTION_CHECKS.length),
  );
  const [history, setHistory] = useState<HistoryRecord[]>([]);

  const [currentAnswer, setCurrentAnswer] = useState<{
    checkKey: string;
    selectedValue: string;
    correct: boolean;
    storedRecord: Record<string, unknown>;
    strippedRecord: Record<string, unknown>;
  } | null>(null);

  const check = ATTENTION_CHECKS[checkIndex];
  const options = shuffleOptions(check);

  const handleAnswer = (value: string) => {
    const correct = value === check.correctValue;
    const values: Record<string, unknown> = {
      site_code: "VA-023",
      building_type: "building-house",
      masonry_type: "coursed-ashlar",
      [ATTENTION_FIELD_KEY]: `${check.key}:${value}`,
    };
    const { values: cleaned, response } = extractAttentionResponse(values);

    const newHistory = [
      ...history,
      {
        checkKey: check.key,
        selectedValue: value,
        correct,
        guessProbability: check.guessProbability,
      },
    ];
    setHistory(newHistory);

    setCurrentAnswer({
      checkKey: check.key,
      selectedValue: value,
      correct,
      storedRecord: {
        check_key: check.key,
        selected_value: value,
        correct,
        attention_failed: !correct,
        guess_probability: check.guessProbability,
      },
      strippedRecord: {
        values_before_commit: values,
        values_after_commit: cleaned,
        extracted: response,
      },
    });
  };

  const handleNext = () => {
    let next = Math.floor(Math.random() * ATTENTION_CHECKS.length);
    if (next === checkIndex && ATTENTION_CHECKS.length > 1) {
      next = (next + 1) % ATTENTION_CHECKS.length;
    }
    setCheckIndex(next);
    setCurrentAnswer(null);
  };

  const handleReset = () => {
    setHistory([]);
    setCurrentAnswer(null);
    setCheckIndex(0);
  };

  const cumulativeScore = attentionScore(
    history.map((h) => ({
      correct: h.correct,
      guessProbability: h.guessProbability,
    })),
  );

  const totalChecks = history.length;
  const correctChecks = history.filter((h) => h.correct).length;

  return (
    <div className="hp-attention-studio">
      {/* Studio Header: Live scoring metrics */}
      <div className="hp-attention-topbar">
        <div className="hp-attention-metric">
          <span className="hp-metric-label">Surveyor Reliability Index</span>
          <div className="hp-metric-value-row">
            <strong className="hp-metric-value">
              {cumulativeScore === null
                ? "100/100"
                : `${Math.round(cumulativeScore * 100)}/100`}
            </strong>
            <span
              className={`hp-metric-status ${
                cumulativeScore === null || cumulativeScore >= 0.8
                  ? "hp-status-good"
                  : cumulativeScore >= 0.5
                    ? "hp-status-mid"
                    : "hp-status-bad"
              }`}
            >
              {cumulativeScore === null || cumulativeScore >= 0.8
                ? "High Attention"
                : cumulativeScore >= 0.5
                  ? "Degraded Attention"
                  : "Random Guessing"}
            </span>
          </div>
        </div>

        <div className="hp-attention-stats">
          <div className="hp-stat-chip">
            <span className="hp-stat-name">Checks</span>
            <strong>{totalChecks}</strong>
          </div>
          <div className="hp-stat-chip">
            <span className="hp-stat-name">Correct</span>
            <strong>{correctChecks}</strong>
          </div>
          <div className="hp-stat-chip">
            <span className="hp-stat-name">Chance</span>
            <strong>25%</strong>
          </div>
        </div>
      </div>

      {!currentAnswer ? (
        <div className="hp-attention-question-card">
          <div className="hp-attention-card-header">
            <div className="hp-tag-row">
              <span className="chip">Cognitive Check</span>
              <span className="hp-subtag">
                Question {totalChecks + 1} · 4 options
              </span>
            </div>
            <p className="hp-prompt-hint">
              Simulates an unannounced attention step presented during field
              data entry:
            </p>
          </div>

          <h3 className="hp-prompt-text">{check.prompt}</h3>

          <div className="hp-attention-options-grid">
            {options.map((option) => (
              <button
                type="button"
                className="choice-button hp-attention-btn"
                key={option.value}
                onClick={() => handleAnswer(option.value)}
              >
                <span>{option.label}</span>
                <span className="choice-check" />
              </button>
            ))}
          </div>
          <p className="hp-hint-footnote">
            Answer correctly or deliberately miss to watch the guess-adjusted
            Bayesian reliability index recalculate.
          </p>
        </div>
      ) : (
        <div className="hp-attention-resolution">
          <div
            className={`hp-resolution-banner ${
              currentAnswer.correct ? "hp-banner-correct" : "hp-banner-missed"
            }`}
          >
            <div className="hp-banner-icon">
              <Icon name={currentAnswer.correct ? "check" : "x"} size={18} />
            </div>
            <div className="hp-banner-text">
              <strong>
                {currentAnswer.correct
                  ? "Verified correct against collect bank"
                  : "Missed check — recorded in provenance as failed"}
              </strong>
              <p>
                {currentAnswer.correct
                  ? "Contributor followed the literal directive. Observation marked valid."
                  : "Contributor tapped without reading. Flagged for surveyor fatigue without corrupting research variables."}
              </p>
            </div>
          </div>

          {/* Visual Strip-before-commit Pipeline */}
          <div className="hp-pipeline-view">
            <div className="hp-pipeline-step">
              <div className="hp-pipeline-badge">
                1. Contributed State (Form)
              </div>
              <div className="hp-pipeline-body">
                <code>
                  &#123; site_code: &quot;VA-023&quot;, masonry_type:
                  &quot;coursed-ashlar&quot;, _attn: &quot;
                  {check.key}:{currentAnswer.selectedValue}&quot; &#125;
                </code>
              </div>
            </div>

            <div className="hp-pipeline-arrow">
              <Icon name="arrow-down" size={14} />
              <span>Client-Side Strip before commit</span>
            </div>

            <div className="hp-pipeline-split">
              <div className="hp-pipeline-box hp-box-clean">
                <div className="hp-box-label">
                  <span className="dot dot-clean" /> Clean Research Payload
                </div>
                <p className="hp-box-desc">
                  Pure scientific observation — zero attention check artifacts
                  reach the database payload.
                </p>
                <code>
                  &#123; &quot;site_code&quot;: &quot;VA-023&quot;,
                  &quot;masonry_type&quot;: &quot;coursed-ashlar&quot; &#125;
                </code>
              </div>

              <div className="hp-pipeline-box hp-box-meta">
                <div className="hp-box-label">
                  <span className="dot dot-meta" /> Provenance Metadata
                </div>
                <p className="hp-box-desc">
                  Stored in separate provenance table with guess probability.
                </p>
                <code>
                  &#123; &quot;bank_check&quot;: &quot;{check.key}&quot;,
                  &quot;correct&quot;: {String(currentAnswer.correct)} &#125;
                </code>
              </div>
            </div>
          </div>

          {/* Raw Schema Records Grid */}
          <div className="hp-record-grid">
            <div className="hp-record">
              <div className="record-header">
                <span className="record-dot record-dot-stored" />
                <p className="record-label">What the dataset stores</p>
              </div>
              <pre className="record-json">
                {JSON.stringify(currentAnswer.storedRecord, null, 2)}
              </pre>
            </div>
            <div className="hp-record">
              <div className="record-header">
                <span className="record-dot record-dot-stripped" />
                <p className="record-label">What never enters the payload</p>
              </div>
              <pre className="record-json record-stripped">
                {JSON.stringify(currentAnswer.strippedRecord, null, 2)}
              </pre>
            </div>
          </div>

          <div className="hp-attention-controls">
            <Button variant="primary" onClick={handleNext}>
              <Icon name="refresh" size={15} /> Test another question
            </Button>
            {history.length > 1 && (
              <Button variant="secondary" onClick={handleReset}>
                Reset scoring trials
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
