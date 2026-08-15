import { useEffect, useState } from "react";
import {
  authCallbackError,
  knownAuthProviders,
  enabledAuthProviders,
  type AuthProvider,
} from "../../lib/supabaseClient";
import { CollectBrand } from "../CollectBrand";
import { Icon } from "../Icon";
import { isAppleMobileBrowser, isStandaloneApp } from "../../lib/platform";
import { CodeSignIn } from "./CodeSignIn";
import { EmailLinkForm } from "./EmailLinkForm";
import { PasswordForm } from "./PasswordForm";
import { PasswordSetup } from "./PasswordSetup";
import { ProviderSignIn } from "./ProviderSignIn";

interface AuthScreenProps {
  configured: boolean;
  role?: "admin" | "contributor";
  onPreview?: () => void;
  /** After an invitation or code sign-in, the account has no password yet. */
  requirePasswordSetup?: boolean;
  onPasswordSet?: () => void;
}

/** Sign-in methods, in the order the screen offers them. */
type EntryMode = "provider" | "link" | "password" | "code";

const modeTitle: Record<EntryMode, string> = {
  provider: "Sign in.",
  link: "Sign in with a link.",
  password: "Sign in with a password.",
  code: "Sign in with a code.",
};

const modeAction: Record<EntryMode, string> = {
  provider: "Continue with Google or Apple",
  link: "Email me a sign-in link",
  password: "Use an email address and password",
  code: "Use a code from your administrator or another device",
};

function isLocalDevelopmentOrigin(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );
}

/**
 * The single sign-in surface for both installed apps.
 *
 * Providers come first: they need no email, so a deployment never depends on a
 * mail quota to admit people. Every other method stays available underneath,
 * each named after the authentication it performs, as Apple's "Managing
 * accounts" guidance requires. Only methods this deployment actually offers
 * are shown.
 */
export function AuthScreen({
  configured,
  role = "contributor",
  onPreview,
  requirePasswordSetup = false,
  onPasswordSet,
}: AuthScreenProps) {
  const standalone = isStandaloneApp();
  const showInstallHint = isAppleMobileBrowser() && !standalone;
  const showLocalRedirectHint = configured && isLocalDevelopmentOrigin();
  const [providers, setProviders] = useState<AuthProvider[]>(() =>
    configured ? knownAuthProviders() : [],
  );
  const [providersChecked, setProvidersChecked] = useState(false);
  const [mode, setMode] = useState<EntryMode | null>(null);
  const [callbackIssue, setCallbackIssue] = useState<string | null>(() =>
    authCallbackError(),
  );

  useEffect(() => {
    if (!configured) {
      setProvidersChecked(true);
      return;
    }
    let active = true;
    void enabledAuthProviders().then((available) => {
      if (!active) return;
      setProviders(available);
      setProvidersChecked(true);
    });
    return () => {
      active = false;
    };
  }, [configured]);

  // Before the deployment answers, keep the screen quiet rather than guessing
  // a method that may not exist here.
  const entryMode: EntryMode =
    mode ??
    (providers.length ? "provider" : role === "admin" ? "link" : "code");
  const alternatives = (
    ["provider", "link", "password", "code"] as const
  ).filter(
    (candidate) =>
      candidate !== entryMode &&
      (candidate !== "provider" || providers.length > 0),
  );

  if (requirePasswordSetup) {
    return (
      <main className={`auth-page auth-page-${role}`}>
        <div className="auth-mark">
          <CollectBrand />
        </div>
        <PasswordSetup onDone={onPasswordSet} />
      </main>
    );
  }

  return (
    <main className={`auth-page auth-page-${role}`}>
      <div className="auth-mark">
        <CollectBrand />
      </div>
      <section className="auth-card" aria-labelledby="auth-title">
        <h1 id="auth-title">
          {role === "admin" && entryMode === "provider"
            ? "Admin sign in."
            : modeTitle[entryMode]}
        </h1>
        <p>
          {!configured
            ? "Authentication is not configured for this deployment."
            : entryMode === "provider"
              ? "Sign in to reach the projects you contribute to. Your email address stays your identifier."
              : entryMode === "code"
                ? "Enter the code your administrator issued, or request a new one below."
                : "Use the email address your invitation was sent to."}
        </p>

        {configured && (
          <>
            {callbackIssue && (
              <p className="auth-error" role="alert">
                {callbackIssue}
              </p>
            )}

            {entryMode === "provider" && (
              <ProviderSignIn
                providers={providers}
                surface={role}
                onFailure={() => setCallbackIssue(null)}
              />
            )}
            {entryMode === "link" && (
              <EmailLinkForm showLocalRedirectHint={showLocalRedirectHint} />
            )}
            {entryMode === "password" && <PasswordForm />}
            {entryMode === "code" && <CodeSignIn autoFocus={mode === "code"} />}

            {entryMode === "provider" && standalone && (
              <p className="auth-config-note">
                <Icon name="info" size={16} />
                <span>
                  The provider opens in the browser. If it does not return to
                  this app, sign in there and use a code from the signed-in
                  browser.
                </span>
              </p>
            )}

            {providersChecked && alternatives.length > 0 && (
              <details className="auth-alternatives">
                <summary>Other ways to sign in</summary>
                {alternatives.map((candidate) => (
                  <button
                    key={candidate}
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setMode(candidate);
                      setCallbackIssue(null);
                    }}
                  >
                    {modeAction[candidate]}{" "}
                    <Icon name="arrow-right" size={15} />
                  </button>
                ))}
              </details>
            )}
          </>
        )}

        {!configured && onPreview && (
          <button className="auth-preview-button" onClick={onPreview}>
            Open interface preview <Icon name="arrow-right" size={15} />
          </button>
        )}

        {showInstallHint && (
          <details className="auth-install-help">
            <summary>
              <Icon name="plus" size={16} /> Add collect to Home Screen
            </summary>
            <div className="auth-install-content">
              <ol>
                <li>
                  Tap <strong>Share</strong>.
                </li>
                <li>
                  Tap <strong>Add to Home Screen</strong>.
                </li>
                <li>
                  Tap <strong>Add</strong>.
                </li>
              </ol>
            </div>
          </details>
        )}
      </section>
    </main>
  );
}
