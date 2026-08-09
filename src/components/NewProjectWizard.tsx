import { useState } from "react";
import { Icon } from "./Icon";
import { Button, Divider, Eyebrow, IconButton, StatusBadge } from "./Primitives";
import { cloneFieldDefinitions, createFieldForType, fieldWithType, projectFields, schemaFieldTypes } from "../data";
import type { FieldDefinition } from "../types";
import { defaultOrganizationName } from "../lib/adminBackend";

interface NewProjectWizardProps {
  onBack: () => void;
  onPublish: (input: { organizationName: string; name: string; description: string; instructions: string; fields: FieldDefinition[]; emails: string[] }) => void | Promise<void>;
}

const wizardSteps = ["Identity", "Schema", "Contributors", "Publish"];
export function NewProjectWizard({ onBack, onPublish }: NewProjectWizardProps) {
  const [step, setStep] = useState(1);
  const [organizationName, setOrganizationName] = useState(defaultOrganizationName);
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [emails, setEmails] = useState("");
  const [fields, setFields] = useState<FieldDefinition[]>(() => cloneFieldDefinitions(projectFields));
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const continueStep = () => setStep((current) => Math.min(current + 1, 4));
  const publish = async () => {
    setPublishing(true);
    setError(null);
    try {
      await onPublish({
        organizationName,
        name: projectName || "Untitled field project",
        description,
        instructions,
        fields,
        emails: emails.split(/[\n,]+/).map((email) => email.trim()).filter(Boolean),
      });
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "The project could not be published");
    } finally {
      setPublishing(false);
    }
  };

  const updateField = (id: string, patch: Partial<FieldDefinition>) => setFields((current) => current.map((field) => field.id === id ? { ...field, ...patch } : field));
  const removeField = (id: string) => setFields((current) => current.filter((field) => field.id !== id));
  const addField = () => setFields((current) => [...current, createFieldForType("short_text", current.length + 1)]);

  return (
    <main className="page page-wizard">
      <div className="back-row"><button className="back-button" onClick={onBack}><Icon name="arrow-left" size={17} /> Admin workspace</button><StatusBadge tone="soft">New project</StatusBadge></div>
      <div className="wizard-heading"><Eyebrow>Project setup</Eyebrow><h1>Start a field project.</h1><p className="lede">A short setup path for a reliable collection surface.</p></div>
      <div className="wizard-steps" aria-label="Project setup progress">{wizardSteps.map((label, index) => <div className={`wizard-step ${step === index + 1 ? "wizard-step-active" : ""} ${step > index + 1 ? "wizard-step-done" : ""}`} key={label}><span>{step > index + 1 ? <Icon name="check" size={13} /> : index + 1}</span><strong>{label}</strong></div>)}</div>

      <section className="wizard-panel">
        {step === 1 && <div className="wizard-form"><div><Eyebrow>Step 1 of 4</Eyebrow><h2>Give the project an identity.</h2><p>Contributors will see this before they begin collecting.</p></div><label>Workspace name<input className="field-input" value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} placeholder="e.g. Onrange" /></label><label>Project name<input className="field-input" value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="e.g. Valladolid Rural Houses" /></label><label>Short description <span className="optional-label">Optional</span><input className="field-input" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="e.g. Occupancy and condition survey" /></label><label>Field instructions <span className="optional-label">Optional</span><textarea className="field-input field-textarea" value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="What should contributors know before they start?" rows={4} /></label><div className="schema-builder-note"><Icon name="shield" size={17} /><span>On a new deployment, the first signed-in administrator creates this workspace. Additional administrators are granted access during setup.</span></div></div>}
        {step === 2 && <div className="wizard-form"><div><Eyebrow>Step 2 of 4</Eyebrow><h2>Define what gets observed.</h2><p>Start with a small set of predictable, strongly typed fields.</p></div><div className="builder-list">{fields.filter((field) => field.type !== "heading").map((field, index) => <div className="builder-row" key={field.id}><span className="builder-index">{String(index + 1).padStart(2, "0")}</span><div className="builder-controls"><input className="builder-inline-input" value={field.label} aria-label={`Field ${index + 1} label`} onChange={(event) => updateField(field.id, { label: event.target.value })} /><div><input className="builder-key-input" value={field.key} aria-label={`${field.label} machine key`} onChange={(event) => updateField(field.id, { key: event.target.value.replace(/[^a-zA-Z0-9_]/g, "_") })} /><select className="builder-select" value={field.type} aria-label={`${field.label} type`} onChange={(event) => updateField(field.id, fieldWithType(field, event.target.value as Exclude<FieldDefinition["type"], "heading">))}>{schemaFieldTypes.map((type) => <option value={type} key={type}>{type.replaceAll("_", " ")}</option>)}</select></div></div><label className="builder-required"><input type="checkbox" checked={Boolean(field.required)} onChange={(event) => updateField(field.id, { required: event.target.checked })} /> Required</label><IconButton label={`Remove ${field.label}`} icon="x" onClick={() => removeField(field.id)} /></div>)}</div><button className="add-field-row" onClick={addField}><Icon name="plus" size={17} /> Add field</button><div className="schema-builder-note"><Icon name="shield" size={17} /><span>Published schemas are immutable. Editing later creates a new version.</span></div></div>}
        {step === 3 && <div className="wizard-form"><div><Eyebrow>Step 3 of 4</Eyebrow><h2>Assign the field team.</h2><p>People only see the project and form assigned to them.</p></div><label>Contributor email addresses<textarea className="field-input field-textarea" value={emails} onChange={(event) => setEmails(event.target.value)} rows={5} /></label><div className="invite-preview"><div className="invite-icon"><Icon name="send" size={19} /></div><div><strong>Invitation preview</strong><span>“You have been invited to collect observations for this project.”</span></div><StatusBadge tone="soft">{emails.split(/[\n,]+/).filter((email) => email.trim()).length} invites</StatusBadge></div><div className="schema-builder-note"><Icon name="info" size={17} /><span>Existing accounts are assigned immediately. Unknown addresses receive an email invitation.</span></div></div>}
        {step === 4 && <div className="wizard-form"><div><Eyebrow>Step 4 of 4</Eyebrow><h2>Ready to publish.</h2><p>Publishing makes this schema available offline to the assigned field team.</p></div><div className="publish-summary"><div><span>Project</span><strong>{projectName || "Untitled field project"}</strong></div><div><span>Fields</span><strong>{fields.filter((field) => field.type !== "heading").length} typed fields</strong></div><div><span>Contributors</span><strong>{emails.split(/[\n,]+/).filter((email) => email.trim()).length} invitations</strong></div><div><span>Schema version</span><strong>v1</strong></div></div><div className="publish-receipt"><Icon name="shield" size={21} /><div><strong>Safe to publish</strong><span>Once published, this version cannot be edited. A later change creates a new draft.</span></div></div></div>}
        <Divider />
        {error && <p className="auth-error" role="alert">{error}</p>}
        <div className="wizard-actions"><Button variant="secondary" onClick={() => step === 1 ? onBack() : setStep((current) => current - 1)} disabled={publishing}>{step === 1 ? "Cancel" : "Back"}</Button>{step < 4 ? <Button variant="primary" iconAfter="arrow-right" onClick={continueStep}>Continue</Button> : <Button variant="primary" icon="check" onClick={publish} disabled={publishing}>{publishing ? "Publishing…" : "Publish project"}</Button>}</div>
      </section>
    </main>
  );
}
