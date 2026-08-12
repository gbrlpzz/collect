import { supabase } from "./supabaseClient";

export interface ConsentVersion {
  version: number;
  text: string;
}

export interface ContributorProfile {
  userId: string;
  consentVersion: number | null;
  consentGrantedAt: string | null;
  consentRevokedAt: string | null;
  qualityScore: number | null;
}

function requireClient() {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

/** The current consent statement the app must show before collection. */
export async function getCurrentConsent(): Promise<ConsentVersion | null> {
  const client = requireClient();
  const { data, error } = await client
    .from("consent_versions")
    .select("version,text")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data ? { version: data.version, text: data.text } : null;
}

/** The signed-in user's profile (consent state, quality score). */
export async function getMyProfile(): Promise<ContributorProfile | null> {
  const client = requireClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) return null;
  const { data } = await client
    .from("contributor_profiles")
    .select("user_id,consent_version,consent_granted_at,consent_revoked_at,quality_score")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!data) return null;
  return {
    userId: data.user_id,
    consentVersion: data.consent_version,
    consentGrantedAt: data.consent_granted_at,
    consentRevokedAt: data.consent_revoked_at,
    qualityScore: data.quality_score,
  };
}

/** Record in-app consent for the current consent version. */
export async function acceptConsent(version: number): Promise<void> {
  const client = requireClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw new Error("Authentication is required to record consent");
  const now = new Date().toISOString();
  const { error } = await client.from("contributor_profiles").upsert(
    {
      user_id: userData.user.id,
      consent_version: version,
      consent_granted_at: now,
      consent_revoked_at: null,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error("Consent could not be recorded");
}

export function isConsentGranted(profile: ContributorProfile | null): boolean {
  return Boolean(profile?.consentGrantedAt) && !profile?.consentRevokedAt;
}
