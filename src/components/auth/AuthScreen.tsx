import { useEffect, useState } from "react";
import {
  authCallbackError,
  knownAuthProviders,
  enabledAuthProviders,
  type AuthProvider,
} from "../../lib/supabaseClient";
import { CollectBrand } from "../CollectBrand";
import { Icon, type IconName } from "../Icon";
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

/** The backup methods, in the order the list offers them. */
type BackupMethod = "link" | "password" | "code";

const backupMethods: {
  id: BackupMethod;
  icon: IconName;
  title: string;
  heading: string;
  lede: string;
}[] = [
  {
    id: "link",
    icon: "send",
    title: "Email me a sign-in link",
    heading: "Sign in with a link.",
    lede: "We send a one-time link to the address on your account. Open it on this device.",
  },
  {
    id: "password",
    icon: "key",
    title: "Sign in with a password",
    heading: "Sign in with a password.",
    lede: "Use the email address and password on your account.",
  },
  {
    id: "code",
    icon: "phone",
    title: "Sign in with a code",
    heading: "Sign in with a code.",
    lede: "Eight characters, from your administrator or a signed-in device. Request a fresh one below.",
  },
];

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
 * One decision at a time. Providers come first: they need no email, so a
 * deployment never depends on a mail quota to admit people. Everything else
 * sits in one list of named methods, and choosing one opens that method alone
 * with an explicit way back — no screen ever shows two ways in at once.
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
  const [method, setMethod] = useState<BackupMethod | null>(null);
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

  const chosen = backupMethods.find((candidate) => candidate.id === method);

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
        {chosen && (
          <button
            type="button"
            className="text-button auth-back"
            onClick={() => {
              setMethod(null);
              setCallbackIssue(null);
            }}
          >
            <Icon name="chevron-left" size={16} /> All sign-in options
          </button>
        )}

        <h1 id="auth-title">
          {chosen
            ? chosen.heading
            : role === "admin"
              ? "Admin sign in."
              : "Sign in."}
        </h1>
        <p>
          {!configured
            ? "Authentication is not configured for this deployment."
            : chosen
              ? chosen.lede
              : providers.length
                ? role === "admin"
                  ? "Sign in to run projects, schemas, and contributor access."
                  : "Sign in to reach the projects you contribute to."
                : role === "admin"
                  ? "Choose how to sign in to the administrator workspace."
                  : "Choose how to sign in."}
        </p>

        {configured && (
          <>
            {callbackIssue && (
              <p className="auth-error" role="alert">
                {callbackIssue}
              </p>
            )}

            {chosen ? (
              <>
                {chosen.id === "link" && (
                  <EmailLinkForm
                    showLocalRedirectHint={showLocalRedirectHint}
                  />
                )}
                {chosen.id === "password" && <PasswordForm />}
                {chosen.id === "code" && <CodeSignIn autoFocus />}
              </>
            ) : (
              <>
                <ProviderSignIn
                  providers={providers}
                  surface={role}
                  onFailure={() => setCallbackIssue(null)}
                />

                {providers.length > 0 && standalone && (
                  <aside className="auth-callout" aria-label="Installed app">
                    <p className="auth-callout-title">
                      <Icon name="info" size={17} /> This is the installed app
                    </p>
                    <p>
                      A provider opens in the browser, and iOS keeps the two
                      apart. If sign-in does not come back here, finish it in
                      the browser and bring the session over with a code.
                    </p>
                    <button
                      type="button"
                      className="button button-secondary button-full"
                      onClick={() => {
                        setMethod("code");
                        setCallbackIssue(null);
                      }}
                    >
                      Sign in with a code
                    </button>
                  </aside>
                )}

                {providersChecked && (
                  <>
                    {providers.length > 0 && (
                      <p className="auth-list-heading">Other ways to sign in</p>
                    )}
                    <ul className="auth-method-list">
                      {backupMethods.map((candidate) => (
                        <li key={candidate.id}>
                          <button
                            type="button"
                            className="auth-method"
                            onClick={() => {
                              setMethod(candidate.id);
                              setCallbackIssue(null);
                            }}
                          >
                            <Icon name={candidate.icon} size={19} />
                            <span className="auth-method-copy">
                              {candidate.title}
                            </span>
                            <Icon name="chevron-right" size={17} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </>
        )}

        {!configured && onPreview && (
          <button className="auth-preview-button" onClick={onPreview}>
            Open interface preview <Icon name="arrow-right" size={15} />
          </button>
        )}

        {showInstallHint && !chosen && (
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
