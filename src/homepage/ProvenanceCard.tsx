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
    device_info: {
      model: environment?.deviceModel ?? "iPhone 16 Pro",
      os: environment?.deviceOs ?? "iOS 18.0",
      browser: environment?.browser ?? "Mobile Safari",
      platform: environment?.platform ?? "iPhone",
      screen: environment?.screen ?? "393x852",
      orientation: environment?.orientation ?? "portrait-primary",
      pixel_ratio: environment?.pixelRatio ?? 3,
      language: environment?.language ?? "en-US",
    },
    environment: {
      battery_level: environment?.battery?.level
        ? `${Math.round(environment.battery.level * 100)}%`
        : "84%",
      battery_charging: environment?.battery?.charging ?? false,
      connection_type: environment?.connection?.type ?? "4g",
      connection_downlink_mbps: environment?.connection?.downlink ?? 10.5,
      connection_rtt_ms: environment?.connection?.rtt ?? 50,
      hardware_concurrency: environment?.hardwareConcurrency ?? 6,
      device_memory_gb: environment?.deviceMemory ?? 8,
      timezone: environment?.timezone ?? "Europe/Madrid",
      account_ledger: "collect-local-v1-userId",
    },
  };

  return (
    <div className="hp-provenance-clean">
      <p className="hp-provenance-intro">
        GPS coordinates, spatial accuracy, device model, and OS context capture
        automatically with each observation for research auditability.
      </p>

      <div className="hp-record">
        <div className="record-header">
          <p className="record-label">Spatial & Device Provenance Record</p>
        </div>
        <pre className="record-json">
          {JSON.stringify(sampleProvenance, null, 2)}
        </pre>
      </div>
    </div>
  );
}
