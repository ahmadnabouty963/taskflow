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

async function sendEmail({ to, subject, html, text, idempotencyKey }) {
  if (process.env.NODE_ENV === "test" && process.env.EMAIL_TEST_MODE !== "delivery") {
    return { id: "test-email" };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");

  const emailResponse = await fetch(RESEND_EMAILS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Ordanly <hello@ordanly.com>",
      to: [to],
      subject: cleanHeaderValue(subject),
      html,
      text,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  const result = await emailResponse.json().catch(() => ({}));
  if (!emailResponse.ok) {
    throw new Error(result.message ?? "Resend could not deliver the email.");
  }
  return result;
}

function emailShell(title, body, actionLabel, actionUrl, note) {
  return `
    <div style="margin:0;background:#f4f2ed;padding:32px 16px;font-family:Arial,sans-serif;color:#17231d">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #dedbd2;border-radius:16px;padding:32px">
        <p style="margin:0 0 24px;font-size:22px;font-weight:700">Ordanly</p>
        <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25">${title}</h1>
        <p style="margin:0 0 24px;line-height:1.65">${body}</p>
        <a href="${actionUrl}" style="display:inline-block;border-radius:10px;background:#234c3c;color:#ffffff;padding:13px 20px;text-decoration:none;font-weight:700">${actionLabel}</a>
        <p style="margin:28px 0 0;color:#65736c;font-size:13px;line-height:1.55">${note}</p>
      </div>
    </div>
  `;
}

export function sendWorkspaceInvitationEmail({
  invitationId,
  token,
  email,
  inviterName,
  workspaceName,
  role,
}) {
  const invitationUrl = `${getClientUrl()}/invite/${encodeURIComponent(token)}`;
  const safeInviter = escapeHtml(inviterName);
  const safeWorkspace = escapeHtml(workspaceName);
  const safeRole = escapeHtml(role.charAt(0) + role.slice(1).toLowerCase());

  return sendEmail({
    to: email,
    subject: `${inviterName} invited you to ${workspaceName}`,
    idempotencyKey: `workspace-invitation/${invitationId}/${token.slice(0, 12)}`,
    html: emailShell(
      `Join ${safeWorkspace}`,
      `${safeInviter} invited you to collaborate in Ordanly as ${safeRole}. This private invitation expires in 7 days.`,
      "View invitation",
      invitationUrl,
      "If you did not expect this invitation, you can ignore this email.",
    ),
    text: `${inviterName} invited you to join ${workspaceName} as ${safeRole}. This invitation expires in 7 days: ${invitationUrl}`,
  });
}

export function sendEmailVerificationEmail({ tokenId, token, email, name }) {
  const verificationUrl = `${getClientUrl()}/verify-email/${encodeURIComponent(token)}`;
  return sendEmail({
    to: email,
    subject: "Verify your Ordanly email address",
    idempotencyKey: `email-verification/${tokenId}`,
    html: emailShell(
      "Confirm your email address",
      `Hello ${escapeHtml(name)}, confirm this address to activate your Ordanly account. The link expires in 24 hours.`,
      "Verify email",
      verificationUrl,
      "If you did not create an Ordanly account, you can ignore this email.",
    ),
    text: `Hello ${name}, verify your Ordanly email address within 24 hours: ${verificationUrl}`,
  });
}

export function sendPasswordResetEmail({ tokenId, token, email, name }) {
  const resetUrl = `${getClientUrl()}/reset-password/${encodeURIComponent(token)}`;
  return sendEmail({
    to: email,
    subject: "Reset your Ordanly password",
    idempotencyKey: `password-reset/${tokenId}`,
    html: emailShell(
      "Reset your password",
      `Hello ${escapeHtml(name)}, use this private link to choose a new password. The link expires in 60 minutes and works only once.`,
      "Choose new password",
      resetUrl,
      "If you did not request a password reset, you can safely ignore this email.",
    ),
    text: `Hello ${name}, reset your Ordanly password within 60 minutes: ${resetUrl}`,
  });
}
