import { useEffect, useState } from "react";
import { Icon } from "../components/Icon";
import { AttentionScoreRing, Button, Eyebrow } from "../components/ui";

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
  options?: string[];
}

const SCHEMA_FIELDS: SchemaFieldItem[] = [
  {
    key: "site_code",
    label: "Site code",
    type: "Text",
    required: true,
  },
  {
    key: "building_type",
    label: "Building type",
    type: "Single choice",
    required: true,
    options: ["House", "Barn", "Chapel", "Workshop"],
  },
  {
    key: "building_occupancy",
    label: "Is the building occupied?",
    type: "Tri-state",
    required: true,
  },
  {
    key: "site_photos",
    label: "Field photographs",
    type: "Photo",
    required: false,
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
  const [selectedKey, setSelectedKey] = useState<string>("building_type");
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
    setTimeout(() => setExported(false), 3000);
  };

  const selectedField = SCHEMA_FIELDS.find((f) => f.key === selectedKey);

  return (
    <div className="hp-iphone-wrap">
      <div className="hp-iphone hp-iphone-dark">
        <div className="hp-iphone-screen hp-iphone-screen-dark">
          <div className="hp-dynamic-island" aria-hidden="true" />
          <DarkStatusBar />

          <div className="hp-app-viewport hp-admin-viewport">
            <div className="hp-admin-mobile-content">
              <div className="back-row">
                <button
                  type="button"
                  className="back-button hp-bubble-btn"
                  aria-label="Projects"
                >
                  <Icon name="chevron-left" size={16} />
                </button>
                <span className="hp-crumb-text">Projects</span>
              </div>

              <div className="admin-project-header">
                <div>
                  <div className="admin-project-title-meta">
                    <Eyebrow>
                      Liminal Research Group ·{" "}
                      {activeStatus === "closed" ? "Closed" : "Active"}
                    </Eyebrow>
                  </div>
                  <h1>Vernacular buildings — Valpuesta</h1>
                </div>

                <details className="admin-project-actions">
                  <summary
                    className="hp-bubble-btn"
                    aria-label="Project actions"
                  >
                    <Icon name="more" size={18} />
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
                  <span>Last sync</span>
                  <strong title="Today at 09:32">09:32</strong>
                </div>
              </div>

              <div
                className="admin-tabs hp-pill-tabs"
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
                        ? "1. Schema"
                        : item === "contributors"
                          ? "2. Pairing"
                          : "3. Export"}
                    </button>
                  ),
                )}
              </div>

              <div className="hp-admin-tab-body">
                {tab === "setup" && (
                  <div className="hp-console-panel">
                    <div className="schema-list">
                      {SCHEMA_FIELDS.map((field, idx) => (
                        <div
                          className={`schema-field-row ${
                            selectedKey === field.key
                              ? "schema-field-row-active"
                              : ""
                          }`}
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

                    {selectedField && selectedField.options && (
                      <div className="hp-schema-detail-card">
                        <div className="hp-schema-detail-header">
                          <strong>{selectedField.label}</strong>
                          <code>{selectedField.key}</code>
                        </div>
                        <div className="hp-schema-options-pills">
                          {selectedField.options.map((opt) => (
                            <span className="chip hp-pill-chip" key={opt}>
                              {opt}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {tab === "contributors" && (
                  <div className="hp-console-panel">
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
                            <Icon name="refresh" size={13} /> New
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="contributor-list">
                      {CONTRIBUTORS.map((c) => (
                        <div className="contributor-row" key={c.id}>
                          <div className="contributor-copy">
                            <strong>{c.name}</strong>
                            <span>
                              {c.submissions} submissions · {c.lastActive}
                            </span>
                          </div>
                          <AttentionScoreRing
                            score={c.attentionScore}
                            total={c.submissions}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {tab === "export" && (
                  <div className="hp-console-panel">
                    <div className="export-readiness">
                      <div className="readiness-bar">
                        <span style={{ width: "100%" }} />
                      </div>
                      <div>
                        <span>3 of 3 contributors fully synced</span>
                        <strong>
                          104 submissions · uncompressed media ready
                        </strong>
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
                          ? "Generated archive (1.4 MB)"
                          : "Export checkpoint archive (ZIP)"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="hp-home-indicator" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
