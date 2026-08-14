import { useState } from "react";
import { Button } from "../components/ui";
import { Icon } from "../components/Icon";
import { FieldRenderer } from "../components/FieldRenderer";
import { ATTENTION_CHECKS } from "../data/attentionChecks";
import { attentionFieldFor, attentionScore } from "../lib/attention";

/**
 * Interactive attention-verification explanation. It renders the check with
 * the app's real FieldRenderer (the exact component the live collector uses),
 * built from the real attention bank via attentionFieldFor, then shows the
 * real strip-before-commit logic and guess-adjusted formula.
 */
export function AttentionDemo() {
  const [checkIndex, setCheckIndex] = useState(() =>
    Math.floor(Math.random() * ATTENTION_CHECKS.length),
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState<{
    checkKey: string;
    selectedValue: string;
    correct: boolean;
  } | null>(null);

  const check = ATTENTION_CHECKS[checkIndex];
  const field = attentionFieldFor(check);

  const [stored, setStored] = useState<{
    record: Record<string, unknown>;
    score: number | null;
  } | null>(null);

  const handleNext = () => {
    let next = Math.floor(Math.random() * ATTENTION_CHECKS.length);
    if (next === checkIndex && ATTENTION_CHECKS.length > 1) {
      next = (next + 1) % ATTENTION_CHECKS.length;
    }
    setCheckIndex(next);
    setSelected(null);
    setAnswered(null);
    setStored(null);
  };

  const handleAnswer = (value: unknown) => {
    const optionId = typeof value === "string" ? value : "";
    const selectedValue = optionId.split(":").slice(1).join(":");
    const correct = selectedValue === check.correctValue;
    const score = attentionScore([
      { correct, guessProbability: check.guessProbability },
    ]);

    setSelected(optionId);
    setAnswered({
      checkKey: check.key,
      selectedValue,
      correct,
    });

    setStored({
      record: {
        check_key: check.key,
        selected_value: selectedValue,
        correct,
        attention_failed: !correct,
        guess_probability: check.guessProbability,
        reliability_score:
          score === null ? "0/100" : `${Math.round(score * 100)}/100`,
      },
      score,
    });
  };

  return (
    <div className="hp-attention-clean">
      {!answered ? (
        <div className="hp-attention-flow">
          <div className="hp-attention-prompt-box">
            <span className="eyebrow">Verification Check</span>
            <h3 className="hp-attention-title">{check.prompt}</h3>
            <p className="hp-attention-desc">
              Interleaved during active surveys. Select an option to inspect
              scoring.
            </p>
          </div>

          <FieldRenderer
            field={field}
            value={selected}
            onChange={handleAnswer}
            onCaptureLocation={() => undefined}
            onAddPhoto={() => undefined}
            required
          />
        </div>
      ) : (
        stored && (
          <div className="hp-attention-result-clean">
            <div className="hp-result-summary">
              <p>
                <strong>
                  {answered.correct
                    ? "✓ Instruction followed"
                    : "✕ Instruction missed"}
                </strong>{" "}
                · Reliability score:{" "}
                <strong>
                  {stored.score === null
                    ? "0/100"
                    : `${Math.round(stored.score * 100)}/100`}
                </strong>
                . Prompt text is stripped in memory before database commit.
              </p>
            </div>

            <div className="hp-record">
              <div className="record-header">
                <p className="record-label">Audit Record Stored</p>
              </div>
              <pre className="record-json">
                {JSON.stringify(stored.record, null, 2)}
              </pre>
            </div>

            <div className="hp-attention-actions">
              <Button variant="secondary" onClick={handleNext}>
                <Icon name="refresh" size={15} /> Try another check
              </Button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
