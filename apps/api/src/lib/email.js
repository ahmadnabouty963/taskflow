const RESEND_EMAILS_URL = "https://api.resend.com/emails";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getClientUrl() {
  return (process.env.CLIENT_APP_URL ?? "http://localhost:5173").replace(/\/$/, "");
}

function cleanHeaderValue(value) {
  return String(value).replace(/[\r\n]+/g, " ").trim();
}

export async function sendWorkspaceInvitationEmail({
  invitationId,
  token,
  email,
  inviterName,
  workspaceName,
  role,
}) {
  if (process.env.NODE_ENV === "test" && !process.env.RESEND_API_KEY) {
    return { id: "test-email" };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const invitationUrl = `${getClientUrl()}/invite/${encodeURIComponent(token)}`;
  const safeInviter = escapeHtml(inviterName);
  const safeWorkspace = escapeHtml(workspaceName);
  const safeRole = escapeHtml(role.charAt(0) + role.slice(1).toLowerCase());

  const emailResponse = await fetch(RESEND_EMAILS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `workspace-invitation/${invitationId}/${token.slice(0, 12)}`,
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Ordanly <hello@ordanly.com>",
      to: [email],
      subject: `${cleanHeaderValue(inviterName)} invited you to ${cleanHeaderValue(workspaceName)}`,
      html: `
        <div style="margin:0;background:#f4f2ed;padding:32px 16px;font-family:Arial,sans-serif;color:#17231d">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #dedbd2;border-radius:16px;padding:32px">
            <p style="margin:0 0 24px;font-size:22px;font-weight:700">Ordanly</p>
            <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25">Join ${safeWorkspace}</h1>
            <p style="margin:0 0 12px;line-height:1.65">${safeInviter} invited you to collaborate in Ordanly as ${safeRole}.</p>
            <p style="margin:0 0 24px;line-height:1.65">This private invitation expires in 7 days.</p>
            <a href="${invitationUrl}" style="display:inline-block;border-radius:10px;background:#234c3c;color:#ffffff;padding:13px 20px;text-decoration:none;font-weight:700">View invitation</a>
            <p style="margin:28px 0 0;color:#65736c;font-size:13px;line-height:1.55">If you did not expect this invitation, you can ignore this email.</p>
          </div>
        </div>
      `,
      text: `${inviterName} invited you to join ${workspaceName} as ${safeRole}. This invitation expires in 7 days: ${invitationUrl}`,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  const result = await emailResponse.json().catch(() => ({}));
  if (!emailResponse.ok) {
    throw new Error(result.message ?? "Resend could not deliver the invitation.");
  }

  return result;
}
