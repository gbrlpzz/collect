import { useEffect, useState } from "react";
import { collectEnvironment, type EnvironmentInfo } from "../lib/deviceInfo";
import { Icon } from "../components/Icon";

/**
 * Live provenance card: reads the visitor's actual device and ambient runtime
 * with the app's own environment collector (src/lib/deviceInfo.ts).
 * Shows how hardware metadata is passively attached without fingerprinting
 * or blocking offline saves.
 */
export function ProvenanceCard() {
  const [environment, setEnvironment] = useState<EnvironmentInfo | null>(null);
  const [simulatedScenario, setSimulatedScenario] = useState<"live" | "harsh">(
    "live",
  );

  useEffect(() => {
    let cancelled = false;
    void collectEnvironment().then((env) => {
      if (!cancelled) setEnvironment(env);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const displayedEnv: EnvironmentInfo | null =
    simulatedScenario === "harsh"
      ? {
          capturedAt: new Date().toISOString(),
          timezone: "Europe/Madrid",
          language: "es-ES",
          deviceModel: "iPhone 15 (6.1-inch)",
          deviceOs: "iOS 17.4",
          browser: "Safari (PWA Container)",
          platform: "iPhone",
          screen: "1179x2556",
          orientation: "portrait-primary",
          pixelRatio: 3,
          hardwareConcurrency: 6,
          deviceMemory: null,
          connection: {
            type: "none (offline)",
            downlink: 0,
            rtt: 0,
            saveData: true,
          },
          battery: { level: 0.18, charging: false },
          online: false,
        }
      : environment;

  return (
    <div className="hp-provenance-studio">
      {/* Top status bar */}
      <div className="hp-provenance-topbar">
        <div className="hp-provenance-status">
          <span
            className={`hp-live-indicator ${
              simulatedScenario === "harsh" ? "hp-ind-sim" : "hp-ind-live"
            }`}
          />
          <strong>
            {simulatedScenario === "harsh"
              ? "Harsh Fieldwork Simulation"
              : displayedEnv
                ? "Live Device Telemetry"
                : "Reading hardware…"}
          </strong>
        </div>

        <div
          className="hp-scenario-toggle"
          role="group"
          aria-label="Telemetry source"
        >
          <button
            type="button"
            className={`hp-toggle-btn ${
              simulatedScenario === "live" ? "active" : ""
            }`}
            onClick={() => setSimulatedScenario("live")}
          >
            Live Probe
          </button>
          <button
            type="button"
            className={`hp-toggle-btn ${
              simulatedScenario === "harsh" ? "active" : ""
            }`}
            onClick={() => setSimulatedScenario("harsh")}
          >
            Field Sim
          </button>
        </div>
      </div>

      {/* Structured metrics grid */}
      <div className="hp-telemetry-sections">
        {/* Device & Hardware Group */}
        <div className="hp-telemetry-group">
          <div className="hp-group-title">
            <Icon name="phone" size={13} />
            <span>Hardware & Screen</span>
          </div>
          <div className="hp-telemetry-grid">
            <div className="hp-telemetry-item">
              <span className="hp-tel-label">Identified Model</span>
              <strong className="hp-tel-val">
                {displayedEnv?.deviceModel ?? "Analyzing…"}
              </strong>
            </div>
            <div className="hp-telemetry-item">
              <span className="hp-tel-label">Operating System</span>
              <strong className="hp-tel-val">
                {displayedEnv?.deviceOs ?? "—"}
              </strong>
            </div>
            <div className="hp-telemetry-item">
              <span className="hp-tel-label">Viewport Resolution</span>
              <strong className="hp-tel-val">
                {displayedEnv?.screen
                  ? `${displayedEnv.screen} @ ${displayedEnv.pixelRatio}x`
                  : "—"}
              </strong>
            </div>
            <div className="hp-telemetry-item">
              <span className="hp-tel-label">Orientation</span>
              <strong className="hp-tel-val">
                {displayedEnv?.orientation ?? "portrait"}
              </strong>
            </div>
          </div>
        </div>

        {/* Runtime & Ambient Environment Group */}
        <div className="hp-telemetry-group">
          <div className="hp-group-title">
            <Icon name="clock" size={13} />
            <span>Runtime & Environment</span>
          </div>
          <div className="hp-telemetry-grid">
            <div className="hp-telemetry-item">
              <span className="hp-tel-label">Timezone (IANA)</span>
              <strong className="hp-tel-val">
                {displayedEnv?.timezone ?? "—"}
              </strong>
            </div>
            <div className="hp-telemetry-item">
              <span className="hp-tel-label">Locale Language</span>
              <strong className="hp-tel-val">
                {displayedEnv?.language ?? "—"}
              </strong>
            </div>
            <div className="hp-telemetry-item">
              <span className="hp-tel-label">Network Link</span>
              <strong className="hp-tel-val">
                {displayedEnv?.connection?.type
                  ? displayedEnv.connection.type
                  : displayedEnv?.online
                    ? "Online (unmetered)"
                    : "Offline (zero signal)"}
              </strong>
            </div>
            <div className="hp-telemetry-item">
              <span className="hp-tel-label">Battery Level</span>
              <strong className="hp-tel-val">
                {displayedEnv?.battery?.level !== null &&
                displayedEnv?.battery?.level !== undefined
                  ? `${Math.round(displayedEnv.battery.level * 100)}%${
                      displayedEnv.battery.charging ? " (charging)" : ""
                    }`
                  : "Hardware guarded"}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Non-blocking guarantee callout */}
      <div className="hp-provenance-callout">
        <div className="hp-callout-icon">
          <Icon name="lock" size={14} />
        </div>
        <p>
          <strong>Non-blocking invariant:</strong> Telemetry is gathered
          asynchronously during observation creation. If device permissions or
          unsupported browser APIs fail, the observation commits to IndexedDB in
          under 5ms without interruption.
        </p>
      </div>

      {/* Raw JSON toggle */}
      <details className="hp-payload hp-provenance-payload">
        <summary>
          <Icon name="file" size={14} />
          <span>Inspect raw ambient telemetry JSON</span>
        </summary>
        <pre className="record-json">
          {JSON.stringify(displayedEnv ?? { loading: true }, null, 2)}
        </pre>
      </details>
    </div>
  );
}
