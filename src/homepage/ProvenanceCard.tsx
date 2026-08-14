import { useEffect, useState } from "react";
import { collectEnvironment, type EnvironmentInfo } from "../lib/deviceInfo";
import { Icon } from "../components/Icon";

/**
 * Live provenance card: reads the visitor's device with the app's own
 * environment collector (src/lib/deviceInfo.ts), showing exactly the record
 * that rides along with every submission.
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

  const rows: Array<[string, string]> = environment
    ? [
        ["Platform", environment.platform],
        ["Operating system", environment.deviceOs],
        ["Browser", environment.browser],
        ["Screen", environment.screen],
        ["Timezone", environment.timezone],
        ["Language", environment.language],
        [
          "Connection",
          environment.connection?.type
            ? `${environment.connection.type}${environment.connection.saveData ? " (save-data)" : ""}`
            : "not exposed",
        ],
        [
          "Battery",
          environment.battery?.level === null || environment.battery === null
            ? "not exposed"
            : `${Math.round(environment.battery.level * 100)}%${environment.battery.charging ? " · charging" : ""}`,
        ],
      ]
    : [];

  return (
    <div className="hp-provenance">
      <div className="hp-provenance-header">
        <div className="hp-provenance-status">
          <span className="status-dot" aria-hidden="true" />
          <span>
            {environment
              ? "Reading your device — live"
              : "Reading your device…"}
          </span>
        </div>
        <span className="hp-provenance-badge">Automatic Provenance</span>
      </div>

      <div className="hp-provenance-facts">
        {rows.map(([label, value]) => (
          <div className="hp-provenance-fact-row" key={label}>
            <span className="hp-fact-label">{label}</span>
            <strong className="hp-fact-value">{value}</strong>
          </div>
        ))}
      </div>

      <details className="hp-payload hp-provenance-payload">
        <summary>
          <Icon name="file" size={15} />
          <span>View raw provenance JSON</span>
        </summary>
        <pre className="record-json">
          {JSON.stringify(environment ?? { reading: true }, null, 2)}
        </pre>
      </details>
    </div>
  );
}
