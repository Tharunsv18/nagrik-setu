/**
 * Email delivery service using Nodemailer.
 *
 * ── How it works ─────────────────────────────────────────────────────────────
 *
 * The transport is created once (lazily) and reused for all sends.
 *
 * DEV / TEST (SMTP_HOST not set):
 *   Automatically creates a free Ethereal test account on first use.
 *   Every email is printed to the console with a preview URL —
 *   open it in your browser to see exactly what the user would receive.
 *   No real email is delivered.
 *
 * DEV / STAGING (SMTP_HOST set, e.g. Gmail / Mailtrap):
 *   Uses SMTP_HOST + SMTP_PORT + SMTP_USER + SMTP_PASS from .env.
 *   Real email is delivered.
 *
 * PRODUCTION:
 *   Same as above but validated at startup (env.ts ensures all fields present).
 *   Recommended providers: SendGrid, AWS SES, Postmark, Resend.
 *
 * ── Security notes ───────────────────────────────────────────────────────────
 * - The OTP is passed here as plaintext ONLY so it can be put in the email body.
 * - otp.service.ts hashes it with bcrypt immediately BEFORE calling this function.
 * - The plaintext OTP must NEVER be logged in production (guarded below).
 * - The plaintext OTP must NEVER be returned to any API caller.
 */

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { env } from "../config/env";

// ── Transport singleton ───────────────────────────────────────────────────────

let _transport: Transporter | null = null;

async function getTransport(): Promise<Transporter> {
  if (_transport) return _transport;

  if (env.SMTP_HOST) {
    // Use configured SMTP server (real delivery)
    _transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined,
      // No pool — creates a fresh connection per send.
      // Pooled connections go stale when Gmail closes the idle socket,
      // causing 30-40s reconnect hangs on the next request.
      connectionTimeout: 10000, // 10s connect timeout
      greetingTimeout: 10000,   // 10s EHLO timeout
      socketTimeout: 15000,     // 15s idle socket timeout
    });

    if (env.NODE_ENV !== "test") {
      try {
        await _transport.verify();
        console.info("[email.service] SMTP transport verified ✓");
      } catch (err) {
        console.error("[email.service] SMTP transport verification failed:", err);
        _transport = null; // reset so next call retries
        throw err;
      }
    }
  } else {
    // No SMTP configured — auto-create a free Ethereal test account
    const testAccount = await nodemailer.createTestAccount();
    _transport = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });

    console.info(
      "\n[email.service] No SMTP_HOST set — using Ethereal test account\n" +
        `  User: ${testAccount.user}\n` +
        `  Pass: ${testAccount.pass}\n` +
        "  Preview URL will be printed after each send.\n",
    );
  }

  return _transport;
}

// ── OTP email template ────────────────────────────────────────────────────────

function buildOtpEmail(to: string, otp: string) {
  return {
    from: `"NagrikaSeva" <${env.SMTP_FROM}>`,
    to,
    subject: "Your NagrikaSeva sign-in code",
    text: `Your NagrikaSeva one-time password is: ${otp}\n\nThis code expires in ${env.OTP_EXPIRY_MINUTES} minutes. Do not share it with anyone.\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NagrikaSeva OTP</title>
</head>
<body style="margin:0;padding:0;background:#F5F4F0;font-family:Inter,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F4F0;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(20,41,77,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#14294D;padding:28px 32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#EA7317;border-radius:10px;width:36px;height:36px;text-align:center;vertical-align:middle;">
                    <span style="font-size:18px;color:#fff;">⚑</span>
                  </td>
                  <td style="padding-left:12px;">
                    <div style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">NagrikaSeva</div>
                    <div style="color:rgba(255,255,255,0.5);font-size:10px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;">Government of India</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:800;color:#10203A;">Your sign-in code</p>
              <p style="margin:0 0 28px;font-size:14px;color:#5A6478;line-height:1.6;">
                Use the code below to complete your sign-in to NagrikaSeva.
                It expires in <strong>${env.OTP_EXPIRY_MINUTES} minutes</strong>.
              </p>

              <!-- OTP box -->
              <div style="background:#F5F4F0;border:2px solid #D1CFC8;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
                <div style="font-size:40px;font-weight:900;letter-spacing:0.35em;color:#1B3A63;font-variant-numeric:tabular-nums;">
                  ${otp}
                </div>
              </div>

              <p style="margin:0 0 6px;font-size:13px;color:#5A6478;line-height:1.6;">
                Never share this code with anyone. NagrikaSeva staff will <strong>never</strong> ask for your OTP.
              </p>
              <p style="margin:0;font-size:13px;color:#5A6478;">
                If you didn't request this code, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F5F4F0;padding:20px 32px;border-top:1px solid #D1CFC8;">
              <p style="margin:0;font-size:11px;color:#5A6478;text-align:center;">
                NagrikaSeva · Ministry of Electronics &amp; IT · Government of India<br />
                This is an automated message — please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Send a 6-digit OTP to `to`.
 *
 * Security: `otp` is plaintext here ONLY for the purpose of including it in
 * the email. It must NOT be logged in production environments.
 */
export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const transport = await getTransport();
  const message = buildOtpEmail(to, otp);

  let info;
  try {
    info = await transport.sendMail(message);
  } catch (err) {
    // Reset the transport singleton so the next call creates a fresh connection.
    // This prevents a dead/timed-out pooled connection from causing permanent failures.
    console.error("[email.service] sendMail failed — resetting transport:", err);
    _transport = null;
    throw err;
  }

  if (env.NODE_ENV !== "production") {
    // In dev: print the Ethereal preview URL (or confirm SMTP delivery)
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.info(
        `\n[email.service] OTP email sent (Ethereal preview)\n` +
          `  To: ${to}\n` +
          // ⚠️  Only log OTP in non-production — it is plaintext here
          `  Code: ${otp}\n` +
          `  Preview: ${previewUrl}\n`,
      );
    } else {
      console.info(
        `[email.service] OTP email delivered via SMTP to ${to} (messageId: ${info.messageId})\n` +
        `  [DEV] Code: ${otp}`,
      );
    }
  }
  // Transport is intentionally reused across sends.
  // It is only reset on send failure (see catch block above).
}
