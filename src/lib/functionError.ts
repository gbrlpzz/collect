import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase wraps non-2xx Edge Function responses in FunctionsHttpError whose
 * message is only a status line. The server's reason lives in the response
 * body; this helper extracts it so callers get the real, user-facing error.
 */
export async function readFunctionErrorBody(error: unknown): Promise<string | null> {
  const context = error && typeof error === "object"
    ? (error as { context?: unknown }).context
    : null;
  if (
    context &&
    typeof context === "object" &&
    "clone" in context &&
    typeof (context as { clone?: unknown }).clone === "function"
  ) {
    try {
      const body = await (context as Response).clone().json() as { error?: unknown };
      if (typeof body.error === "string" && body.error.trim()) return body.error;
    } catch {
      // The response is not JSON; fall back to the caller's fallback/error.
    }
  }
  return null;
}

/**
 * Invoke an Edge Function and throw the server's own error message when the
 * call fails. The schema is optional and used only to shape the success
 * payload.
 */
export async function invokeFunction<T>(
  client: SupabaseClient,
  name: string,
  body: Record<string, unknown>,
  schema?: { parse: (value: unknown) => T },
): Promise<T> {
  const { data, error } = await client.functions.invoke(name, { body });
  if (error) {
    const message = await readFunctionErrorBody(error);
    if (message) throw new Error(message);
    throw error;
  }
  return schema ? schema.parse(data) : (data as T);
}
