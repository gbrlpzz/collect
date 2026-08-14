import { useState } from "react";
import { Icon } from "../components/Icon";
import {
  AttentionScoreRing,
  Button,
  Eyebrow,
  InfoDisclosure,
} from "../components/ui";

type AdminTab = "setup" | "contributors" | "export";

interface ContributorItem {
  id: string;
  name: string;
  email: string;
  submissions: number;
  lastActive: string;
  attentionScore: number;
  synced: boolean;
}

const CONTRIBUTORS: ContributorItem[] = [
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

interface SchemaFieldItem {
  key: string;
  label: string;
  type: string;
  required: boolean;
  description: string;
  options?: string[];
}

const SCHEMA_FIELDS: SchemaFieldItem[] = [
  {
    key: "site_code",
    label: "Site code",
    type: "Text",
    required: true,
    description:
      "Unique alphanumeric site identifier assigned to the structure (e.g. VA-023).",
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
    description: "Estimated count of occupants observed on site.",
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

export function AdminWalkthrough({
  initialTab = "setup",
}: {
  initialTab?: AdminTab;
}) {
  const [tab, setTab] = useState<AdminTab>(initialTab);
  const [selectedKey, setSelectedKey] = useState<string>("site_code");
  const [deviceCode, setDeviceCode] = useState("K9XP-4M7B");
  const [copiedCode, setCopiedCode] = useState(false);
  const [exported, setExported] = useState(false);
  const [activeStatus, setActiveStatus] = useState<"active" | "closed">(
    "active",
  );

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

  const triggerExport = () => {
    setExported(true);
    setTimeout(() => setExported(false), 3500);
  };

  const selectedField =
    SCHEMA_FIELDS.find((f) => f.key === selectedKey) ?? SCHEMA_FIELDS[0];

  return (
    <div className="hp-admin-console-card">
      <div className="hp-admin-top-bar">
        <div className="admin-project-title-meta">
          <Eyebrow>
            Liminal Research Group
            {activeStatus === "closed" ? " · Closed" : " · Active"}
          </Eyebrow>
        </div>
        <div className="hp-admin-status-dock">
          <button
            type="button"
            className="hp-admin-status-toggle"
            onClick={() =>
              setActiveStatus((s) => (s === "active" ? "closed" : "active"))
            }
          >
            <span
              className={`status-dot ${activeStatus === "closed" ? "status-dot-closed" : ""}`}
            />
            <span>
              {activeStatus === "active"
                ? "Collection active"
                : "Collection closed"}
            </span>
          </button>
        </div>
      </div>

      <div className="admin-project-header">
        <div>
          <h1>Vernacular buildings — Valpuesta</h1>
          <p className="lede">
            Occupancy, masonry condition, and structural assessment survey
          </p>
        </div>
      </div>

      <div className="admin-metrics hp-admin-metrics-grid">
        <div className="hp-admin-metric-box">
          <span>Submissions Received</span>
          <strong>104</strong>
        </div>
        <div className="hp-admin-metric-box">
          <span>Paired Devices</span>
          <strong>3</strong>
        </div>
        <div className="hp-admin-metric-box">
          <span>Fleet Attention QA</span>
          <strong>96%</strong>
        </div>
        <div className="hp-admin-metric-box">
          <span>Last Received</span>
          <strong title="Today at 09:32">Today 09:32</strong>
        </div>
      </div>

      <div
        className="admin-tabs hp-admin-nav-tabs"
        role="tablist"
        aria-label="Project administration"
      >
        {(["setup", "contributors", "export"] as AdminTab[]).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            className={tab === item ? "tab-active" : ""}
            onClick={() => setTab(item)}
          >
            {item === "setup"
              ? "Form Schema (8)"
              : item === "contributors"
                ? "Device Link & Fleet (3)"
                : "Checkpoint Export"}
          </button>
        ))}
      </div>

      {tab === "setup" && (
        <section className="admin-panel hp-admin-panel-setup" role="tabpanel">
          <div className="panel-heading">
            <div>
              <h2>Form Schema</h2>
              <p>Version 1 (Published) · 8 immutable questions</p>
            </div>
            <div className="panel-actions admin-context-actions">
              <a
                className="button button-secondary button-small"
                href="#collection"
              >
                <Icon name="play" size={14} />
                Preview in collector
              </a>
            </div>
          </div>

          <div className="hp-admin-schema-split">
            <div className="schema-list hp-admin-schema-list">
              {SCHEMA_FIELDS.map((field, idx) => (
                <div
                  className={`schema-field-row ${selectedKey === field.key ? "schema-field-row-active" : ""}`}
                  key={field.key}
                  onClick={() => setSelectedKey(field.key)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      setSelectedKey(field.key);
                  }}
                >
                  <span className="schema-index">{idx + 1}</span>
                  <div>
                    <strong>{field.label}</strong>
                    <span>{field.key}</span>
                  </div>
                  <span className="schema-type">{field.type}</span>
                  <span
                    className={
                      field.required ? "schema-required" : "schema-optional"
                    }
                  >
                    {field.required ? "Required" : "Optional"}
                  </span>
                </div>
              ))}
            </div>

            <div className="hp-admin-field-inspector">
              <div className="hp-inspector-header">
                <span className="eyebrow">Field Inspector</span>
                <code>{selectedField.key}</code>
              </div>
              <h3>{selectedField.label}</h3>
              <p>{selectedField.description}</p>
              <div className="hp-inspector-meta">
                <span>
                  Type: <strong>{selectedField.type}</strong>
                </span>
                <span>
                  Rule:{" "}
                  <strong>
                    {selectedField.required ? "Required" : "Optional"}
                  </strong>
                </span>
              </div>
              {selectedField.options && (
                <div className="hp-schema-options-pills">
                  <span className="hp-schema-pill-label">Allowed choices:</span>
                  {selectedField.options.map((opt) => (
                    <span className="chip" key={opt}>
                      {opt}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <InfoDisclosure title="About immutable schemas">
            <p>
              Once published, historical observations retain their exact schema
              version. Modifying fields creates Version 2 without corrupting
              past submissions.
            </p>
          </InfoDisclosure>
        </section>
      )}

      {tab === "contributors" && (
        <section
          className="admin-panel hp-admin-panel-contributors"
          role="tabpanel"
        >
          <div className="panel-heading">
            <div>
              <h2>Field Fleet & Device Pairing</h2>
              <p>
                3 active field devices · Single-use link codes bridge sign-in
              </p>
            </div>
          </div>

          <div className="hp-admin-pairing-box hp-admin-pairing-wide">
            <div>
              <span className="builder-config-title">
                Single-use device link code
              </span>
              <p className="field-help">
                Field contributors enter this 8-character code once in Safari or
                installed PWA to pair device storage in under 5 seconds.
              </p>
            </div>
            <div className="hp-pairing-code-display">
              <span className="hp-pairing-code">{deviceCode}</span>
              <div className="hp-pairing-controls">
                <Button variant="secondary" onClick={copyCode}>
                  <Icon name={copiedCode ? "check" : "file"} size={14} />
                  {copiedCode ? "Copied" : "Copy code"}
                </Button>
                <Button variant="secondary" onClick={generateNewCode}>
                  <Icon name="refresh" size={14} />
                  New code
                </Button>
              </div>
            </div>
          </div>

          <div className="contributor-list hp-admin-contributor-list">
            {CONTRIBUTORS.map((c) => (
              <div
                className="contributor-row hp-admin-contributor-row"
                key={c.id}
              >
                <div className="contributor-copy">
                  <strong>
                    {c.name} · {c.email}
                  </strong>
                  <span>
                    {c.submissions} submissions · Last active {c.lastActive}
                    {!c.synced && " · 1 pending sync"}
                  </span>
                </div>
                <div className="hp-admin-contributor-qa">
                  <AttentionScoreRing
                    score={c.attentionScore}
                    total={c.submissions}
                  />
                  <span>{c.attentionScore}/100</span>
                </div>
              </div>
            ))}
          </div>

          <InfoDisclosure title="About attention scores">
            <p>
              The ring is a 0–100 summary of quick verification questions,
              adjusted for random guessing. The score is recorded in observation
              provenance while the answer is stripped from payload data.
            </p>
          </InfoDisclosure>
        </section>
      )}

      {tab === "export" && (
        <section
          className="admin-panel export-panel hp-admin-panel-export"
          role="tabpanel"
        >
          <div className="panel-heading">
            <div>
              <h2>Export Checkpoint Archive</h2>
              <p>
                Self-contained ZIP package ready for Zenodo or institutional
                repository
              </p>
            </div>
          </div>

          <div className="export-readiness hp-admin-export-readiness">
            <div className="readiness-bar">
              <span style={{ width: "100%" }} />
            </div>
            <div>
              <span>3 of 3 contributors fully synced</span>
              <strong>104 complete submissions · media originals hashed</strong>
            </div>
          </div>

          <div className="admin-context-actions admin-context-actions-single">
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

          <InfoDisclosure title="Checkpoint coverage">
            <p>
              A checkpoint includes data received by the server: canonical
              JSONL, CSV, RFC 7946 GeoJSON, DataCite 4.4 kernel metadata, and
              byte-for-byte original media files with SHA-256 hashes.
            </p>
          </InfoDisclosure>
        </section>
      )}
    </div>
  );
}
