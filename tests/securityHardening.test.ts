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
  });
});
