import { useState } from "react";
import { Icon } from "../components/Icon";
import {
  AttentionScoreRing,
  Button,
  Eyebrow,
  InfoDisclosure,
} from "../components/ui";

type AdminTab = "setup" | "contributors" | "export" | "json";

interface ContributorItem {
  id: string;
  name: string;
  email: string;
  submissions: number;
  lastActive: string;
  attentionScore: number;
  synced: boolean;
  pinged?: boolean;
}

const INITIAL_CONTRIBUTORS: ContributorItem[] = [
  {
    id: "DEV-VAL-01",
    name: "Elena R.",
    email: "elena@liminal-lab.org",
    submissions: 42,
    lastActive: "1m ago",
    attentionScore: 96,
    synced: true,
  },
  {
    id: "DEV-VAL-02",
    name: "Marcus T.",
    email: "marcus@liminal-lab.org",
    submissions: 38,
    lastActive: "4m ago",
    attentionScore: 100,
    synced: true,
  },
  {
    id: "DEV-RTE-09",
    name: "Claire B.",
    email: "claire@liminal-lab.org",
    submissions: 24,
    lastActive: "12m ago",
    attentionScore: 88,
    synced: false,
  },
];

interface SchemaFieldDetail {
  key: string;
  label: string;
  type: string;
  required: boolean;
  description: string;
  options?: string[];
}

const INITIAL_SCHEMA_FIELDS: SchemaFieldDetail[] = [
  {
    key: "site_code",
    label: "Site code",
    type: "Text",
    required: true,
    description: "Unique alphanumeric site identifier (e.g. VA-023).",
  },
  {
    key: "building_type",
    label: "Building type",
    type: "Single choice",
    required: true,
    description: "Primary architectural typology classification.",
    options: [
      "House / Residential",
      "Barn / Granary",
      "Religious / Chapel",
      "Agricultural outbuilding",
      "Other",
    ],
  },
  {
    key: "building_occupancy",
    label: "Is the building occupied?",
    type: "Tri-state",
    required: true,
    description: "Current structural occupation status (Yes, No, or Unknown).",
  },
  {
    key: "building_condition",
    label: "Observed condition",
    type: "Single choice",
    required: false,
    description: "Overall structural state of conservation.",
    options: ["Intact / Good", "Fair / Weathered", "Deteriorated", "Ruinous"],
  },
  {
    key: "visible_features",
    label: "Visible features",
    type: "Multiple choice",
    required: false,
    description: "Architectural and masonry details visible from exterior.",
    options: [
      "Ashlar stone",
      "Rubble masonry",
      "Timber lintels",
      "Tile roof",
      "Vaulting",
    ],
  },
  {
    key: "site_photos",
    label: "Field photographs",
    type: "Photo",
    required: false,
    description:
      "Original uncompressed JPEG/PNG photos with SHA-256 integrity hash.",
  },
  {
    key: "people_count",
    label: "People observed",
    type: "Number",
    required: false,
    description: "Estimated number of active occupants observed on site.",
  },
  {
    key: "notes",
    label: "Survey notes",
    type: "Long text",
    required: false,
    description:
      "Free-form observational commentary and contextual fieldwork notes.",
  },
];

const CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
function randomCode(): string {
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return `${result.slice(0, 4)}-${result.slice(4)}`;
}

export function AdminWalkthrough() {
  const [tab, setTab] = useState<AdminTab>("setup");
  const [fields, setFields] = useState<SchemaFieldDetail[]>(
    INITIAL_SCHEMA_FIELDS,
  );
  const [selectedFieldKey, setSelectedFieldKey] = useState<string>("site_code");
  const [deviceCode, setDeviceCode] = useState("K9XP-4M7B");
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [exported, setExported] = useState(false);
  const [activeStatus, setActiveStatus] = useState<"active" | "closed">(
    "active",
  );
  const [contributors, setContributors] =
    useState<ContributorItem[]>(INITIAL_CONTRIBUTORS);

  const selectedField =
    fields.find((f) => f.key === selectedFieldKey) ?? fields[0];

  const generateNewCode = () => {
    setDeviceCode(randomCode());
    setCopiedCode(false);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(deviceCode.replace("-", ""));
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // fallback
    }
  };

  const copySchemaJson = async () => {
    try {
      const jsonStr = JSON.stringify(
        {
          schema_version: 1,
          project_id: "valpuesta-vernacular",
          published_at: "2026-08-01T09:00:00Z",
          fields: fields.map((f, i) => ({
            id: `fld_${i + 1}`,
            key: f.key,
            label: f.label,
            type: f.type.toLowerCase().replace(/\s+/g, "_"),
            required: f.required,
            options: f.options,
            description: f.description,
          })),
        },
        null,
        2,
      );
      await navigator.clipboard.writeText(jsonStr);
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch {
      // fallback
    }
  };

  const triggerExport = () => {
    setExported(true);
    setTimeout(() => setExported(false), 3500);
  };

  const toggleFieldRequired = (key: string) => {
    setFields((prev) =>
      prev.map((f) => (f.key === key ? { ...f, required: !f.required } : f)),
    );
  };

  const addCustomQuestion = () => {
    const newKey = `custom_metric_${fields.length + 1}`;
    const newField: SchemaFieldDetail = {
      key: newKey,
      label: `Additional observation ${fields.length + 1}`,
      type: "Text",
      required: false,
      description: "Custom surveyor note recorded during field transect.",
    };
    setFields((prev) => [...prev, newField]);
    setSelectedFieldKey(newKey);
  };

  const pingContributor = (id: string) => {
    setContributors((prev) =>
      prev.map((c) => (c.id === id ? { ...c, synced: true, pinged: true } : c)),
    );
    setTimeout(() => {
      setContributors((prev) =>
        prev.map((c) => (c.id === id ? { ...c, pinged: false } : c)),
      );
    }, 2500);
  };

  return (
    <div className="hp-admin-desktop-window">
      {/* macOS Window Chrome Top Bar */}
      <div className="hp-window-header">
        <div className="hp-mac-controls">
          <span className="hp-mac-dot hp-mac-dot-red" />
          <span className="hp-mac-dot hp-mac-dot-yellow" />
          <span className="hp-mac-dot hp-mac-dot-green" />
        </div>
        <div className="hp-window-title">
          <span className="hp-window-title-project">
            Liminal Research Group · Vernacular buildings — Valpuesta
          </span>
          <span
            className={`hp-window-status-pill ${activeStatus === "closed" ? "hp-pill-closed" : "hp-pill-active"}`}
            onClick={() =>
              setActiveStatus((s) => (s === "active" ? "closed" : "active"))
            }
            title="Click to toggle project status"
          >
            <span className="status-dot" />
            {activeStatus === "closed" ? "Closed" : "Active collection"}
          </span>
        </div>
        <div className="hp-window-actions">
          <a className="hp-window-btn" href="#collection">
            <Icon name="play" size={13} />
            Preview flow
          </a>
        </div>
      </div>

      {/* Main Studio Workstation Layout */}
      <div className="hp-admin-studio-body">
        {/* Left Sidebar */}
        <aside className="hp-admin-studio-sidebar">
          <div className="hp-sidebar-section">
            <span className="hp-sidebar-heading">Workspaces</span>
            <div className="hp-project-item hp-project-item-active">
              <div className="hp-project-item-title">
                <strong>Valpuesta Buildings</strong>
                <span className="chip hp-chip-active">v1.0</span>
              </div>
              <span className="hp-project-item-meta">
                104 submissions · 3 fleet
              </span>
            </div>
            <div className="hp-project-item hp-project-item-muted">
              <div className="hp-project-item-title">
                <strong>Coastal Transect</strong>
                <span className="chip">Draft</span>
              </div>
              <span className="hp-project-item-meta">0 submissions</span>
            </div>
          </div>

          <div className="hp-sidebar-section">
            <span className="hp-sidebar-heading">Console Modules</span>
            <nav className="hp-studio-nav">
              <button
                type="button"
                className={`hp-studio-nav-btn ${tab === "setup" ? "active" : ""}`}
                onClick={() => setTab("setup")}
              >
                <Icon name="sliders" size={15} />
                <span>Schema Builder</span>
                <span className="hp-nav-badge">{fields.length}</span>
              </button>
              <button
                type="button"
                className={`hp-studio-nav-btn ${tab === "contributors" ? "active" : ""}`}
                onClick={() => setTab("contributors")}
              >
                <Icon name="users" size={15} />
                <span>Field Fleet</span>
                <span className="hp-nav-badge">{contributors.length}</span>
              </button>
              <button
                type="button"
                className={`hp-studio-nav-btn ${tab === "export" ? "active" : ""}`}
                onClick={() => setTab("export")}
              >
                <Icon name="archive" size={15} />
                <span>Sync & Export</span>
                <span className="hp-nav-badge hp-badge-ready">100%</span>
              </button>
              <button
                type="button"
                className={`hp-studio-nav-btn ${tab === "json" ? "active" : ""}`}
                onClick={() => setTab("json")}
              >
                <Icon name="file" size={15} />
                <span>Schema JSON</span>
              </button>
            </nav>
          </div>

          {/* Quick Metrics Widget in Sidebar */}
          <div className="hp-sidebar-metrics">
            <div className="hp-sidebar-metric-row">
              <span>Received</span>
              <strong>104</strong>
            </div>
            <div className="hp-sidebar-metric-row">
              <span>Contributors</span>
              <strong>{contributors.length}</strong>
            </div>
            <div className="hp-sidebar-metric-row">
              <span>Attention QA</span>
              <strong>96%</strong>
            </div>
            <div className="hp-sidebar-metric-row">
              <span>Last sync</span>
              <strong title="Today at 09:32">Today 09:32</strong>
            </div>
          </div>
        </aside>

        {/* Main Workstation Canvas */}
        <main className="hp-admin-studio-canvas">
          {/* TAB 1: SCHEMA BUILDER */}
          {tab === "setup" && (
            <div className="hp-studio-tab-content">
              <div className="hp-studio-canvas-header">
                <div>
                  <h2>Form Schema Designer</h2>
                  <p>
                    Version 1 (Published) · {fields.length} questions ·
                    Historical observations retain this exact schema version
                  </p>
                </div>
                <div className="hp-canvas-actions">
                  <Button variant="secondary" onClick={addCustomQuestion}>
                    <Icon name="plus" size={14} />
                    Add question
                  </Button>
                </div>
              </div>

              <div className="hp-schema-studio-grid">
                {/* Left sub-pane: Field list */}
                <div className="hp-schema-fields-pane">
                  <div className="schema-list hp-schema-list-scroll">
                    {fields.map((field, idx) => (
                      <button
                        type="button"
                        className={`schema-field-row ${selectedFieldKey === field.key ? "schema-field-row-active" : ""}`}
                        key={field.key}
                        onClick={() => setSelectedFieldKey(field.key)}
                      >
                        <span className="hp-field-idx">{idx + 1}</span>
                        <div className="schema-field-copy">
                          <strong>{field.label}</strong>
                          <span className="schema-field-key">{field.key}</span>
                        </div>
                        <span
                          className={
                            field.required
                              ? "schema-required"
                              : "schema-optional"
                          }
                        >
                          {field.type} ·{" "}
                          {field.required ? "Required" : "Optional"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right sub-pane: Live Field Inspector */}
                <div className="hp-schema-inspector-pane">
                  <div className="hp-inspector-card">
                    <div className="hp-inspector-header">
                      <span className="eyebrow">Field Inspector</span>
                      <span className="hp-field-type-pill">
                        {selectedField.type}
                      </span>
                    </div>

                    <div className="hp-inspector-field-group">
                      <label className="hp-inspector-label">Field Label</label>
                      <input
                        className="field-input hp-inspector-input"
                        value={selectedField.label}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFields((prev) =>
                            prev.map((f) =>
                              f.key === selectedField.key
                                ? { ...f, label: val }
                                : f,
                            ),
                          );
                        }}
                      />
                    </div>

                    <div className="hp-inspector-field-group">
                      <label className="hp-inspector-label">Payload Key</label>
                      <code>{selectedField.key}</code>
                    </div>

                    <div className="hp-inspector-field-group">
                      <label className="hp-inspector-label">
                        Validation & Rules
                      </label>
                      <div className="hp-inspector-toggle-row">
                        <span>Required field in mobile flow</span>
                        <button
                          type="button"
                          className={`hp-toggle-switch ${selectedField.required ? "hp-toggle-on" : ""}`}
                          onClick={() => toggleFieldRequired(selectedField.key)}
                          aria-label="Toggle required"
                        >
                          <span className="hp-toggle-knob" />
                        </button>
                      </div>
                    </div>

                    <div className="hp-inspector-field-group">
                      <label className="hp-inspector-label">
                        Description / Prompt
                      </label>
                      <p className="hp-inspector-desc">
                        {selectedField.description}
                      </p>
                    </div>

                    {selectedField.options && (
                      <div className="hp-inspector-field-group">
                        <label className="hp-inspector-label">
                          Allowed Options ({selectedField.options.length})
                        </label>
                        <div className="hp-schema-options-pills">
                          {selectedField.options.map((opt) => (
                            <span className="chip" key={opt}>
                              {opt}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <InfoDisclosure title="Immutable Schema Guarantee">
                    <p>
                      Published schemas cannot silently mutate. Modifying fields
                      automatically increments schema versioning so historical
                      submissions retain their exact original questions.
                    </p>
                  </InfoDisclosure>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FIELD FLEET */}
          {tab === "contributors" && (
            <div className="hp-studio-tab-content">
              <div className="hp-studio-canvas-header">
                <div>
                  <h2>Field Fleet & Device Pairing</h2>
                  <p>
                    {contributors.length} authenticated field contributors ·
                    Zero passwords required
                  </p>
                </div>
              </div>

              {/* Instant Device Link Box */}
              <div className="hp-admin-pairing-box hp-desktop-pairing-box">
                <div>
                  <span className="builder-config-title">
                    Single-Use Device Link Code
                  </span>
                  <p className="field-help">
                    Field contributors enter this 8-character code once on
                    Safari or installed PWA to pair device storage in under 5
                    seconds.
                  </p>
                </div>
                <div className="hp-pairing-code-display">
                  <span className="hp-pairing-code">{deviceCode}</span>
                  <div className="hp-pairing-controls">
                    <Button variant="secondary" onClick={copyCode}>
                      <Icon name={copiedCode ? "check" : "file"} size={15} />
                      {copiedCode ? "Copied" : "Copy code"}
                    </Button>
                    <Button variant="secondary" onClick={generateNewCode}>
                      <Icon name="refresh" size={15} />
                      New code
                    </Button>
                  </div>
                </div>
              </div>

              {/* Fleet Table */}
              <div className="hp-fleet-table-wrap">
                <table className="hp-fleet-table">
                  <thead>
                    <tr>
                      <th>Contributor</th>
                      <th>Submissions</th>
                      <th>Last Active</th>
                      <th>Sync Status</th>
                      <th>Attention QA</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contributors.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <strong>{c.name}</strong>
                          <span className="hp-fleet-email">{c.email}</span>
                        </td>
                        <td>
                          <strong>{c.submissions}</strong>
                        </td>
                        <td>
                          <span className="hp-fleet-time">{c.lastActive}</span>
                        </td>
                        <td>
                          <span
                            className={`hp-fleet-status ${c.synced ? "status-synced" : "status-pending"}`}
                          >
                            <span className="status-dot" />
                            {c.synced ? "Synced" : "1 pending upload"}
                          </span>
                        </td>
                        <td>
                          <div className="hp-fleet-qa-cell">
                            <AttentionScoreRing
                              score={c.attentionScore}
                              total={c.submissions}
                            />
                            <span>{c.attentionScore}/100</span>
                          </div>
                        </td>
                        <td>
                          <Button
                            variant="secondary"
                            onClick={() => pingContributor(c.id)}
                          >
                            {c.pinged ? "Ping sent" : "Ping device"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <InfoDisclosure title="Guess-Adjusted Attention Formula">
                <p>
                  Scores are calculated server-side from quick verification
                  questions woven randomly into the field flow. Random guessing
                  is penalized using probability theory (0 = blind guessing, 100
                  = perfect attention).
                </p>
              </InfoDisclosure>
            </div>
          )}

          {/* TAB 3: SYNC & CHECKPOINT EXPORT */}
          {tab === "export" && (
            <div className="hp-studio-tab-content">
              <div className="hp-studio-canvas-header">
                <div>
                  <h2>FAIR Checkpoint Archive Generator</h2>
                  <p>
                    Bundle complete dataset snapshots with DataCite 4.4
                    metadata, GeoJSON, and SHA-256 media manifests.
                  </p>
                </div>
              </div>

              <div className="hp-export-studio-grid">
                <div className="hp-export-readiness-card">
                  <h3>Fleet Sync Readiness</h3>
                  <div className="export-readiness">
                    <div className="readiness-bar">
                      <span style={{ width: "100%" }} />
                    </div>
                    <div className="hp-readiness-labels">
                      <span>3 of 3 field devices fully synced</span>
                      <strong>
                        104 complete submissions · media originals hashed
                      </strong>
                    </div>
                  </div>

                  <div className="admin-context-actions admin-context-actions-single hp-export-btn-dock">
                    <Button
                      variant="primary"
                      icon="download"
                      onClick={triggerExport}
                      fullWidth
                    >
                      {exported
                        ? "Checkpoint generated · valpuesta_checkpoint.zip (1.4 MB)"
                        : "Export checkpoint (ZIP)"}
                    </Button>
                  </div>
                </div>

                <div className="hp-export-manifest-card">
                  <h3>Archive Inclusions</h3>
                  <ul className="hp-export-manifest-list">
                    <li>
                      <Icon name="check" size={15} />
                      <div>
                        <strong>DataCite 4.4 Metadata (datacite.json)</strong>
                        <span>
                          Standard FAIR research citation and license schema
                        </span>
                      </div>
                    </li>
                    <li>
                      <Icon name="check" size={15} />
                      <div>
                        <strong>
                          Submissions Stream (submissions.jsonl & .csv)
                        </strong>
                        <span>Line-delimited JSON and tabular formats</span>
                      </div>
                    </li>
                    <li>
                      <Icon name="check" size={15} />
                      <div>
                        <strong>Geospatial Layer (submissions.geojson)</strong>
                        <span>
                          RFC 7946 FeatureCollection with GPS coordinates
                        </span>
                      </div>
                    </li>
                    <li>
                      <Icon name="check" size={15} />
                      <div>
                        <strong>Raw Uncompressed Media (media/)</strong>
                        <span>
                          Byte-for-byte originals paired with SHA-256 hashes
                        </span>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>

              <InfoDisclosure title="Checkpoint Reproducibility">
                <p>
                  A checkpoint archive is completely self-contained. Anyone can
                  verify the SHA-256 media manifest against raw binary files
                  without contacting the original database server.
                </p>
              </InfoDisclosure>
            </div>
          )}

          {/* TAB 4: LIVE SCHEMA JSON */}
          {tab === "json" && (
            <div className="hp-studio-tab-content">
              <div className="hp-studio-canvas-header">
                <div>
                  <h2>Immutable Schema JSON Manifest</h2>
                  <p>
                    Canonical machine-readable definition exported to DataCite
                    archives
                  </p>
                </div>
                <div className="hp-canvas-actions">
                  <Button variant="secondary" onClick={copySchemaJson}>
                    <Icon name={copiedJson ? "check" : "file"} size={14} />
                    {copiedJson ? "Copied JSON" : "Copy JSON"}
                  </Button>
                </div>
              </div>

              <pre className="record-json hp-admin-json-viewer">
                {JSON.stringify(
                  {
                    schema_version: 1,
                    project_id: "valpuesta-vernacular",
                    published_at: "2026-08-01T09:00:00Z",
                    license: "CC-BY-4.0",
                    fields: fields.map((f, i) => ({
                      id: `fld_${i + 1}`,
                      key: f.key,
                      label: f.label,
                      type: f.type.toLowerCase().replace(/\s+/g, "_"),
                      required: f.required,
                      options: f.options,
                      description: f.description,
                    })),
                  },
                  null,
                  2,
                )}
              </pre>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
