import { useEffect, useState } from "react";
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
  description?: string;
  options?: string[];
}

const SCHEMA_FIELDS: SchemaFieldItem[] = [
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
    description: "Primary architectural typology.",
    options: ["House", "Barn", "Chapel", "Outbuilding", "Other"],
  },
  {
    key: "building_occupancy",
    label: "Is the building occupied?",
    type: "Tri-state",
    required: true,
    description: "Occupancy status (Yes / No / Unknown).",
  },
  {
    key: "building_condition",
    label: "Observed condition",
    type: "Single choice",
    required: false,
    description: "Structural state of conservation.",
    options: ["Intact", "Weathered", "Deteriorated", "Ruinous"],
  },
  {
    key: "visible_features",
    label: "Visible features",
    type: "Multiple choice",
    required: false,
    description: "Observable construction details.",
    options: ["Ashlar stone", "Rubble masonry", "Timber lintels", "Tile roof"],
  },
  {
    key: "site_photos",
    label: "Field photographs",
    type: "Photo",
    required: false,
    description: "Uncompressed photos with SHA-256 integrity hash.",
  },
  {
    key: "people_count",
    label: "People observed",
    type: "Number",
    required: false,
    description: "Count of occupants observed on site.",
  },
  {
    key: "notes",
    label: "Survey notes",
    type: "Long text",
    required: false,
    description: "Contextual fieldwork commentary.",
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

function DarkStatusBar() {
  return (
    <div className="hp-status-bar hp-status-bar-dark" aria-hidden="true">
      <span className="hp-status-time">9:41</span>
      <span className="hp-status-icons">
        <svg viewBox="0 0 18 12" width="18" height="12" fill="currentColor">
          <rect x="0" y="8" width="3" height="4" rx="0.8" />
          <rect x="4.5" y="5.5" width="3" height="6.5" rx="0.8" />
          <rect x="9" y="3" width="3" height="9" rx="0.8" />
          <rect x="13.5" y="0.5" width="3" height="11.5" rx="0.8" />
        </svg>
        <svg
          viewBox="0 0 16 12"
          width="16"
          height="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        >
          <path d="M1.5 8.5a9.5 9.5 0 0 1 13 0" />
          <path d="M4 6.2a6.4 6.4 0 0 1 8 0" />
          <path d="M6.5 4a3.6 3.6 0 0 1 3 0" />
        </svg>
        <svg
          viewBox="0 0 25 12"
          width="25"
          height="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.1"
        >
          <rect x="0.6" y="0.6" width="21" height="10.8" rx="3" />
          <rect
            x="2.2"
            y="2.2"
            width="15"
            height="7.6"
            rx="1.5"
            fill="currentColor"
          />
          <path d="M23 4v4" strokeLinecap="round" />
        </svg>
      </span>
    </div>
  );
}

export function AdminWalkthrough({
  initialTab = "setup",
  onTabChange,
}: {
  initialTab?: AdminTab;
  onTabChange?: (tab: AdminTab) => void;
}) {
  const [tab, setTab] = useState<AdminTab>(initialTab);
  const [selectedKey, setSelectedKey] = useState<string | null>("site_code");
  const [deviceCode, setDeviceCode] = useState("K9XP-4M7B");
  const [copiedCode, setCopiedCode] = useState(false);
  const [exported, setExported] = useState(false);
  const [activeStatus, setActiveStatus] = useState<"active" | "closed">(
    "active",
  );

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const handleTabClick = (nextTab: AdminTab) => {
    setTab(nextTab);
    onTabChange?.(nextTab);
  };

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

  const selectedField = SCHEMA_FIELDS.find((f) => f.key === selectedKey);

  return (
    <div className="hp-iphone-wrap">
      <div className="hp-iphone hp-iphone-dark">
        <div className="hp-iphone-screen hp-iphone-screen-dark">
          <div className="hp-dynamic-island" aria-hidden="true" />
          <DarkStatusBar />

          <div className="hp-app-viewport hp-admin-viewport">
            <div className="hp-admin-screen-inner">
              <div className="back-row">
                <button
                  className="back-button hp-admin-back-bubble"
                  aria-label="Projects"
                >
                  <Icon name="chevron-left" size={16} />
                </button>
                <span className="hp-admin-topbar-crumb">Projects</span>
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
                    Occupancy, masonry condition, and structural assessment
                    survey
                  </p>
                </div>

                <details className="admin-project-actions">
                  <summary aria-label="Project actions">
                    <Icon name="more" size={18} />
                    <span className="visually-hidden">Project actions</span>
                  </summary>
                  <div className="admin-project-actions-menu">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveStatus((s) =>
                          s === "active" ? "closed" : "active",
                        )
                      }
                    >
                      <Icon
                        name={activeStatus === "active" ? "lock" : "refresh"}
                        size={15}
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
                  <strong title="Today at 09:32">Today 09:32</strong>
                </div>
              </div>

              <div
                className="admin-tabs"
                role="tablist"
                aria-label="Project administration"
              >
                {(["setup", "contributors", "export"] as AdminTab[]).map(
                  (item) => (
                    <button
                      key={item}
                      type="button"
                      role="tab"
                      aria-selected={tab === item}
                      className={tab === item ? "tab-active" : ""}
                      onClick={() => handleTabClick(item)}
                    >
                      {item === "setup"
                        ? "Form"
                        : item === "contributors"
                          ? "Contributors"
                          : "Export"}
                    </button>
                  ),
                )}
              </div>

              {tab === "setup" && (
                <section className="admin-panel" role="tabpanel">
                  <div className="panel-heading">
                    <div>
                      <h2>Form</h2>
                      <p>Version 1 · {SCHEMA_FIELDS.length} questions</p>
                    </div>
                    <div className="panel-actions admin-context-actions">
                      <a
                        className="button button-secondary button-small"
                        href="#collection"
                      >
                        <Icon name="play" size={13} />
                        Preview
                      </a>
                    </div>
                  </div>

                  <div className="schema-list">
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
                        <span className="schema-required">
                          {field.required ? "Req." : "Opt."}
                        </span>
                      </div>
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
                          <span className="hp-schema-pill-label">Choices:</span>
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
                      Once published, historical observations retain their exact
                      schema version. Adding fields creates a new version
                      without corrupting past submissions.
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
                          <Icon
                            name={copiedCode ? "check" : "file"}
                            size={13}
                          />
                          {copiedCode ? "Copied" : "Copy"}
                        </Button>
                        <Button variant="secondary" onClick={generateNewCode}>
                          <Icon name="refresh" size={13} />
                          New
                        </Button>
                      </div>
                    </div>
                    <p className="field-help">
                      Field contributors enter this 8-character code once on
                      their device to pair local IndexedDB storage.
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
                            {c.submissions} submissions · {c.lastActive}
                            {!c.synced && " · 1 pending"}
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
                      The ring is a 0–100 summary of quick verification
                      questions, adjusted for random guessing. The score is
                      recorded in observation provenance while the answer is
                      stripped from payload data.
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
                      <span>3 of 3 contributors synced</span>
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
                      {exported ? "Generated (1.4 MB)" : "Export checkpoint"}
                    </Button>
                  </div>

                  <InfoDisclosure title="Checkpoint coverage">
                    <p>
                      A checkpoint includes data received by the server: JSONL,
                      CSV, GeoJSON, DataCite 4.4 metadata, and byte-for-byte
                      original media files with SHA-256 hashes.
                    </p>
                  </InfoDisclosure>
                </section>
              )}
            </div>
          </div>

          <div className="hp-home-indicator" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
