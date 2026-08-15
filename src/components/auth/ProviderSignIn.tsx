import { useState } from "react";
import {
  authProviderLabel,
  signInWithProvider,
  type AuthProvider,
} from "../../lib/supabaseClient";
import { AppleMark, GoogleMark } from "./ProviderMark";
import { signInErrorMessage } from "./authMessages";

/**
 * Provider sign-in buttons.
 *
 * Apple’s guidance is followed verbatim: the Sign in with Apple button uses an
 * approved title, is never smaller than the other sign-in buttons, needs no
 * scrolling to reach, and keeps its logo and title in a single colour (black
 * on the light contributor surface, white on the dark administrator surface).
 * The Google button uses the unmodified four-colour mark. Both buttons name
 * their authentication method, as "Managing accounts" requires.
 */
export function ProviderSignIn({
  providers,
  surface,
  onFailure,
}: {
  providers: AuthProvider[];
  surface: "admin" | "contributor";
  onFailure?: (message: string) => void;
}) {
  const [pending, setPending] = useState<AuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = async (provider: AuthProvider) => {
    setPending(provider);
    setError(null);
    try {
      // The browser leaves for the provider; this view unmounts on return.
      await signInWithProvider(provider, surface);
    } catch (caught) {
      const message = signInErrorMessage(caught, "provider");
      setError(message);
      onFailure?.(message);
      setPending(null);
    }
  };

  if (!providers.length) return null;

  // Apple first: on the devices most field contributors carry, it is the
  // fastest and most private option.
  const ordered = [...providers].sort((left, right) =>
    left === "apple" ? -1 : right === "apple" ? 1 : 0,
  );

  return (
    <div className="auth-providers">
      {ordered.map((provider) => (
        <button
          key={provider}
          type="button"
          className={`provider-button provider-button-${provider}`}
          data-surface={surface}
          onClick={() => void start(provider)}
          disabled={pending !== null}
          aria-busy={pending === provider || undefined}
        >
          {pending === provider ? (
            <span className="button-spinner" aria-hidden="true" />
          ) : provider === "apple" ? (
            <AppleMark />
          ) : (
            <GoogleMark />
          )}
          <span>
            {pending === provider
              ? "Opening…"
              : `Continue with ${authProviderLabel[provider]}`}
          </span>
        </button>
      ))}
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
