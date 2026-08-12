// Provider-abstracted email delivery. Email is never part of synchronization
// correctness: every call site treats failures as advisory. A future provider
// plugs in here without touching callers.
export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("MAIL_FROM");
  if (!apiKey || !from) {
    throw new Response("Email delivery is not configured", { status: 503 });
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
    }),
  });
  if (!response.ok) {
    throw new Response("The email could not be sent", { status: 502 });
  }
}
