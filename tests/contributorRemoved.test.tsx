// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContributorHome } from "../src/components/ContributorHome";
import type { Project } from "../src/types";

import * as consent from "../src/lib/consent";

const consentMocks = {
  getMyProfile: vi.fn(),
};

const project: Project = {
  id: "p1",
  organization: "Org",
  organizationMark: "O",
  name: "Survey",
  description: "",
  instructions: "",
  status: "active",
  schemaVersion: 1,
  contributors: 0,
  completeSubmissions: 0,
  lastReceived: "No submissions yet",
  fields: [],
};

function renderHome() {
  return render(
    <ContributorHome
      projects={[]}
      activeProject={project}
      observations={[]}
      hasDraft={false}
      onStartObservation={() => undefined}
      onChooseProject={() => undefined}
      onResumeObservation={() => undefined}
      onDiscardAndStartObservation={() => undefined}
      onOpenSync={() => undefined}
    />,
  );
}

describe("contributor removal state", () => {
  beforeEach(() => {
    vi.spyOn(consent, "getMyProfile").mockImplementation(
      consentMocks.getMyProfile,
    );
  });
  it("shows 'Project access removed' with local-data note when access was revoked", async () => {
    consentMocks.getMyProfile.mockResolvedValue({
      userId: "u1",
      consentVersion: 1,
      consentGrantedAt: "2026-08-01T10:00:00Z",
      consentRevokedAt: null,
      qualityScore: null,
      attentionScore: null,
      attentionChecksTotal: null,
      attentionCorrectTotal: null,
      attentionLastAt: null,
      contributionCount: 0,
    });
    renderHome();
    expect(await screen.findByText("Project access removed")).toBeTruthy();
    expect(
      screen.getByText(/observations on this device stay here/i),
    ).toBeTruthy();
  });

  it("keeps the invitation copy for someone never assigned", async () => {
    consentMocks.getMyProfile.mockResolvedValue(null);
    renderHome();
    expect(await screen.findByText("No assigned project")).toBeTruthy();
    expect(
      screen.getByText(/send an invitation when fieldwork is ready/i),
    ).toBeTruthy();
  });
});
