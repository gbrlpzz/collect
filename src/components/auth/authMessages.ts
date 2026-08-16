/**
 * One place that turns an authentication failure into a sentence a field
 * contributor can act on. Auth errors arrive as free text from several
 * services; the app must never show raw provider wording.
 */
export type SignInStep =
  "provider" | "link" | "password" | "code" | "code-request" | "password-setup";

function detail(cause: unknown): string {
  if (cause instanceof Error) return cause.message.toLowerCase();
  if (cause && cause instanceof Object && "message" in cause) {
    // SAFETY: cause object message property.
    return String((cause as { message?: unknown }).message ?? "").toLowerCase();
  }
  return "";
}

function isNetwork(message: string): boolean {
  return (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("failed to") ||
    message.includes("timeout")
  );
}

export function signInErrorMessage(cause: unknown, step: SignInStep): string {
  const message = detail(cause);
  if (isNetwork(message))
    return "We couldn’t reach the sign-in service. Check your connection and try again.";
  if (message.includes("rate") || message.includes("too many"))
    return "Too many attempts. Wait a moment, then try once more.";

  switch (step) {
    case "provider":
      if (message.includes("provider") || message.includes("not enabled"))
        return "That provider is not available on this deployment. Use another option below.";
      return "That sign-in could not be started. Try again, or use another option below.";
    case "link":
      if (message.includes("redirect") || message.includes("url"))
        return "This deployment’s sign-in return address is not configured yet. Ask its administrator to add the app URL in Supabase.";
      if (
        message.includes("signups not allowed") ||
        message.includes("not found") ||
        message.includes("user")
      )
        // Enumeration-safe: the answer must match the code path's uniform
        // contract and never confirm whether the address has an account.
        return "If an account exists for that address, a sign-in link is on its way. Continue with Google or Apple, or ask your administrator for an invitation.";
      return "That sign-in link could not be sent. Check the address and try again.";
    case "password":
      if (
        message.includes("invalid") ||
        message.includes("credentials") ||
        message.includes("password")
      )
        return "The email address or password is incorrect. Try again.";
      return "Sign-in could not be completed. Check your details and try again.";
    case "code":
      if (
        message.includes("expired") ||
        message.includes("invalid") ||
        message.includes("code") ||
        message.includes("not found")
      )
        return "That code is invalid or expired. Ask your administrator for a fresh code.";
      return "That code could not be used. Request a fresh code and try again.";
    case "code-request":
      if (message.includes("configured"))
        return "We couldn’t reach the sign-in service. Check your connection and try again.";
      return "That could not be completed. Try again in a moment.";
    case "password-setup":
      if (
        message.includes("weak") ||
        message.includes("short") ||
        message.includes("characters")
      )
        // Matches the deployment's configured minimum (10).
        return "Choose a stronger password (at least 10 characters).";
      return "The password could not be saved. Try again.";
  }
}
