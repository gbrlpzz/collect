import type { SubmissionState } from "../types";

export type { SubmissionState } from "../types";

export function buildMediaObjectPath(
  projectId: string,
  submissionId: string,
  mediaId: string,
): string {
  return `projects/${projectId}/submissions/${submissionId}/${mediaId}`;
}

export function outboxKey(operationType: string, entityId: string): string {
  return `${operationType}:${entityId}`;
}

export function hasServerReceipt(state: SubmissionState): boolean {
  return state === "SYNCED";
}
