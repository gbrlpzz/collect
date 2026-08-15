import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { csvCell } from "../supabase/functions/_shared/csv.ts";

describe("Security hardening", () => {
  describe("CSV Formula Injection Neutralization", () => {
    it("escapes formula prefixes with a leading single quote", () => {
      expect(csvCell("=1+1")).toBe('"\'=1+1"');
      expect(csvCell("+12345")).toBe('"\'+12345"');
      expect(csvCell("-cmd|' /C calc'!A0")).toBe("\"'-cmd|' /C calc'!A0\"");
      expect(csvCell("@SUM(A1:A10)")).toBe('"\'@SUM(A1:A10)"');
      expect(csvCell("\tleading-tab")).toBe('"\'\tleading-tab"');
      expect(csvCell("\rleading-return")).toBe('"\'\rleading-return"');
    });

    it("preserves safe values without single quote prefix", () => {
      expect(csvCell("VA-001")).toBe('"VA-001"');
      expect(csvCell("Oak tree in northern corner")).toBe(
        '"Oak tree in northern corner"',
      );
      expect(csvCell('Contains "quotes"')).toBe('"Contains ""quotes"""');
      expect(csvCell(12345)).toBe('"12345"');
      expect(csvCell(null)).toBe('""');
    });
  });

  describe("SQL Migration Integrity & Policies", () => {
    it("migration file exists and contains contributor org policy and storage complete check", () => {
      const migrationPath = resolve(
        __dirname,
        "../supabase/migrations/20260813202500_harden_rls_and_storage.sql",
      );
      const content = readFileSync(migrationPath, "utf-8");

      // Verify organization policy allows project members
      expect(content).toContain("organizations_select_member");
      expect(content).toContain("project_members");
      expect(content).toContain("organizations.id");

      // Verify storage write helper checks for status <> 'COMPLETE'
      expect(content).toContain("is_submission_media_writer");
      expect(content).toContain("status <> 'COMPLETE'");

      // Verify covering index
      expect(content).toContain("submissions_project_status_received_idx");
    });

    it("sign-in-code IP throttle returns a real boolean (fails closed)", () => {
      const content = readFileSync(
        resolve(
          __dirname,
          "../supabase/migrations/20260814150000_fix_signin_code_ip_throttle.sql",
        ),
        "utf-8",
      );

      // The variable that receives RETURNING request_count must be an
      // integer, and the function must return a boolean derived from it so
      // the anonymous self-service path can never fail open.
      expect(content).toContain("recorded integer");
      expect(content).toContain("returning request_count");
      expect(content).toContain("return coalesce(recorded, 0) > 0;");
    });

    it("self-service audit rows are no longer dropped by a NOT NULL org", () => {
      const content = readFileSync(
        resolve(
          __dirname,
          "../supabase/migrations/20260814151000_allow_null_audit_organization.sql",
        ),
        "utf-8",
      );
      expect(content).toContain("alter column organization_id drop not null");
    });

    it("removes the inert per-code failed-attempt counter", () => {
      const content = readFileSync(
        resolve(
          __dirname,
          "../supabase/migrations/20260814152000_remove_vestigial_attempt_counter.sql",
        ),
        "utf-8",
      );
      expect(content).toContain(
        "drop function if exists public.bump_session_link_attempt(text)",
      );
      expect(content).toContain("drop column if exists attempts");
      expect(content).not.toContain("and attempts < 10");
    });
  });

  describe("Authentication model", () => {
    const read = (relative: string) =>
      readFileSync(resolve(__dirname, relative), "utf-8");

    it("grants administrator rights only from an explicit allow-list", () => {
      const shared = read("../supabase/functions/_shared/auth.ts");
      // The permissive default (no patterns configured => everyone allowed)
      // must never reach the grant path: open contributor sign-up would
      // otherwise hand the workspace to the next stranger who signs in.
      expect(shared).toContain(
        "export async function isEmailExplicitlyAllowed",
      );
      const strict = shared.slice(shared.indexOf("isEmailExplicitlyAllowed"));
      expect(strict).toContain("if (!patterns.length) return false;");

      const claim = read("../supabase/functions/claim-invites/index.ts");
      expect(claim).toContain("isEmailExplicitlyAllowed");
      // Only a verified address may claim rights.
      expect(claim).toContain("if (!user.email_confirmed_at) return false;");
    });

    it("keeps the first workspace behind the allow-list", () => {
      const bootstrap = read(
        "../supabase/functions/bootstrap-workspace/index.ts",
      );
      expect(bootstrap).toContain("isEmailAllowed");
      expect(bootstrap).toContain("administrator allow-list");
    });

    it("never spends the authentication provider's mail allowance on invitations", () => {
      for (const relative of [
        "../supabase/functions/send-project-invite/index.ts",
        "../supabase/functions/send-admin-invite/index.ts",
      ]) {
        const source = read(relative);
        expect(source).not.toContain("inviteUserByEmail");
        expect(source).not.toContain("auth/v1/resend");
        // Invitations leave through the project's own mail provider.
        expect(source).toContain("sendEmail(");
      }
    });

    it("never creates an account from the email link path", () => {
      const email = read("../src/lib/auth/email.ts");
      expect(email).toContain("shouldCreateUser: false");
    });

    it("creates an account for an invited address only", () => {
      const code = read(
        "../supabase/functions/contributor-signin-code/index.ts",
      );
      const request = code.slice(code.indexOf('if (action === "request")'));
      expect(request).toContain("auth.admin.createUser");
      // The creation is guarded by a pending invitation for that address.
      expect(request).toContain("if (!userId && invite)");
      expect(request).toContain('.eq("status", "pending")');
    });

    it("lets only the service role edit the administrator allow-list", () => {
      const migration = read(
        "../supabase/migrations/20260815114933_admin_allow_list_grants.sql",
      );
      expect(migration).toContain(
        "revoke all on function public.add_allowed_admin_pattern(text, text)\n  from public, anon, authenticated;",
      );
      expect(migration).toContain(
        "grant execute on function public.add_allowed_admin_pattern(text, text)\n  to service_role;",
      );
    });
  });
});
