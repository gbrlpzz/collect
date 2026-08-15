/**
 * Failure classification for the sync loop. Errors the automation cannot
 * resolve become ACTION_REQUIRED (a person must intervene — recover the
 * media, republish the schema, restore consent); everything else stays
 * retryable with backoff.
 *
 * Local code throws `ActionRequiredError` directly. Server messages arrive
 * as plain Error strings from the edge functions and are matched by pattern.
 */

export class ActionRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionRequiredError";
  }
}

const ACTION_REQUIRED_PATTERN =
  /unknown schema|revoked|consent|forbidden|not authorized|permission|conflict|corrupt|assignment is not active|belongs to another|immutable|does not match the published schema|is not a published option|not configured as the first administrator|size does not match|checksum|integrity|invalid option|not active|closed|no local blob|not acknowledged by the server/i;

export function isActionRequiredFailure(
  error: Error | ActionRequiredError | unknown | null | undefined,
): boolean {
  if (error instanceof ActionRequiredError) return true;
  const message = error instanceof Error ? error.message : "";
  return ACTION_REQUIRED_PATTERN.test(message);
}

export interface FailureGuidance {
  /** What went wrong, in one line a contributor can read. */
  title: string;
  /** The single most useful next step. */
  action: string;
}

const GUIDANCE_RULES: ReadonlyArray<{
  pattern: RegExp;
  guidance: FailureGuidance;
}> = [
  {
    pattern: /no local blob|not acknowledged by the server/i,
    guidance: {
      title: "A photo or audio file is missing from this device",
      action:
        "The record is safe, but its media cannot be uploaded. Contact your administrator — they can recover or replace it.",
    },
  },
  {
    pattern:
      /unknown schema|does not match the published schema|is not a published option/i,
    guidance: {
      title: "The project form has changed",
      action:
        "This record was captured under an older form version. The administrator must republish or accept it; contact them.",
    },
  },
  {
    pattern: /revoked|consent|assignment is not active|not active|closed/i,
    guidance: {
      title: "Your access to this project changed",
      action:
        "Membership or consent is no longer valid on the server. Contact the project administrator to restore access.",
    },
  },
  {
    pattern:
      /conflict|belongs to another|immutable|corrupt|checksum|integrity|size does not match|does not match the submission/i,
    guidance: {
      title: "The server refused this record to protect existing data",
      action:
        "It conflicts with what the server already holds. Contact your administrator to resolve it.",
    },
  },
  {
    pattern: /forbidden|not authorized|permission/i,
    guidance: {
      title: "The server refused this record",
      action:
        "Your account may no longer have access. Contact the project administrator.",
    },
  },
];

const FALLBACK_GUIDANCE: FailureGuidance = {
  title: "This record could not sync",
  action:
    "It stays saved on this device. Try again, or contact your administrator if it keeps failing.",
};

/** Human-readable cause and next step for a stored sync error. */
export function failureGuidance(lastError: string | null): FailureGuidance {
  const message = lastError ?? "";
  for (const rule of GUIDANCE_RULES) {
    if (rule.pattern.test(message)) return rule.guidance;
  }
  return FALLBACK_GUIDANCE;
}
