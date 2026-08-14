import { useState } from "react";
import { Button } from "../components/ui";
import { Icon } from "../components/Icon";
import {
  ATTENTION_CHECKS,
  ATTENTION_FIELD_KEY,
  shuffleOptions,
} from "../data/attentionChecks";
import { attentionScore, extractAttentionResponse } from "../lib/attention";

/**
 * Interactive attention-verification explanation. Uses the app's real check bank,
 * real option shuffling, real strip-before-commit logic, and real guess-adjusted formula.
 * Displays the JSON records directly without decorative widgets.
 */
export function AttentionDemo() {
  const [checkIndex, setCheckIndex] = useState(() =>
    Math.floor(Math.random() * ATTENTION_CHECKS.length),
  );
  const [answered, setAnswered] = useState<{
    checkKey: string;
    selectedValue: string;
    correct: boolean;
  } | null>(null);

  const check = ATTENTION_CHECKS[checkIndex];
  const options = shuffleOptions(check);

  const [stored, setStored] = useState<{
    record: Record<string, unknown>;
    stripped: Record<string, unknown>;
    score: number | null;
  } | null>(null);

  const handleNext = () => {
    let next = Math.floor(Math.random() * ATTENTION_CHECKS.length);
    if (next === checkIndex && ATTENTION_CHECKS.length > 1) {
      next = (next + 1) % ATTENTION_CHECKS.length;
    }
    setCheckIndex(next);
    setAnswered(null);
    setStored(null);
  };

  const handleAnswer = (value: string) => {
    const correct = value === check.correctValue;
    const values: Record<string, unknown> = {
      site_code: "VA-023",
      building_type: "building-house",
      masonry_type: "coursed-ashlar",
      [ATTENTION_FIELD_KEY]: `${check.key}:${value}`,
    };
    const { values: cleaned, response } = extractAttentionResponse(values);
    const score = attentionScore([
      { correct, guessProbability: check.guessProbability },
    ]);

    setAnswered({
      checkKey: check.key,
      selectedValue: value,
      correct,
    });

    setStored({
      record: {
        check_key: check.key,
        selected_value: value,
        correct,
        attention_failed: !correct,
        guess_probability: check.guessProbability,
      },
      stripped: {
        values_before_commit: values,
        values_after_commit: cleaned,
        extracted: response,
      },
      score,
    });
  };

  return (
    <div className="hp-attention-clean">
      {!answered ? (
        <div className="hp-attention-flow">
          <div className="hp-attention-prompt-box">
            <span className="eyebrow">Interactive Verification Question</span>
            <h3 className="hp-attention-title">{check.prompt}</h3>
            <p className="hp-attention-desc">
              During fieldwork, questions like this appear unannounced between
              survey fields. Select an option below to see how collect isolates
              and evaluates the response.
            </p>
          </div>

          <div className="hp-attention-choices">
            {options.map((option) => (
              <button
                type="button"
                className="choice-button"
                key={option.value}
                onClick={() => handleAnswer(option.value)}
              >
                <span>{option.label}</span>
                <span className="choice-check" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        stored && (
          <div className="hp-attention-result-clean">
            <div className="hp-result-summary">
              <p>
                <strong>Result:</strong>{" "}
                {answered.correct
                  ? "Correct. Contributor followed the explicit prompt directive."
                  : "Failed. Contributor tapped without reading the prompt."}{" "}
                The raw question is evaluated against collect’s server bank with
                a 25% guess probability. The guess-adjusted attention score is{" "}
                <strong>
                  {stored.score === null
                    ? "0/100"
                    : `${Math.round(stored.score * 100)}/100`}
                </strong>
                .
              </p>
            </div>

            <div className="hp-record-grid">
              <div className="hp-record">
                <div className="record-header">
                  <p className="record-label">What the dataset stores</p>
                </div>
                <pre className="record-json">
                  {JSON.stringify(stored.record, null, 2)}
                </pre>
              </div>

              <div className="hp-record">
                <div className="record-header">
                  <p className="record-label">What never enters the payload</p>
                </div>
                <pre className="record-json record-stripped">
                  {JSON.stringify(stored.stripped, null, 2)}
                </pre>
              </div>
            </div>

            <div className="hp-attention-actions">
              <Button variant="secondary" onClick={handleNext}>
                <Icon name="refresh" size={15} /> Try another question
              </Button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
