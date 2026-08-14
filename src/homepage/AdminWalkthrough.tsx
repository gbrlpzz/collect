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

interface SchemaFieldDetail {
  key: string;
  label: string;
  type: string;
  required: boolean;
  description: string;
  options?: string[];
}

const SCHEMA_FIELDS: SchemaFieldDetail[] = [
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
  const [selectedFieldKey, setSelectedFieldKey] = useState<string>("site_code");
  const [deviceCode, setDeviceCode] = useState("K9XP-4M7B");
  const [copiedCode, setCopiedCode] = useState(false);
  const [exported, setExported] = useState(false);
  const [activeStatus, setActiveStatus] = useState<"active" | "closed">(
    "active",
  );

  const selectedField =
    SCHEMA_FIELDS.find((f) => f.key === selectedFieldKey) ?? SCHEMA_FIELDS[0];

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

  return (
    <div className="hp-admin-screen">
      <div className="back-row">
        <span className="back-button" aria-hidden="true">
          <Icon name="chevron-left" size={17} /> Projects
        </span>
      </div>

      <div className="admin-project-header">
        <div>
          <div className="admin-project-title-meta">
            <Eyebrow>
              Liminal Research Group
              {activeStatus === "closed" ? " · Closed" : " · Active"}
            </Eyebrow>
          </div>
          <h1>Vernacular buildings — Valpuesta</h1>
          <p className="lede">
            Occupancy, masonry condition, and structural assessment survey
          </p>
        </div>

        <details className="admin-project-actions">
          <summary aria-label="Project actions">
            <Icon name="more" size={20} />
            <span className="visually-hidden">Project actions</span>
          </summary>
          <div className="admin-project-actions-menu">
            <button
              type="button"
              onClick={() =>
                setActiveStatus((s) => (s === "active" ? "closed" : "active"))
              }
            >
              <Icon
                name={activeStatus === "active" ? "lock" : "refresh"}
                size={17}
              />
              {activeStatus === "active"
                ? "Close collection"
                : "Reopen collection"}
            </button>
          </div>
        </details>
      </div>

      <div className="admin-metrics">
        <div>
          <span>Received</span>
          <strong>104</strong>
        </div>
        <div>
          <span>Contributors</span>
          <strong>3</strong>
        </div>
        <div>
          <span>Last received</span>
          <strong title="Today at 09:32">Today at 09:32</strong>
        </div>
      </div>

      <div
        className="admin-tabs"
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
              ? "Form"
              : item === "contributors"
                ? "Contributors"
                : "Export"}
          </button>
        ))}
      </div>

      {tab === "setup" && (
        <section className="admin-panel" role="tabpanel">
          <div className="panel-heading">
            <div>
              <h2>Form</h2>
              <p>Version 1 · {SCHEMA_FIELDS.length} questions</p>
            </div>
            <div className="panel-actions admin-context-actions">
              <a className="button button-secondary" href="#collection">
                <Icon name="play" size={15} />
                Preview
              </a>
            </div>
          </div>

          <div className="schema-list">
            {SCHEMA_FIELDS.map((field) => (
              <button
                type="button"
                className={`schema-field-row ${selectedFieldKey === field.key ? "schema-field-row-active" : ""}`}
                key={field.key}
                onClick={() => setSelectedFieldKey(field.key)}
              >
                <div className="schema-field-copy">
                  <strong>{field.label}</strong>
                  <span className="schema-field-key">{field.key}</span>
                </div>
                <span
                  className={
                    field.required ? "schema-required" : "schema-optional"
                  }
                >
                  {field.type} · {field.required ? "Required" : "Optional"}
                </span>
              </button>
            ))}
          </div>

          {selectedField && (
            <div className="hp-schema-detail-card">
              <div className="hp-schema-detail-header">
                <strong>{selectedField.label}</strong>
                <code>{selectedField.key}</code>
              </div>
              <p>{selectedField.description}</p>
              {selectedField.options && (
                <div className="hp-schema-options-pills">
                  <span className="hp-schema-pill-label">Allowed options:</span>
                  {selectedField.options.map((opt) => (
                    <span className="chip" key={opt}>
                      {opt}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <InfoDisclosure title="About immutable schemas">
            <p>
              Once a schema is published, historical observations retain their
              exact schema version. Adding or modifying fields creates a new
              version without corrupting past submissions.
            </p>
          </InfoDisclosure>
        </section>
      )}

      {tab === "contributors" && (
        <section className="admin-panel" role="tabpanel">
          <div className="panel-heading">
            <div>
              <h2>{CONTRIBUTORS.length} contributors</h2>
            </div>
          </div>

          <div className="hp-admin-pairing-box">
            <span className="builder-config-title">
              Single-use device link code
            </span>
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
            <p className="field-help">
              Field contributors enter this 8-character code once on their
              device to pair local IndexedDB storage.
            </p>
          </div>

          <div className="contributor-list">
            {CONTRIBUTORS.map((c) => (
              <div className="contributor-row" key={c.id}>
                <div className="contributor-copy">
                  <strong>
                    {c.name} · {c.email}
                  </strong>
                  <span>
                    {c.submissions} submissions · Last active {c.lastActive}
                    {!c.synced && " · 1 pending sync"}
                  </span>
                </div>
                <AttentionScoreRing
                  score={c.attentionScore}
                  total={c.submissions}
                />
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
        <section className="admin-panel export-panel" role="tabpanel">
          <div className="panel-heading">
            <div>
              <h2>Export checkpoint</h2>
            </div>
          </div>

          <div className="export-readiness">
            <div className="readiness-bar">
              <span style={{ width: "100%" }} />
            </div>
            <div>
              <span>3 of 3 contributors fully synced</span>
              <strong>104 complete submissions · media included</strong>
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
                : "Export checkpoint"}
            </Button>
          </div>

          <InfoDisclosure title="Checkpoint coverage">
            <p>
              A checkpoint includes data received by the server. Every archive
              contains canonical JSONL, CSV, GeoJSON, DataCite 4.4 metadata, and
              byte-for-byte original media files with SHA-256 integrity hashes.
            </p>
          </InfoDisclosure>
        </section>
      )}
    </div>
  );
}
