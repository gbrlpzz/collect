/**
 * Provider marks.
 *
 * Google: the official four-colour "G", used unmodified.
 * Apple: the Apple logo, drawn in a single colour that always matches the
 * button title, as required by "Sign in with Apple" (never a custom colour,
 * never cropped, never used alone as the button).
 */
export function GoogleMark({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

export function AppleMark({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M16.365 12.62c-.026-2.71 2.21-4.01 2.31-4.075-1.258-1.84-3.215-2.093-3.91-2.12-1.665-.17-3.25.977-4.094.977-.844 0-2.146-.953-3.53-.927-1.816.027-3.49 1.056-4.424 2.682-1.885 3.27-.482 8.11 1.35 10.766.897 1.3 1.966 2.76 3.37 2.706 1.352-.053 1.864-.874 3.5-.874 1.635 0 2.096.874 3.53.847 1.457-.024 2.38-1.325 3.27-2.63 1.03-1.507 1.454-2.966 1.48-3.04-.033-.014-2.84-1.09-2.87-4.33z" />
      <path d="M13.79 4.63c.745-.903 1.248-2.158 1.11-3.408-1.073.043-2.372.715-3.143 1.616-.69.8-1.294 2.077-1.132 3.302 1.198.093 2.42-.608 3.165-1.51z" />
    </svg>
  );
}
