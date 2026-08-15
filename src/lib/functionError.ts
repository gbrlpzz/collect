import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const errorJsonSchema = z.object({
  error: z.string().min(1),
});

/**
 * Supabase wraps non-2xx Edge Function responses in FunctionsHttpError whose
 * message is only a status line. The server's reason lives in the response
 * body; this helper extracts it so callers get the real, user-facing error.
 */
export async function readFunctionErrorBody(
  error: Error | { context?: Response } | null | undefined,
): Promise<string | null> {
  if (!error) return null;
  const context = "context" in error ? error.context : null;
  if (context instanceof Response) {
    try {
      const json: unknown = await context.clone().json();
      const parsed = errorJsonSchema.safeParse(json);
      if (parsed.success) return parsed.data.error;
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
import type { JsonValue } from "../types";

export async function invokeFunction<
  T,
  B extends Record<string, JsonValue> = Record<string, JsonValue>,
>(
  client: SupabaseClient,
  name: string,
  body: B,
  schema?: z.ZodType<T>,
): Promise<T> {
  const { data, error } = await client.functions.invoke(name, { body });
  if (error) {
    const message = await readFunctionErrorBody(error);
    if (message) throw new Error(message);
    throw error;
  }
  if (schema) return schema.parse(data);
  // SAFETY: when no schema is provided, the caller assumes responsibility for the response type.
  return data as T;
}
