import { Resend } from "resend";
import { log } from "./index";

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error("X_REPLIT_TOKEN not found for repl/depl");
  }

  connectionSettings = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=resend",
    {
      headers: {
        Accept: "application/json",
        X_REPLIT_TOKEN: xReplitToken,
      },
    }
  )
    .then((res) => res.json())
    .then((data) => data.items?.[0]);

  if (!connectionSettings || !connectionSettings.settings.api_key) {
    throw new Error("Resend not connected");
  }

  return {
    apiKey: connectionSettings.settings.api_key,
    fromEmail: connectionSettings.settings.from_email,
  };
}

async function getResendClient() {
  const { apiKey } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail: connectionSettings.settings.from_email,
  };
}

export async function sendMagicLinkEmail(
  toEmail: string,
  magicLinkUrl: string,
  fullName?: string
) {
  try {
    const { client, fromEmail } = await getResendClient();

    const greeting = fullName ? `Hi ${fullName},` : "Hi,";

    await client.emails.send({
      from: fromEmail,
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

    log(`Magic link email sent to ${toEmail}`);
    return true;
  } catch (err: any) {
    log(`Failed to send magic link email to ${toEmail}: ${err.message}`);
    throw new Error("Failed to send sign-in email. Please try again.");
  }
}
