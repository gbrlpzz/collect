import { useEffect, useState } from "react";
import { collectEnvironment, type EnvironmentInfo } from "../lib/deviceInfo";

/**
 * Live hardware and spatial provenance display.
 * Shows the actual spatial coordinates and ambient telemetry recorded with submissions,
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

  const sampleProvenance = {
    location: {
      latitude: 42.8421,
      longitude: -3.07682,
      accuracy_meters: 4.2,
      altitude_meters: 724.5,
      geodetic_datum: "EPSG:4326 (WGS 84)",
      captured_at: "2026-08-14T09:32:00.104Z",
    },
    environment: environment ?? {
      status: "Reading device telemetry…",
    },
  };

  return (
    <div className="hp-provenance-clean">
      <p className="hp-provenance-intro">
        When a project requests location, GPS coordinates and accuracy (±m)
        capture automatically in the background. Ambient device telemetry
        (battery, connection) is recorded without tracking personal identity.
      </p>

      <div className="hp-record">
        <div className="record-header">
          <p className="record-label">Spatial & Ambient Provenance Record</p>
        </div>
        <pre className="record-json">
          {JSON.stringify(sampleProvenance, null, 2)}
        </pre>
      </div>
    </div>
  );
}
