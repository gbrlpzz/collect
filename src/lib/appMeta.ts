// SAFETY: Vite injects build-time environment variables as strings or undefined.
const rawAppVersion = import.meta.env.VITE_APP_VERSION as string | undefined;
export const APP_VERSION = rawAppVersion ?? "0.1.2";

export const FEEDBACK_URL =
  "https://github.com/gbrlpzz/collect/issues/new?title=Feedback%3A%20";
