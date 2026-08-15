/**
 * Authentication surface for the app.
 *
 * The implementation lives in `./auth/*`, one module per concern:
 *
 * - `config`    deployment coordinates and the single sign-in return URL
 * - `client`    the Supabase client instance
 * - `session`   sign-in returns, callback errors, session reads
 * - `providers` Google and Apple sign-in (no email, no mail quota)
 * - `email`     password sign-in and the backup email link
 * - `codes`     device-link and administrator-issued codes
 *
 * Everything else in the app imports from this module, so there is exactly one
 * authentication entry point to read, mock, and reason about.
 */
export {
  isSupabaseConfigured,
  localBackendKey,
  authRedirectOrigin,
  authReturnUrl,
} from "./auth/config";
export { supabase } from "./auth/client";
export {
  authCallbackError,
  authSession,
  clearAuthCallbackUrl,
  wasInviteCallback,
} from "./auth/session";
export {
  authProviderLabel,
  authProviders,
  consumePendingAuthRole,
  enabledAuthProviders,
  knownAuthProviders,
  rememberAuthRole,
  signInWithProvider,
  type AuthProvider,
} from "./auth/providers";
export {
  pendingAuthEmail,
  rememberAuthEmail,
  sendMagicLink,
  setPassword,
  signInWithPassword,
} from "./auth/email";
export {
  linkDeviceSession,
  requestContributorSigninCode,
  requestDeviceLinkCode,
} from "./auth/codes";
