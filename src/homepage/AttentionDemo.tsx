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
 * Interactive attention-verification demo. Uses the app's real check bank,
 * its real option shuffling, its real strip-before-commit logic, and its
 * real guess-adjusted score formula — nothing is re-implemented here.
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
  const previousCheckIndexRef = checkIndex;

  const [stored, setStored] = useState<{
    record: Record<string, unknown>;
    stripped: Record<string, unknown>;
    score: number | null;
  } | null>(null);

  const runAnother = () => {
    let next = Math.floor(Math.random() * ATTENTION_CHECKS.length);
    if (next === previousCheckIndexRef && ATTENTION_CHECKS.length > 1) {
      next = (next + 1) % ATTENTION_CHECKS.length;
    }
    setCheckIndex(next);
    setAnswered(null);
  };

  const answer = (value: string) => {
    const correct = value === check.correctValue;
    const values: Record<string, unknown> = {
      site_code: "VA-023",
      building_type: "building-house",
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
    <div className="hp-attention">
      {!answered ? (
        <>
          <span className="chip">Quick check</span>
          <h3>{check.prompt}</h3>
          <div className="hp-attention-options">
            {options.map((option) => (
              <button
                type="button"
                className="choice-button"
                key={option.value}
                onClick={() => answer(option.value)}
              >
                <span>{option.label}</span>
                <span className="choice-check" />
              </button>
            ))}
          </div>
        </>
      ) : (
        stored && (
          <div className="hp-attention-result">
            <div className="hp-record">
              <p className="record-label">What the dataset stores</p>
              <pre className="record-json">
                {JSON.stringify(stored.record, null, 2)}
              </pre>
            </div>
            <div className="hp-record">
              <p className="record-label">What never enters the payload</p>
              <pre className="record-json record-stripped">
                {JSON.stringify(stored.stripped, null, 2)}
              </pre>
            </div>
            <p className="muted">
              {answered.correct
                ? "Correct — verified server-side against collect's own bank. This observation contributes one correct answer to the contributor's guess-adjusted attention score:"
                : "Incorrect — verified server-side against collect's own bank. One missed check lowers the contributor's guess-adjusted attention score:"}{" "}
              <strong>
                {stored.score === null
                  ? "no score yet"
                  : `${Math.round(stored.score * 100)}/100`}
              </strong>{" "}
              (0 = indistinguishable from blind guessing, 100 = perfect). The
              score is exported with the dataset.
            </p>
            <Button variant="secondary" onClick={runAnother}>
              <Icon name="refresh" size={15} /> Run another check
            </Button>
          </div>
        )
      )}
    </div>
  );
}
