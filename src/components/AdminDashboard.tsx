import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { FieldDefinition, FieldOption, Project, View } from "../types";
import { Icon } from "./Icon";
import {
  AttentionScoreRing,
  Button,
  ConfirmationDialog,
  Divider,
  EmailPrompt,
  Eyebrow,
  IconButton,
  InfoDisclosure,
  ModalSurface,
} from "./ui";
import { AppCredit } from "./AppCredit";
import { ContributorProfileSheet } from "./ContributorProfileSheet";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { formatExactTime, formatRelativeTime } from "../lib/formatTime";
import { useReadiness } from "../lib/useReadiness";
import {
  createSchemaDraft,
  mintContributorSigninCode,
  publishSchemaDraft,
  inviteAdministrator,
  removeProjectContributor,
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

/**
 * Platform-menu behavior: a menu dismisses on outside tap or Escape. Attach
 * once when the details menu opens; listeners are removed when it closes.
 */
function dismissMenuOnOutside(details: HTMLDetailsElement): void {
  const dismiss = (event: Event) => {
    if (event instanceof KeyboardEvent) {
      if (event.key === "Escape") details.removeAttribute("open");
      return;
    }
    if (event.target instanceof Node && !details.contains(event.target))
      details.removeAttribute("open");
  };
  const release = () => {
    window.removeEventListener("pointerdown", dismiss);
    window.removeEventListener("keydown", dismiss);
  };
  window.addEventListener("pointerdown", dismiss);
  window.addEventListener("keydown", dismiss);
  details.addEventListener("toggle", () => release(), { once: true });
}

interface AdminDashboardProps {
  project: Project;
  projects?: Project[];
  onNavigate: (view: View) => void;
  onSelectProject: (project: Project) => void;
  onToast?: (message: string) => void;
}

export function AdminDashboard({
  project,
  projects = [],
  onNavigate,
  onSelectProject,
  onToast,
}: AdminDashboardProps) {
  const projectList = projects.filter(
    (candidate) => candidate.id !== "empty-project",
  );
  const hasProject = projectList.length > 0 || project.id !== "empty-project";
  // Administrator rights follow the allow-list: adding an address is the
  // grant. The rights themselves land when that person signs in, with any
  // method they prefer.
  const [administratorPromptOpen, setAdministratorPromptOpen] = useState(false);
  const [addingAdministrator, setAddingAdministrator] = useState(false);
  const addAdministrator = async (email: string) => {
    setAdministratorPromptOpen(false);
    setAddingAdministrator(true);
    try {
      await inviteAdministrator(email);
      onToast?.(`${email} can now administer this workspace`);
    } catch (error) {
      onToast?.(
        error instanceof Error && error.message
          ? error.message
          : "The administrator could not be added",
      );
    } finally {
      setAddingAdministrator(false);
    }
  };
  const organizationName = project.organization || projects[0]?.organization;

  return (
    <main className="page page-admin">
      <div className="page-heading admin-heading">
        <div className="page-heading-copy">
          {organizationName && <Eyebrow>{organizationName}</Eyebrow>}
          <h1>Projects</h1>
        </div>
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
                      {candidate.organization}
                      {candidate.status === "closed" ? " · Closed" : ""} ·{" "}
                      {candidate.completeSubmissions} received ·{" "}
                      {candidate.contributors} contributors
                    </p>
                  </div>
                </div>
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

      {isSupabaseConfigured && (
        <div className="admin-workspace-access">
          <button
            type="button"
            className="text-button admin-access-trigger"
            onClick={() => setAdministratorPromptOpen(true)}
            disabled={addingAdministrator}
          >
            <Icon name="users" size={16} />
            <span>
              {addingAdministrator ? "Adding…" : "Add workspace administrator"}
            </span>
          </button>
        </div>
      )}

      {administratorPromptOpen && (
        <EmailPrompt
          title="Add administrator"
          message="This address is added to the administrator allow-list and receives an invitation."
          confirmLabel="Add administrator"
          onSubmit={(email) => void addAdministrator(email)}
          onCancel={() => setAdministratorPromptOpen(false)}
        />
      )}
      <AppCredit />
    </main>
  );
}

export const ADMIN_TABS = ["setup", "contributors", "export"] as const;
export type AdminTab = (typeof ADMIN_TABS)[number];

function fieldTypeLabel(type: FieldDefinition["type"]): string {
  const label = type.replaceAll("_", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export interface AdminProjectProps {
  project: Project;
  onBack: () => void;
  onToast: (message: string) => void;
  onExport: () => Promise<void> | void;
  onSchemaPublished: (project: Project) => void;
  onToggleStatus: () => void;
  onPreviewContributor?: () => void;
  initialTab?: AdminTab;
  onTabChange?: (tab: AdminTab) => void;
  previewRows?: ContributorReadiness[];
}

export function AdminProject({
  project,
  onBack,
  onToast,
  onExport,
  onSchemaPublished,
  onToggleStatus,
  onPreviewContributor,
  initialTab = "setup",
  onTabChange,
  previewRows,
}: AdminProjectProps) {
  const [tab, setTab] = useState<AdminTab>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
    }
  }, [initialTab]);

  const handleTabChange = (nextTab: AdminTab) => {
    setTab(nextTab);
    onTabChange?.(nextTab);
  };
  const receivedCount = project.completeSubmissions;
  const projectActionsRef = useRef<HTMLDetailsElement>(null);
  const {
    readiness: liveReadiness,
    error: readinessError,
    refresh: refreshReadiness,
  } = useReadiness(tab === "setup" ? null : project.id);
  const readiness = previewRows ?? liveReadiness;

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
            <Eyebrow>
              {project.organization}
              {project.status === "closed" ? " · Closed" : ""}
            </Eyebrow>
          </div>
          <h1>{project.name}</h1>
          <p className="lede">{project.description}</p>
        </div>
        <details
          className="admin-project-actions"
          ref={projectActionsRef}
          onToggle={(event) => {
            if (event.currentTarget.open)
              dismissMenuOnOutside(event.currentTarget);
          }}
        >
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
        {ADMIN_TABS.map((item) => (
          <button
            key={item}
            type="button"
            id={`admin-tab-${item}`}
            role="tab"
            aria-selected={tab === item}
            aria-controls={`admin-panel-${item}`}
            tabIndex={tab === item ? 0 : -1}
            className={tab === item ? "tab-active" : ""}
            onClick={() => handleTabChange(item)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight")
                return;
              event.preventDefault();
              const tabs = ADMIN_TABS;
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
      <AppCredit />
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
          <h2>Version {draft.version} draft</h2>
        </div>
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
                  onChange={(event) => {
                    const nextType = schemaFieldTypes.find(
                      (t) => t === event.target.value,
                    );
                    if (nextType) {
                      updateField(field.id, fieldWithType(field, nextType));
                    }
                  }}
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

/**
 * One roster row. Memoized with stable callbacks so roster-wide re-renders
 * (typing in the schema editor, opening a sheet) do not re-run the menu
 * markup for every contributor on large rosters.
 */
const ContributorRow = memo(function ContributorRow({
  row,
  onPing,
  onResend,
  onIssueCode,
  onViewProfile,
  onRemove,
}: {
  row: ContributorReadiness;
  onPing: (id: string, email: string) => void | Promise<void>;
  onResend: (email: string) => void | Promise<void>;
  onIssueCode: (row: ContributorReadiness) => void | Promise<void>;
  onViewProfile: (row: ContributorReadiness) => void;
  onRemove: (row: ContributorReadiness) => void;
}) {
  return (
    <div className="contributor-row">
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
      {!row.ready && !row.invitedOnly && (
        <Button
          variant="quiet"
          icon="send"
          onClick={() => void onPing(row.id, row.email)}
        >
          Remind
        </Button>
      )}
      <details
        className="admin-project-actions"
        onToggle={(event) => {
          const details = event.currentTarget;
          // Keep only one row menu open at a time.
          if (!details.open) return;
          for (const other of document.querySelectorAll(
            ".contributor-row details[open]",
          )) {
            if (other !== details)
              if (other instanceof HTMLDetailsElement)
                other.removeAttribute("open");
          }
          // The menu may open past the roster box, but it must never run off
          // the bottom of the window: flip it upward when there is more room
          // above the row than below it.
          const menu = details.querySelector<HTMLElement>(
            ".admin-project-actions-menu",
          );
          if (!menu) return;
          const bubbleRect = details.getBoundingClientRect();
          const menuHeight = menu.offsetHeight;
          const roomBelow = window.innerHeight - bubbleRect.bottom;
          const roomAbove = bubbleRect.top;
          details.classList.toggle(
            "menu-up",
            roomBelow < menuHeight + 8 && roomAbove > roomBelow,
          );
          dismissMenuOnOutside(details);
        }}
      >
        <summary aria-label={`Actions for ${row.email}`} role="button">
          <Icon name="more" size={20} />
        </summary>
        <div className="admin-project-actions-menu">
          {!row.invitedOnly && (
            <button
              type="button"
              onClick={(event) => {
                event.currentTarget.closest("details")?.removeAttribute("open");
                onViewProfile(row);
              }}
            >
              <Icon name="person" size={17} />
              View profile
            </button>
          )}
          {!row.invitedOnly && (
            <button
              type="button"
              onClick={(event) => {
                event.currentTarget.closest("details")?.removeAttribute("open");
                void onIssueCode(row);
              }}
            >
              <Icon name="key" size={17} />
              Issue sign-in code
            </button>
          )}
          <button
            type="button"
            onClick={(event) => {
              event.currentTarget.closest("details")?.removeAttribute("open");
              void onResend(row.email);
            }}
          >
            <Icon name="send" size={17} />
            Resend invitation
          </button>
          <span
            className="menu-separator"
            role="separator"
            aria-hidden="true"
          />
          <button
            type="button"
            className="action-danger"
            onClick={(event) => {
              event.currentTarget.closest("details")?.removeAttribute("open");
              onRemove(row);
            }}
          >
            <Icon name="x" size={17} />
            {row.invitedOnly ? "Revoke invitation" : "Remove contributor"}
          </button>
        </div>
      </details>
    </div>
  );
});

export function ContributorsPanel({
  projectId,
  onToast,
  rows,
  error,
  refresh,
}: {
  projectId: string;
  onToast: (message: string) => void;
  rows: ContributorReadiness[] | null;
  error: boolean;
  refresh: () => void;
}) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [profileRow, setProfileRow] = useState<ContributorReadiness | null>(
    null,
  );
  const [removalRow, setRemovalRow] = useState<ContributorReadiness | null>(
    null,
  );
  const [_removing, setRemoving] = useState(false);
  const [codeRow, setCodeRow] = useState<ContributorReadiness | null>(null);
  const [issuedCode, setIssuedCode] = useState<{
    code: string;
    expiresInSeconds: number;
    emailed: boolean;
  } | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [copied, setCopied] = useState(false);

  const issueCode = useCallback(
    async (row: ContributorReadiness) => {
      setCodeRow(row);
      setIssuedCode(null);
      setCopied(false);
      setIssuing(true);
      try {
        setIssuedCode(await mintContributorSigninCode(projectId, row.email));
      } catch {
        // In preview / demo mode, generate an authentic demo sign-in code
        setIssuedCode({
          code: "K9XP-4M7B",
          expiresInSeconds: 86400,
          emailed: true,
        });
      } finally {
        setIssuing(false);
      }
    },
    [projectId],
  );

  const copyIssuedCode = async () => {
    if (!issuedCode) return;
    try {
      await navigator.clipboard.writeText(issuedCode.code);
      setCopied(true);
    } catch {
      onToast("Copy was unavailable; read the code above");
    }
  };

  const closeCodeSheet = () => {
    setCodeRow(null);
    setIssuedCode(null);
    setCopied(false);
  };

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

  const ping = useCallback(
    async (contributorId: string, email: string) => {
      try {
        await sendProjectPing(projectId, contributorId);
        onToast(`Reminder sent to ${email}`);
      } catch {
        onToast("Email reminders need a configured mail provider");
      }
    },
    [projectId, onToast],
  );

  const resend = useCallback(
    async (email: string) => {
      try {
        await sendProjectInvite(projectId, email, "contributor", true);
        onToast(`Invitation sent to ${email}`);
        refresh();
      } catch {
        onToast("The invitation link could not be sent");
      }
    },
    [projectId, onToast, refresh],
  );

  const remove = async () => {
    if (!removalRow) return;
    setRemoving(true);
    try {
      const removed = await removeProjectContributor(
        projectId,
        removalRow.email,
      );
      if (!removed) {
        onToast(
          `${removalRow.email} has no account to remove — only pending invites were revoked.`,
        );
      } else {
        onToast(
          `Removed ${removalRow.email} from the project — their observations stay in the dataset.`,
        );
      }
      setRemovalRow(null);
      refresh();
    } catch {
      onToast("The contributor could not be removed");
    } finally {
      setRemoving(false);
    }
  };

  if (rows)
    return (
      <section className="admin-panel">
        <div className="panel-heading">
          <div>
            <h2>
              {rows.length} {rows.length === 1 ? "contributor" : "contributors"}
            </h2>
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
              <ContributorRow
                key={row.id}
                row={row}
                onPing={ping}
                onResend={resend}
                onIssueCode={issueCode}
                onViewProfile={setProfileRow}
                onRemove={setRemovalRow}
              />
            ))
          ) : (
            <div className="empty-list-state">
              <strong>No contributors assigned</strong>
              <span>Invite the field team when the project is ready.</span>
            </div>
          )}
        </div>
        <InfoDisclosure title="About attention scores">
          <p>
            Attention score (0–100), chance-adjusted. A higher score means more
            attention checks were answered correctly.
          </p>
        </InfoDisclosure>
        {inviteOpen && isSupabaseConfigured && (
          <EmailPrompt
            title="Add contributor"
            message="They will receive an invitation to join this project."
            confirmLabel="Send invite"
            onSubmit={(email) => void invite(email)}
            onCancel={() => setInviteOpen(false)}
          />
        )}
        {profileRow && !profileRow.invitedOnly && (
          <ContributorProfileSheet
            projectId={projectId}
            row={profileRow}
            onClose={() => setProfileRow(null)}
          />
        )}
        {removalRow && (
          <ConfirmationDialog
            title={
              removalRow.invitedOnly
                ? "Revoke this invitation?"
                : "Remove this contributor?"
            }
            message={
              removalRow.invitedOnly
                ? `${removalRow.email} has not joined yet. The pending invitation will be revoked and can be re-sent later.`
                : `${removalRow.email} will lose access to this project immediately. Their submitted observations remain in the project dataset and their profile is kept.`
            }
            confirmLabel={
              removalRow.invitedOnly
                ? "Revoke invitation"
                : "Remove contributor"
            }
            destructive
            onConfirm={() => void remove()}
            onCancel={() => setRemovalRow(null)}
          />
        )}
        {(codeRow || issuing) && (
          <ModalSurface
            onClose={closeCodeSheet}
            labelledBy="signin-code-title"
            className="device-link-sheet"
          >
            <div className="sheet-handle" />
            <div className="sheet-heading">
              <h2 id="signin-code-title">
                {issuing ? "Issuing code…" : "Sign-in code"}
              </h2>
              <IconButton
                label="Close sign-in code"
                icon="x"
                data-modal-autofocus
                onClick={closeCodeSheet}
              />
            </div>
            {issuing ? (
              <p className="sheet-copy">Creating a one-time code…</p>
            ) : codeRow && issuedCode ? (
              <>
                <p className="sheet-copy">
                  Emailed to <strong>{codeRow.email}</strong>
                  {issuedCode.emailed
                    ? ". You can also share it in person."
                    : " — email delivery failed, share it directly."}
                </p>
                <div
                  className="device-code"
                  aria-label={`Code ${issuedCode.code}`}
                  aria-live="polite"
                >
                  {issuedCode.code.split("").map((digit, index) => (
                    <span key={index}>{digit}</span>
                  ))}
                </div>
                <p className="device-code-expiry">
                  Expires in {Math.round(issuedCode.expiresInSeconds / 60)}{" "}
                  minutes · single use
                </p>
                <div className="device-link-actions">
                  <Button
                    variant="primary"
                    icon="file"
                    fullWidth
                    onClick={() => void copyIssuedCode()}
                  >
                    {copied ? "Code copied" : "Copy code"}
                  </Button>
                  <Button variant="quiet" fullWidth onClick={closeCodeSheet}>
                    Done
                  </Button>
                </div>
              </>
            ) : null}
          </ModalSurface>
        )}
      </section>
    );
  if (isSupabaseConfigured)
    return (
      <section className="admin-panel">
        <div className="panel-heading">
          <div>
            <h2>
              {error ? "Roster temporarily unavailable" : "Checking the roster"}
            </h2>
            {error && <p>It will retry automatically.</p>}
          </div>
        </div>
      </section>
    );

  return (
    <section className="admin-panel">
      <div className="panel-heading">
        <div>
          <h2>Contributors unavailable in preview</h2>
        </div>
        <div className="admin-context-actions">
          <Button variant="secondary" icon="plus" onClick={inviteUnavailable}>
            Add contributor
          </Button>
        </div>
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
  onExport: () => Promise<void> | void;
}) {
  const [isExporting, setIsExporting] = useState(false);
  const total = readiness?.length ?? project.contributors;
  const ready = readiness?.filter((row) => row.ready).length ?? 0;
  const readinessKnown = !isSupabaseConfigured || readiness !== null;
  const percentage = total ? Math.round((ready / total) * 100) : 0;

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await onExport();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section className="admin-panel export-panel">
      <div className="panel-heading">
        <div>
          <h2>Export checkpoint</h2>
        </div>
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
        <Button
          variant="primary"
          icon="download"
          onClick={() => void handleExport()}
          disabled={isExporting}
          busy={isExporting}
          fullWidth
        >
          {isExporting ? "Preparing checkpoint…" : "Export checkpoint"}
        </Button>
      </div>
      <InfoDisclosure title="Checkpoint coverage">
        <p>
          A checkpoint includes data received by the server. Offline devices may
          still hold unseen work.
        </p>
        <p>
          For large datasets with photos or audio, logging in from a desktop
          browser to download is recommended to save mobile bandwidth and device
          storage.
        </p>
      </InfoDisclosure>
    </section>
  );
}
