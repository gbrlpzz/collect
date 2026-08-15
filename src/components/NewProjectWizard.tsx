import { useState } from "react";
import { AppCredit } from "./AppCredit";
import { Icon } from "./Icon";
import { Button, Divider, IconButton, InfoDisclosure } from "./ui";
import { projectFields } from "../data/schemaFixtures";
import {
  cloneFieldDefinitions,
  createFieldForType,
  fieldWithType,
  schemaFieldTypes,
} from "../lib/schema";
import type { FieldDefinition } from "../types";
import { defaultOrganizationName } from "../lib/adminBackend";

interface NewProjectWizardProps {
  onBack: () => void;
  onPublish: (input: {
    organizationName: string;
    name: string;
    description: string;
    instructions: string;
    fields: FieldDefinition[];
    emails: string[];
    license?: string;
    contactEmail?: string;
    datasetIdentifier?: string;
  }) => void | Promise<void>;
}

const LICENSE_OPTIONS = [
  "CC0-1.0",
  "CC-BY-4.0",
  "CC-BY-SA-4.0",
  "ODbL-1.0",
  "Proprietary",
];

const wizardSteps = ["Project", "Form", "Team"];
export function NewProjectWizard({ onBack, onPublish }: NewProjectWizardProps) {
  const [step, setStep] = useState(1);
  const [organizationName, setOrganizationName] = useState(
    defaultOrganizationName,
  );
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [emails, setEmails] = useState("");
  const [license, setLicense] = useState("CC-BY-4.0");
  const [customLicense, setCustomLicense] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [datasetIdentifier, setDatasetIdentifier] = useState("");
  const [fields, setFields] = useState<FieldDefinition[]>(() =>
    cloneFieldDefinitions(projectFields),
  );
  const [focusFieldId, setFocusFieldId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const continueStep = () =>
    setStep((current) => Math.min(current + 1, wizardSteps.length));
  const publish = async () => {
    if (publishing) return;
    setPublishing(true);
    setError(null);
    try {
      await onPublish({
        organizationName,
        name: projectName || "Untitled field project",
        description,
        instructions,
        fields,
        emails: emails
          .split(/[\n,]+/)
          .map((email) => email.trim())
          .filter(Boolean),
        license:
          license === "Other" ? customLicense.trim() || undefined : license,
        contactEmail: contactEmail.trim() || undefined,
        datasetIdentifier: datasetIdentifier.trim() || undefined,
      });
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "The project could not be published",
      );
    } finally {
      setPublishing(false);
    }
  };

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

  return (
    <main className="page page-wizard">
      <div className="back-row">
        <button
          className="back-button wizard-back-button"
          onClick={onBack}
          aria-label="Back to projects"
        >
          <Icon name="chevron-left" size={17} />
          <span className="back-button-label">Projects</span>
        </button>
      </div>
      <div className="wizard-heading">
        <h1>New project</h1>
      </div>
      <div className="wizard-steps" aria-label="Project setup progress">
        {wizardSteps.map((label, index) => (
          <div
            className={`wizard-step ${step === index + 1 ? "wizard-step-active" : ""} ${step > index + 1 ? "wizard-step-done" : ""}`}
            aria-current={step === index + 1 ? "step" : undefined}
            key={label}
          >
            <span>
              {step > index + 1 ? <Icon name="check" size={13} /> : index + 1}
            </span>
            <strong>{label}</strong>
          </div>
        ))}
      </div>

      <form
        className="wizard-panel"
        onSubmit={(event) => {
          event.preventDefault();
          if (step < wizardSteps.length) {
            continueStep();
          } else {
            void publish();
          }
        }}
      >
        {step === 1 && (
          <div className="wizard-form">
            <div>
              <h2>Name the project</h2>
            </div>
            <label>
              Project name
              <input
                className="field-input"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="e.g. Valladolid Rural Houses"
                autoFocus={step === 1}
                required
              />
            </label>
            <details className="wizard-disclosure">
              <summary>
                <span>
                  <strong>Description and instructions</strong>
                  <span>Optional context for the field team</span>
                </span>
                <Icon name="chevron-down" size={16} />
              </summary>
              <label>
                Short description
                <input
                  className="field-input"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="e.g. Occupancy and condition survey"
                />
              </label>
              <label>
                Field instructions
                <textarea
                  className="field-input field-textarea"
                  value={instructions}
                  onChange={(event) => setInstructions(event.target.value)}
                  placeholder="What should contributors know before they start?"
                  rows={4}
                />
              </label>
            </details>
            <details className="wizard-disclosure dataset-metadata">
              <summary>
                <span>
                  <strong>Workspace and dataset metadata</strong>
                  <span>License, contact, and identifier</span>
                </span>
                <Icon name="chevron-down" size={16} />
              </summary>
              <div className="wizard-disclosure-fields">
                <label>
                  Workspace name
                  <input
                    className="field-input"
                    value={organizationName}
                    onChange={(event) =>
                      setOrganizationName(event.target.value)
                    }
                    placeholder="e.g. Field organization"
                  />
                </label>
                <label>
                  License <span className="optional-label">CC-BY-4.0</span>
                  <select
                    className="field-input"
                    value={license}
                    onChange={(event) => setLicense(event.target.value)}
                  >
                    {[...LICENSE_OPTIONS, "Other"].map((option) => (
                      <option value={option} key={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                {license === "Other" && (
                  <label>
                    License name or SPDX identifier
                    <input
                      className="field-input"
                      value={customLicense}
                      onChange={(event) => setCustomLicense(event.target.value)}
                      placeholder="e.g. CC-BY-NC-4.0"
                    />
                  </label>
                )}
                <label>
                  Dataset contact email
                  <input
                    className="field-input"
                    type="email"
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    placeholder="dataset@organization.org"
                  />
                </label>
                <label>
                  Dataset identifier{" "}
                  <span className="optional-label">DOI or URL</span>
                  <input
                    className="field-input"
                    value={datasetIdentifier}
                    onChange={(event) =>
                      setDatasetIdentifier(event.target.value)
                    }
                    placeholder="10.5281/zenodo.0000000"
                  />
                </label>
              </div>
            </details>
          </div>
        )}
        {step === 2 && (
          <div className="wizard-form">
            <div>
              <h2>Build the form</h2>
            </div>
            <div className="builder-list">
              {fields
                .filter((field) => field.type !== "heading")
                .map((field, index) => (
                  <div className="builder-row" key={field.id}>
                    <span className="builder-index">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="builder-controls">
                      <input
                        className="builder-inline-input"
                        value={field.label}
                        aria-label={`Field ${index + 1} label`}
                        autoFocus={index === 0 || field.id === focusFieldId}
                        onChange={(event) =>
                          updateField(field.id, { label: event.target.value })
                        }
                      />
                      <div>
                        <select
                          className="builder-select"
                          value={field.type}
                          aria-label={`${field.label} type`}
                          onChange={(event) => {
                            const nextType = schemaFieldTypes.find(
                              (t) => t === event.target.value,
                            );
                            if (nextType) {
                              updateField(
                                field.id,
                                fieldWithType(field, nextType),
                              );
                            }
                          }}
                        >
                          {schemaFieldTypes.map((type) => (
                            <option value={type} key={type}>
                              {type.replaceAll("_", " ")}
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
                            aria-label={`${field.label} machine key`}
                            onChange={(event) =>
                              updateField(field.id, {
                                key: event.target.value.replace(
                                  /[^a-zA-Z0-9_]/g,
                                  "_",
                                ),
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
                          updateField(field.id, {
                            required: event.target.checked,
                          })
                        }
                      />{" "}
                      Required
                    </label>
                    <IconButton
                      label={`Remove ${field.label}`}
                      icon="x"
                      onClick={() => removeField(field.id)}
                    />
                  </div>
                ))}
            </div>
            <button type="button" className="add-field-row" onClick={addField}>
              <Icon name="plus" size={17} /> Add field
            </button>
          </div>
        )}
        {step === 3 && (
          <div className="wizard-form">
            <div>
              <h2>Invite contributors</h2>
            </div>
            <label>
              Contributor email addresses{" "}
              <span className="optional-label">Optional</span>
              <textarea
                className="field-input field-textarea"
                value={emails}
                onChange={(event) => setEmails(event.target.value)}
                rows={5}
                placeholder="name@example.org"
              />
            </label>
            <InfoDisclosure title="How invitations work">
              <p>
                Existing accounts are assigned immediately. New addresses get an
                email naming this project and linking to the sign-in screen.
                They sign in with Google, Apple, or a backup method, and the
                project appears.
              </p>
            </InfoDisclosure>
            <div className="publish-summary">
              <div>
                <span>Project</span>
                <strong>{projectName || "Untitled field project"}</strong>
              </div>
              <div>
                <span>Fields</span>
                <strong>
                  {fields.filter((field) => field.type !== "heading").length}{" "}
                  typed fields
                </strong>
              </div>
              <div>
                <span>Contributors</span>
                <strong>
                  {
                    emails.split(/[\n,]+/).filter((email) => email.trim())
                      .length
                  }{" "}
                  invitations
                </strong>
              </div>
            </div>
            <div className="publish-receipt">
              <Icon name="shield" size={21} />
              <div>
                <strong>Publishing locks this version</strong>
                <span>Later changes create a new version.</span>
              </div>
            </div>
          </div>
        )}
        <Divider />
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <div className="wizard-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              step === 1 ? onBack() : setStep((current) => current - 1)
            }
            disabled={publishing}
          >
            {step === 1 ? "Cancel" : "Back"}
          </Button>
          {step < wizardSteps.length ? (
            <Button
              type="submit"
              variant="primary"
              iconAfter="arrow-right"
              disabled={step === 1 && !projectName.trim()}
            >
              Continue
            </Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              icon="check"
              disabled={publishing}
              busy={publishing}
            >
              {publishing ? "Publishing…" : "Publish project"}
            </Button>
          )}
        </div>
      </form>
      <AppCredit />
    </main>
  );
}
