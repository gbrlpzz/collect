import { useRef, useState } from "react";
import type {
  FieldDefinition,
  FieldOption,
  Observation,
  Project,
  View,
} from "../types";
import { Icon } from "./Icon";
import {
  AttentionScoreRing,
  Button,
  Divider,
  EmailPrompt,
  Eyebrow,
  IconButton,
  StatusBadge,
} from "./ui";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { formatExactTime, formatRelativeTime } from "../lib/formatTime";
import { useReadiness } from "../lib/useReadiness";
import {
  createSchemaDraft,
  publishSchemaDraft,
  sendProjectInvite,
  sendProjectPing,
  type ContributorReadiness,
  type SchemaDraft,
} from "../lib/adminBackend";
import {
  createFieldForType,
  fieldWithType,
  schemaFieldTypes,
} from "../lib/schema";

interface AdminDashboardProps {
  project: Project;
  projects?: Project[];
  onNavigate: (view: View) => void;
  onSelectProject: (project: Project) => void;
}

export function AdminDashboard({
  project,
  projects = [],
  onNavigate,
  onSelectProject,
}: AdminDashboardProps) {
  const projectList = projects.filter(
    (candidate) => candidate.id !== "empty-project",
  );
  const hasProject = projectList.length > 0 || project.id !== "empty-project";
  return (
    <main className="page page-admin">
      <div className="page-heading admin-heading">
        <h1>Projects</h1>
        <div className="primary-action-dock">
          <Button
            variant="primary"
            icon="plus"
            onClick={() => onNavigate("new-project")}
          >
            New project
          </Button>
        </div>
      </div>

      <section className="admin-section">
        {hasProject ? (
          <div className="admin-project-list">
            {(projectList.length ? projectList : [project]).map((candidate) => (
              <button
                className="admin-project-card"
                key={candidate.id}
                onClick={() => {
                  onSelectProject(candidate);
                  onNavigate("admin-project");
                }}
              >
                <div className="admin-project-leading">
                  <div>
                    <div className="admin-project-title-row">
                      <h3>{candidate.name}</h3>
                    </div>
                    <p>
                      {candidate.organization} · {candidate.completeSubmissions}{" "}
                      received · {candidate.contributors} contributors
                    </p>
                  </div>
                </div>
                <StatusBadge
                  tone={candidate.status === "active" ? "dark" : "soft"}
                >
                  {candidate.status === "active" ? "Active" : "Closed"}
                </StatusBadge>
                <Icon name="chevron-right" size={19} />
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-list-state">
            <strong>Set up your workspace</strong>
            <span>
              Create a project, define its schema, and invite contributors.
            </span>
          </div>
        )}
      </section>
    </main>
  );
}

type AdminTab = "setup" | "contributors" | "export";

function fieldTypeLabel(type: FieldDefinition["type"]): string {
  const label = type.replaceAll("_", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

interface AdminProjectProps {
  project: Project;
  observations: Observation[];
  onBack: () => void;
  onToast: (message: string) => void;
  onExport: () => void;
  onSchemaPublished: (project: Project) => void;
  onToggleStatus: () => void;
  onPreviewContributor?: () => void;
}

export function AdminProject({
  project,
  observations,
  onBack,
  onToast,
  onExport,
  onSchemaPublished,
  onToggleStatus,
  onPreviewContributor,
}: AdminProjectProps) {
  const [tab, setTab] = useState<AdminTab>("setup");
  const receivedCount = project.completeSubmissions;
  const waitingCount = observations.filter(
    (item) => item.status !== "SYNCED",
  ).length;
  const projectActionsRef = useRef<HTMLDetailsElement>(null);
  const {
    readiness,
    error: readinessError,
    refresh: refreshReadiness,
  } = useReadiness(tab === "setup" ? null : project.id);

  return (
    <main className="page page-admin-project">
      <div className="back-row">
        <button className="back-button" onClick={onBack}>
          <Icon name="chevron-left" size={17} /> Projects
        </button>
      </div>
      <div className="admin-project-header">
        <div>
          <div className="admin-project-title-meta">
            <Eyebrow>{project.organization}</Eyebrow>
            <StatusBadge tone={project.status === "active" ? "dark" : "soft"}>
              {project.status === "active" ? "Active" : "Closed"}
            </StatusBadge>
          </div>
          <h1>{project.name}</h1>
          <p className="lede">{project.description}</p>
        </div>
        <details className="admin-project-actions" ref={projectActionsRef}>
          <summary aria-label="Project actions">
            <Icon name="more" size={20} />
            <span className="visually-hidden">Project actions</span>
          </summary>
          <div className="admin-project-actions-menu">
            <button
              type="button"
              onClick={() => {
                projectActionsRef.current?.removeAttribute("open");
                onToggleStatus();
              }}
            >
              <Icon
                name={project.status === "active" ? "lock" : "refresh"}
                size={17}
              />
              {project.status === "active"
                ? "Close collection"
                : "Reopen collection"}
            </button>
          </div>
        </details>
      </div>
      <div className="admin-metrics">
        <div>
          <span>Received</span>
          <strong>{receivedCount}</strong>
        </div>
        <div>
          <span>Contributors</span>
          <strong>{project.contributors}</strong>
        </div>
        <div>
          <span>Last received</span>
          <strong title={formatExactTime(project.lastReceived)}>
            {formatRelativeTime(project.lastReceived)}
          </strong>
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
            id={`admin-tab-${item}`}
            role="tab"
            aria-selected={tab === item}
            aria-controls={`admin-panel-${item}`}
            tabIndex={tab === item ? 0 : -1}
            className={tab === item ? "tab-active" : ""}
            onClick={() => setTab(item)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight")
                return;
              event.preventDefault();
              const tabs = ["setup", "contributors", "export"] as AdminTab[];
              const direction = event.key === "ArrowLeft" ? -1 : 1;
              const next =
                tabs[
                  (tabs.indexOf(item) + direction + tabs.length) % tabs.length
                ];
              setTab(next);
              window.requestAnimationFrame(() =>
                document.getElementById(`admin-tab-${next}`)?.focus(),
              );
            }}
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
        <div
          id="admin-panel-setup"
          role="tabpanel"
          aria-labelledby="admin-tab-setup"
        >
          <SchemaPanel
            project={project}
            onToast={onToast}
            onPublished={onSchemaPublished}
            onPreview={onPreviewContributor}
          />
        </div>
      )}
      {tab === "contributors" && (
        <div
          id="admin-panel-contributors"
          role="tabpanel"
          aria-labelledby="admin-tab-contributors"
        >
          <ContributorsPanel
            projectId={project.id}
            waitingCount={waitingCount}
            onToast={onToast}
            rows={readiness}
            error={readinessError}
            refresh={refreshReadiness}
          />
        </div>
      )}
      {tab === "export" && (
        <div
          id="admin-panel-export"
          role="tabpanel"
          aria-labelledby="admin-tab-export"
        >
          <ExportPanel
            project={project}
            receivedCount={receivedCount}
            readiness={readiness}
            onExport={onExport}
          />
        </div>
      )}
    </main>
  );
}

function SchemaPanel({
  project,
  onToast,
  onPublished,
  onPreview,
}: {
  project: Project;
  onToast: (message: string) => void;
  onPublished: (project: Project) => void;
  onPreview?: () => void;
}) {
  const [draft, setDraft] = useState<SchemaDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const dataFields = project.fields.filter((field) => field.type !== "heading");

  const startDraft = async () => {
    setBusy(true);
    try {
      setDraft(await createSchemaDraft(project));
    } catch {
      onToast("The schema draft could not be opened");
    } finally {
      setBusy(false);
    }
  };

  if (draft)
    return (
      <SchemaDraftEditor
        project={project}
        draft={draft}
        busy={busy}
        setBusy={setBusy}
        onCancel={() => setDraft(null)}
        onToast={onToast}
        onPublished={onPublished}
      />
    );
  return (
    <section className="admin-panel">
      <div className="panel-heading">
        <div>
          <h2>Form</h2>
          <p>
            Version {project.schemaVersion} · {dataFields.length}{" "}
            {dataFields.length === 1 ? "question" : "questions"}
          </p>
        </div>
        <div className="panel-actions admin-context-actions">
          {onPreview && (
            <Button variant="secondary" icon="play" onClick={onPreview}>
              Preview
            </Button>
          )}
          <Button
            variant="secondary"
            icon="file"
            onClick={() => void startDraft()}
            disabled={busy}
          >
            Edit form
          </Button>
        </div>
      </div>
      <div className="schema-list">
        {dataFields.map((field) => (
          <div className="schema-field-row" key={field.id}>
            <div>
              <strong>{field.label}</strong>
              <span>
                {fieldTypeLabel(field.type)} ·{" "}
                {field.required ? "Required" : "Optional"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FieldConfigControls({
  field,
  update,
}: {
  field: FieldDefinition;
  update: (patch: Partial<FieldDefinition>) => void;
}) {
  const config = field.config ?? {};
  const setConfig = (
    patch: Record<string, string | number | boolean | undefined>,
  ) => {
    const clean: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) clean[key] = value;
    }
    update({ config: { ...config, ...clean } });
  };
  const setOptions = (options: FieldOption[]) => update({ options });

  const numberInput = (
    key: string,
    label: string,
    value: string | number | boolean | undefined,
  ) => (
    <label className="builder-config-item">
      <span>{label}</span>
      <input
        className="builder-config-input"
        type="number"
        value={value === undefined ? "" : String(value)}
        onChange={(event) => {
          const raw = event.target.value;
          setConfig({ [key]: raw === "" ? undefined : Number(raw) });
        }}
      />
    </label>
  );

  if (field.type === "single_choice" || field.type === "multiple_choice") {
    const options = field.options ?? [];
    const otherIndex = options.findIndex(
      (option) => option.value === "other" || option.id.endsWith("-other"),
    );
    const hasOther = otherIndex >= 0;
    return (
      <div className="builder-config">
        <span className="builder-config-title">Options</span>
        {options.map((option, index) => (
          <div className="builder-option-row" key={option.id}>
            <input
              className="builder-config-input"
              value={option.label}
              aria-label={`${field.label} option ${index + 1} label`}
              onChange={(event) =>
                setOptions(
                  options.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, label: event.target.value }
                      : item,
                  ),
                )
              }
            />
            <input
              className="builder-config-input builder-config-value"
              value={option.value}
              aria-label={`${field.label} option ${index + 1} value`}
              disabled={option.value === "other"}
              onChange={(event) =>
                setOptions(
                  options.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, value: event.target.value }
                      : item,
                  ),
                )
              }
            />
            <IconButton
              label={`Remove option ${index + 1}`}
              icon="x"
              onClick={() =>
                setOptions(
                  options.filter((_, itemIndex) => itemIndex !== index),
                )
              }
            />
          </div>
        ))}
        <div className="builder-config-actions">
          <button
            className="text-button"
            type="button"
            onClick={() =>
              setOptions([
                ...options,
                {
                  id: `option-${crypto.randomUUID().slice(0, 8)}`,
                  value: `value-${options.length + 1}`,
                  label: `Option ${options.length + 1}`,
                },
              ])
            }
          >
            <Icon name="plus" size={14} /> Add option
          </button>
          {field.type === "single_choice" && !hasOther && (
            <button
              className="text-button"
              type="button"
              onClick={() =>
                setOptions([
                  ...options,
                  {
                    id: `option-${crypto.randomUUID().slice(0, 8)}-other`,
                    value: "other",
                    label: "Other",
                  },
                ])
              }
            >
              <Icon name="plus" size={14} /> Add “Other”
            </button>
          )}
        </div>
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div className="builder-config builder-config-grid">
        <label className="builder-config-item builder-config-check">
          <input
            type="checkbox"
            checked={config.integer === true}
            onChange={(event) => setConfig({ integer: event.target.checked })}
          />{" "}
          Whole numbers only
        </label>
        {numberInput("min", "Minimum", config.min)}
        {numberInput("max", "Maximum", config.max)}
        <label className="builder-config-item">
          <span>Unit</span>
          <input
            className="builder-config-input"
            value={String(config.unit ?? "")}
            onChange={(event) => setConfig({ unit: event.target.value })}
          />
        </label>
      </div>
    );
  }

  if (field.type === "short_text" || field.type === "long_text") {
    return (
      <div className="builder-config builder-config-grid">
        {numberInput("minLength", "Min length", config.minLength)}
        {numberInput("maxLength", "Max length", config.maxLength)}
        {field.type === "short_text" && (
          <label className="builder-config-item">
            <span>Placeholder</span>
            <input
              className="builder-config-input"
              value={String(config.placeholder ?? "")}
              onChange={(event) =>
                setConfig({ placeholder: event.target.value })
              }
            />
          </label>
        )}
      </div>
    );
  }

  if (field.type === "photo" || field.type === "audio") {
    return (
      <div className="builder-config builder-config-grid">
        {numberInput("minCount", "Min count", config.minCount)}
        {numberInput("maxCount", "Max count", config.maxCount)}
        <label className="builder-config-item builder-config-check">
          <input
            type="checkbox"
            checked={config.multiple === true}
            onChange={(event) => setConfig({ multiple: event.target.checked })}
          />{" "}
          Allow multiple
        </label>
      </div>
    );
  }

  return null;
}

function SchemaDraftEditor({
  project,
  draft,
  busy,
  setBusy,
  onCancel,
  onToast,
  onPublished,
}: {
  project: Project;
  draft: SchemaDraft;
  busy: boolean;
  setBusy: (value: boolean) => void;
  onCancel: () => void;
  onToast: (message: string) => void;
  onPublished: (project: Project) => void;
}) {
  const [fields, setFields] = useState<FieldDefinition[]>(draft.fields);
  const [focusFieldId, setFocusFieldId] = useState<string | null>(null);
  const updateField = (id: string, patch: Partial<FieldDefinition>) =>
    setFields((current) =>
      current.map((field) =>
        field.id === id ? { ...field, ...patch } : field,
      ),
    );
  const removeField = (id: string) =>
    setFields((current) => current.filter((field) => field.id !== id));
  const addField = () => {
    const field = createFieldForType("short_text", fields.length + 1);
    setFocusFieldId(field.id);
    setFields((current) => [...current, field]);
  };
  const publish = async () => {
    if (!fields.some((field) => field.type !== "heading")) {
      onToast("Add at least one data field before publishing");
      return;
    }
    setBusy(true);
    try {
      const nextDraft = { ...draft, fields };
      await publishSchemaDraft(nextDraft);
      onPublished({
        ...project,
        fields,
        schemaVersion: draft.version,
        schemaId: draft.id,
      });
      onToast(`Schema v${draft.version} published`);
    } catch {
      onToast("The schema could not be published");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="admin-panel">
      <div className="panel-heading">
        <div>
          <Eyebrow>Schema draft</Eyebrow>
          <h2>Version {draft.version}</h2>
          <p>Review the draft, then publish an immutable version.</p>
        </div>
        <StatusBadge tone="soft">Draft</StatusBadge>
      </div>
      <Divider />
      <div className="builder-list">
        {fields.map((field, index) => (
          <div className="builder-row" key={field.id}>
            <span className="builder-index">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="builder-controls">
              <input
                className="builder-inline-input"
                value={field.label}
                aria-label={`Draft field ${index + 1} label`}
                autoFocus={index === 0 || field.id === focusFieldId}
                onChange={(event) =>
                  updateField(field.id, { label: event.target.value })
                }
              />
              <div className="builder-primary-controls">
                <select
                  className="builder-select"
                  value={field.type}
                  aria-label={`${field.label} type`}
                  onChange={(event) =>
                    updateField(
                      field.id,
                      fieldWithType(
                        field,
                        event.target.value as Exclude<
                          FieldDefinition["type"],
                          "heading"
                        >,
                      ),
                    )
                  }
                >
                  {schemaFieldTypes.map((type) => (
                    <option value={type} key={type}>
                      {fieldTypeLabel(type)}
                    </option>
                  ))}
                </select>
              </div>
              <details className="builder-advanced">
                <summary>Advanced</summary>
                <label>
                  <span>Data key</span>
                  <input
                    className="builder-key-input"
                    value={field.key}
                    onChange={(event) =>
                      updateField(field.id, {
                        key: event.target.value.replace(/[^a-zA-Z0-9_]/g, "_"),
                      })
                    }
                  />
                </label>
              </details>
            </div>
            <label className="builder-required">
              <input
                type="checkbox"
                checked={Boolean(field.required)}
                onChange={(event) =>
                  updateField(field.id, { required: event.target.checked })
                }
              />{" "}
              Required
            </label>
            <FieldConfigControls
              field={field}
              update={(patch) => updateField(field.id, patch)}
            />
            <IconButton
              label={`Remove ${field.label}`}
              icon="x"
              onClick={() => removeField(field.id)}
            />
          </div>
        ))}
      </div>
      <button className="add-field-row" onClick={addField}>
        <Icon name="plus" size={17} /> Add field
      </button>
      <div className="schema-builder-note">
        <Icon name="shield" size={17} />
        <span>
          Published schemas are immutable. Existing observations stay attached
          to their original version.
        </span>
      </div>
      <div className="wizard-actions">
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="primary"
          icon="check"
          onClick={() => void publish()}
          disabled={busy}
          busy={busy}
        >
          {busy ? "Publishing…" : "Publish version"}
        </Button>
      </div>
    </section>
  );
}

function ContributorsPanel({
  projectId,
  waitingCount,
  onToast,
  rows,
  error,
  refresh,
}: {
  projectId: string;
  waitingCount: number;
  onToast: (message: string) => void;
  rows: ContributorReadiness[] | null;
  error: boolean;
  refresh: () => void;
}) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);

  const invite = async (email: string) => {
    setInviting(true);
    setInviteOpen(false);
    try {
      await sendProjectInvite(projectId, email);
      onToast(`Invitation sent to ${email}`);
      refresh();
    } catch {
      onToast("The invitation could not be sent");
    } finally {
      setInviting(false);
    }
  };

  const inviteUnavailable = () => {
    onToast("Contributor invites are available after connecting Supabase");
  };

  const ping = async (contributorId: string, email: string) => {
    try {
      await sendProjectPing(projectId, contributorId);
      onToast(`Reminder sent to ${email}`);
    } catch {
      onToast("Email reminders need a configured mail provider");
    }
  };

  if (rows)
    return (
      <section className="admin-panel">
        <div className="panel-heading">
          <div>
            <h2>Contributors</h2>
            <p>{rows.length} assigned · status updates automatically</p>
          </div>
          <div className="admin-context-actions">
            <Button
              variant="secondary"
              icon="plus"
              onClick={() => setInviteOpen(true)}
              disabled={inviting}
            >
              Add contributor
            </Button>
          </div>
        </div>
        <div className="contributor-list">
          {rows.length ? (
            rows.map((row) => (
              <div className="contributor-row" key={row.id}>
                <div className="contributor-copy">
                  <strong>{row.email}</strong>
                  <span>{row.status}</span>
                </div>
                {row.attentionChecksTotal ? (
                  <AttentionScoreRing
                    score={row.attentionScore}
                    total={row.attentionChecksTotal}
                    size={38}
                  />
                ) : null}
                {!row.ready && (
                  <Button
                    variant="quiet"
                    icon="send"
                    onClick={() => void ping(row.id, row.email)}
                  >
                    Remind
                  </Button>
                )}
              </div>
            ))
          ) : (
            <div className="empty-list-state">
              <strong>No contributors assigned</strong>
              <span>Invite the field team when the project is ready.</span>
            </div>
          )}
        </div>
        <details className="attention-score-help">
          <summary>
            <Icon name="info" size={16} /> About attention scores
          </summary>
          <p>
            The ring is a 0–100 summary of quick verification questions,
            adjusted for random guessing. The number remains visible so color is
            never the only signal.
          </p>
        </details>
        {inviteOpen && isSupabaseConfigured && (
          <EmailPrompt
            title="Add contributor"
            message="They will receive an invitation to join this project."
            confirmLabel="Send invite"
            onSubmit={(email) => void invite(email)}
            onCancel={() => setInviteOpen(false)}
          />
        )}
      </section>
    );
  if (isSupabaseConfigured)
    return (
      <section className="admin-panel">
        <div className="panel-heading">
          <div>
            <Eyebrow>Assigned contributors</Eyebrow>
            <h2>
              {error ? "Roster temporarily unavailable" : "Checking the roster"}
            </h2>
            <p>
              {error
                ? "It will refresh automatically when the connection returns."
                : "Readiness is based on the last status reported by each device."}
            </p>
          </div>
        </div>
      </section>
    );

  return (
    <section className="admin-panel">
      <div className="panel-heading">
        <div>
          <Eyebrow>Assigned contributors</Eyebrow>
          <h2>Preview roster</h2>
          <p>Preview data is not connected to a live contributor roster.</p>
        </div>
        <div className="admin-context-actions">
          <Button variant="secondary" icon="plus" onClick={inviteUnavailable}>
            Add contributor
          </Button>
        </div>
      </div>
      <Divider />
      <div className="empty-list-state">
        <span>{waitingCount} local observations waiting in preview.</span>
      </div>
    </section>
  );
}

function ExportPanel({
  project,
  receivedCount,
  readiness,
  onExport,
}: {
  project: Project;
  receivedCount: number;
  readiness: ContributorReadiness[] | null;
  onExport: () => void;
}) {
  const total = readiness?.length ?? project.contributors;
  const ready = readiness?.filter((row) => row.ready).length ?? 0;
  const readinessKnown = !isSupabaseConfigured || readiness !== null;
  const percentage = total ? Math.round((ready / total) * 100) : 0;
  const readyForFinal = readinessKnown && ready === total && total > 0;
  return (
    <section className="admin-panel export-panel">
      <div className="panel-heading">
        <div>
          <h2>Export checkpoint</h2>
          <p>Download everything completely received by the server.</p>
        </div>
        <StatusBadge tone={readyForFinal ? "dark" : "soft"}>
          {readyForFinal ? "Ready for final export" : "Checkpoint available"}
        </StatusBadge>
      </div>
      <div className="export-readiness">
        <div className="readiness-bar">
          <span style={{ width: `${percentage}%` }} />
        </div>
        <div>
          <span>
            {readinessKnown
              ? `${ready} of ${total} contributors fully synced`
              : "Checking contributor readiness"}
          </span>
          <strong>{receivedCount} complete submissions · media included</strong>
        </div>
      </div>
      <div className="admin-context-actions admin-context-actions-single">
        <Button variant="primary" icon="download" onClick={onExport} fullWidth>
          Export checkpoint
        </Button>
      </div>
      <p className="export-note">
        <Icon name="info" size={15} /> Export is a snapshot, not a claim that
        offline devices have no unseen data.
      </p>
    </section>
  );
}
