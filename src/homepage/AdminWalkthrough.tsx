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
    <div className="hp-admin-console" data-mode="admin" data-surface="admin">
      <div className="hp-console-header">
        <div className="admin-project-header">
          <div>
            <div className="admin-project-title-meta">
              <Eyebrow>Liminal Research Group · Active</Eyebrow>
            </div>
            <h1>Vernacular buildings — Valpuesta</h1>
          </div>
          <span className="hp-console-badge">Admin</span>
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
              onClick={() => handleTabClick(item)}
            >
              {item === "setup"
                ? "1. Form Schema"
                : item === "contributors"
                  ? "2. Device Pairing"
                  : "3. Checkpoint Export"}
            </button>
          ))}
        </div>
      </div>

      <div className="hp-console-body">
        {tab === "setup" && (
          <div className="hp-console-panel">
            <div className="schema-list">
              {SCHEMA_FIELDS.map((field, idx) => (
                <div
                  className={`schema-field-row ${
                    selectedKey === field.key ? "schema-field-row-active" : ""
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
                    {field.required ? "Required" : "Optional"}
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
                    <span className="chip" key={opt}>
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
                    <Icon name={copiedCode ? "check" : "file"} size={13} />
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
                <strong>104 submissions · uncompressed media ready</strong>
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
  );
}
