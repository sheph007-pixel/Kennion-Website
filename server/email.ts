import { Resend } from "resend";
import { log } from "./index";

// Using resend.dev for testing - only works with verified recipient emails
// To send to @kennion.com, you need to verify the domain in Resend dashboard
const FROM_EMAIL = "Kennion Benefit Advisors <onboarding@resend.dev>";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    log("ERROR: RESEND_API_KEY environment variable is not set");
    throw new Error("RESEND_API_KEY not configured");
  }
  return new Resend(apiKey);
}

export async function sendMagicLinkEmail(
  toEmail: string,
  magicLinkUrl: string,
  fullName?: string
) {
  try {
    log(`[EMAIL DEBUG] Starting email send to: ${toEmail}`);
    log(`[EMAIL DEBUG] API Key present: ${!!process.env.RESEND_API_KEY}`);

    const client = getResendClient();
    const greeting = fullName ? `Hi ${fullName},` : "Hi,";

    log(`Sending email from: ${FROM_EMAIL} to: ${toEmail}`);

    const result = await client.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject: "Sign in to Kennion Benefit Advisors",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h2 style="color: #1e3a5f; margin: 0; font-size: 20px;">Kennion Benefit Advisors</h2>
          </div>
          <p style="color: #333; font-size: 16px; line-height: 1.5;">${greeting}</p>
          <p style="color: #333; font-size: 16px; line-height: 1.5;">Click the button below to securely sign in to your account:</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${magicLinkUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: 600;">Sign In</a>
          </div>
          <p style="color: #666; font-size: 14px; line-height: 1.5;">This link expires in 15 minutes and can only be used once.</p>
          <p style="color: #666; font-size: 14px; line-height: 1.5;">If you didn't request this, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
          <p style="color: #999; font-size: 12px; text-align: center;">Kennion Benefit Advisors &mdash; Better Benefits, Lower Rates</p>
        </div>
      `,
    });

    if (result.error) {
      log(`[EMAIL ERROR] Resend API error: ${JSON.stringify(result.error)}`);
      throw new Error(`Email delivery failed: ${result.error.message}`);
    }

    log(`[EMAIL SUCCESS] Magic link email sent to ${toEmail} (id: ${result.data?.id})`);
    return true;
  } catch (err: any) {
    log(`[EMAIL ERROR] Failed to send magic link email to ${toEmail}: ${err.message}`);
    log(`[EMAIL ERROR] Full error: ${JSON.stringify(err)}`);
    throw new Error("Failed to send sign-in email. Please try again.");
  }
}
