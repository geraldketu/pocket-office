import "server-only";

// Sends email through Resend (https://resend.com). If no API key is set,
// it does nothing and returns false, and the app shows the link to copy instead.
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) console.error("Resend error", res.status, await res.text());
  return res.ok;
}

export function inviteEmailHtml(companyName: string, link: string) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#0f172a">
      <h2 style="color:#1e40af">Welcome to Pocket Office</h2>
      <p>Your account for <strong>${escapeHtml(companyName)}</strong> is ready.</p>
      <p>Tap the button below to choose your password. Then you can see, upload and download all of your DOT paperwork from your phone.</p>
      <p><a href="${link}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Set up my account</a></p>
      <p style="font-size:13px;color:#64748b">This link works once and expires soon. If it stops working, reply to this email and we'll send a new one.</p>
    </div>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
