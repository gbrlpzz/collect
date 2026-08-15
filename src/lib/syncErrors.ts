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
