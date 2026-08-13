// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { buildReadinessRows } from "../src/lib/adminBackend";

const member = { user_id: "user-1" };
const profile = {
  user_id: "user-1",
  attention_score: 88,
  attention_checks_total: 6,
  attention_correct_total: 5,
  consent_granted_at: "2026-08-13T08:00:00.000Z",
  consent_revoked_at: null,
};

describe("buildReadinessRows", () => {
  it("marks a contributor ready when every device reported clean", () => {
    const rows = buildReadinessRows({
      members: [member],
      invites: [],
      statuses: [
        {
          contributor_id: "user-1",
          last_seen_at: "2026-08-13T09:00:00.000Z",
          last_sync_success_at: "2026-08-13T09:00:00.000Z",
          pending_submissions: 0,
          pending_media: 0,
          fieldwork_complete: true,
        },
      ],
      profiles: [profile],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].ready).toBe(true);
    expect(rows[0].status).toBe("Ready");
    expect(rows[0].consentGranted).toBe(true);
  });

  it("keeps a contributor not ready while any device has pending work", () => {
    const rows = buildReadinessRows({
      members: [member],
      invites: [],
      statuses: [
        {
          contributor_id: "user-1",
          last_seen_at: "2026-08-13T09:00:00.000Z",
          last_sync_success_at: null,
          pending_submissions: 2,
          pending_media: 1,
          fieldwork_complete: false,
        },
      ],
      profiles: [profile],
    });
    expect(rows[0].ready).toBe(false);
    expect(rows[0].pending).toBe(3);
  });

  it("appends unclaimed pending invitations as invitedOnly rows", () => {
    const rows = buildReadinessRows({
      members: [],
      invites: [
        {
          id: "invite-1",
          email: "new@example.com",
          invited_user_id: null,
          status: "pending",
        },
      ],
      statuses: [],
      profiles: [],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].invitedOnly).toBe(true);
    expect(rows[0].status).toBe("Invitation pending");
    expect(rows[0].id).toBe("invite:invite-1");
  });

  it("does not duplicate a member whose invite is already accepted", () => {
    const rows = buildReadinessRows({
      members: [member],
      invites: [
        {
          id: "invite-1",
          email: "member@example.com",
          invited_user_id: "user-1",
          status: "accepted",
        },
      ],
      statuses: [],
      profiles: [profile],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].invitedOnly).toBeUndefined();
    expect(rows[0].email).toBe("member@example.com");
  });

  it("skips a pending invite whose invited user is already a member", () => {
    const rows = buildReadinessRows({
      members: [member],
      invites: [
        {
          id: "invite-1",
          email: "member@example.com",
          invited_user_id: "user-1",
          status: "pending",
        },
      ],
      statuses: [],
      profiles: [profile],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].invitedOnly).toBeUndefined();
  });

  it("returns an empty roster for empty inputs", () => {
    expect(
      buildReadinessRows({
        members: [],
        invites: [],
        statuses: [],
        profiles: [],
      }),
    ).toEqual([]);
  });
});
