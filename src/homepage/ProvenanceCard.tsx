import { useEffect, useState } from "react";
import { collectEnvironment, type EnvironmentInfo } from "../lib/deviceInfo";
import { Icon } from "../components/Icon";

/**
 * Live hardware and environment provenance display.
 * Shows the actual JSON payload collected from the device at submission time,
 * without decorative widgets or simulated status indicators.
 */
export function ProvenanceCard() {
  const [environment, setEnvironment] = useState<EnvironmentInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    void collectEnvironment().then((env) => {
      if (!cancelled) setEnvironment(env);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="hp-provenance-clean">
      <p className="hp-provenance-intro">
        Submissions capture ambient hardware context (battery state, connection
        type, viewport dimensions). Missing or restricted APIs never prevent a
        local record from committing.
      </p>

      <div className="hp-record">
        <div className="record-header">
          <p className="record-label">Ambient Hardware & Environment Record</p>
        </div>
        <pre className="record-json">
          {JSON.stringify(
            environment ?? {
              status: "Reading device telemetry…",
            },
            null,
            2,
          )}
        </pre>
      </div>
    </div>
  );
}
