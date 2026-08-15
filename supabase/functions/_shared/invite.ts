/**
 * Invitation emails.
 *
 * An invitation carries no credential: it names the project and points at the
 * sign-in screen. The person signs in however they prefer — Google, Apple, a
 * link, or a code — and the pending invitation is claimed at first sign-in
 * against their email address. Nothing here uses the authentication
 * provider's mailer, so invitations never compete with its quota.
 */
export function projectInviteEmail(input: {
  email: string;
  appUrl: string;
  projectName: string;
  organizationName?: string | null;
}): { subject: string; text: string } {
  const organization = input.organizationName?.trim();
  return {
    subject: `You are invited to collect: ${input.projectName}`,
    text: [
      organization
        ? `${organization} invites you to contribute to the project "${input.projectName}" on collect.`
        : `You are invited to contribute to the project "${input.projectName}" on collect.`,
      ``,
      `Open collect and sign in with this email address (${input.email}):`,
      input.appUrl,
      ``,
      `Sign in with Google or Apple, or choose another option on the sign-in`,
      `screen. The project appears after you sign in.`,
      ``,
      `collect works offline. Add it to your home screen before fieldwork.`,
    ].join("\n"),
  };
}

export function adminInviteEmail(input: {
  email: string;
  appUrl: string;
  organizationName?: string | null;
}): { subject: string; text: string } {
  const organization = input.organizationName?.trim() || "a collect workspace";
  return {
    subject: "You are invited to administer collect",
    text: [
      `You are invited to administer ${organization} on collect.`,
      ``,
      `Open collect Admin and sign in with this email address (${input.email}):`,
      `${input.appUrl}?role=admin`,
      ``,
      `Sign in with Google or Apple, or choose another option on the sign-in`,
      `screen. Administrator access is granted to this address when you sign`,
      `in.`,
    ].join("\n"),
  };
}
