// api/_email.js — sends the one-time restore code.
// Uses Resend (https://resend.com) if RESEND_API_KEY is set; otherwise logs the
// code to the server console so the flow is fully testable in local dev.
async function sendRestoreCode(email, code) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[restore] code for ${email}: ${code}`);
    return { delivered: false, dev: true };
  }
  const from = process.env.RESTORE_EMAIL_FROM || 'UNVEIL <onboarding@resend.dev>';
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Your UNVEIL restore code',
      html:
        `<div style="font-family:system-ui,sans-serif;font-size:16px;color:#1c1410">` +
        `<p>Use this code to restore your pixels and rewards:</p>` +
        `<p style="font-size:32px;font-weight:800;letter-spacing:6px">${code}</p>` +
        `<p style="color:#777">It expires in 10 minutes. If you didn't ask for this, ignore it.</p>` +
        `</div>`,
    }),
  });
  if (!r.ok) throw new Error(`email ${r.status}`);
  return { delivered: true };
}

module.exports = { sendRestoreCode };
