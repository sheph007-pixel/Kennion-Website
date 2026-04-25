import { Resend } from "resend";
import { log } from "./index";

// Using verified domain site.kennion.com
const FROM_EMAIL = "Kennion Benefit Advisors <noreply@site.kennion.com>";

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

// Proposal-acceptance email sent to Kennion (hunter@kennion.com) when a
// group owner submits the acceptance form. Body mirrors the exact
// template the customer pasted when they specced this feature.
// NOTE: the payload includes ssnLast4 — it's part of the email record
// (legitimate business need for onboarding) but MUST NOT appear in
// server logs. We never log the body.
export type ProposalAcceptancePayload = {
  groupId: string;
  submittedAt: Date;
  plans: {
    health: string[];
    dental: string[];
    vision: string[];
    supplemental: string;
    employerPaidLife: string;
  };
  company: {
    legalName: string;
    taxId: string;
    streetAddress: string;
    cityStateZip: string;
  };
  contact: {
    name: string;
    workEmail: string;
    ssnLast4: string;
    ssnLast4Verify: string;
    title: string;
    phone: string;
    reason: string;
  };
  acceptance: {
    additionalComments: string;
  };
};

export async function sendProposalAcceptanceEmail(
  toEmail: string,
  payload: ProposalAcceptancePayload,
) {
  const p = payload;
  const subject = `New Group Sign Up — ${p.company.legalName || "Unnamed Company"}`;

  // Plain-text body — the template the customer pasted verbatim. Resend
  // accepts `text` alongside `html` and clients will show one or the
  // other depending on preferences.
  const text = [
    "New Group Sign Up:",
    "",
    "STEP 1: SELECT YOUR PLANS",
    "Health Plan(s) - Choose Up To 3",
    joinOrDash(p.plans.health),
    "",
    "Dental Plan(s) - Choose Up To 2",
    joinOrDash(p.plans.dental),
    "",
    "Vision Plan(s) - Choose Up To 2",
    joinOrDash(p.plans.vision),
    "",
    "Supplemental Package - (Guardian)",
    p.plans.supplemental || "—",
    "",
    "100% Employer Paid Life Insurance - Guardian",
    p.plans.employerPaidLife || "—",
    "",
    "STEP 2: COMPANY INFO",
    "Company Legal Name",
    p.company.legalName,
    "",
    "Company Tax ID",
    p.company.taxId,
    "",
    "Company Street Address",
    p.company.streetAddress,
    "",
    "City, State & Zip",
    p.company.cityStateZip,
    "",
    "STEP 3: CONTACT DETAILS",
    "Contact Name",
    p.contact.name,
    "",
    "Contact Work Email",
    p.contact.workEmail,
    "",
    "Last 4 Of Social Security Number",
    p.contact.ssnLast4,
    "",
    "Verify Last 4 Of Social Security Number",
    p.contact.ssnLast4Verify,
    "",
    "Title",
    p.contact.title,
    "",
    "Contact Phone Number",
    p.contact.phone,
    "",
    "Why did you decide to move forward with Kennion and our Employee Benefits Program?",
    p.contact.reason,
    "",
    "STEP 4: Acceptance",
    "Do you have any additional comments or feedback for us?",
    p.acceptance.additionalComments,
    "",
    "Acceptance",
    "I ACCEPT",
    "",
    `Submitted: ${p.submittedAt.toISOString()}`,
    `Group ID: ${p.groupId}`,
  ].join("\n");

  // Minimal HTML version preserves line breaks + section headings.
  const html = `<pre style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.5; color: #1b1b1b; white-space: pre-wrap;">${escapeHtml(text)}</pre>`;

  try {
    const client = getResendClient();
    const result = await client.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject,
      text,
      html,
    });
    if (result.error) {
      log(`[EMAIL ERROR] Acceptance email Resend error: ${JSON.stringify(result.error)}`);
      throw new Error(`Email delivery failed: ${result.error.message}`);
    }
    // Deliberately don't log the body — it contains SSN last-4.
    log(`[EMAIL SUCCESS] Acceptance email sent for group ${p.groupId} (id: ${result.data?.id})`);
    return true;
  } catch (err: any) {
    log(`[EMAIL ERROR] Failed to send acceptance email for group ${p.groupId}: ${err.message}`);
    throw new Error("Failed to send acceptance email. Please try again.");
  }
}

function joinOrDash(items: string[]): string {
  return items.length > 0 ? items.join(", ") : "—";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Heads-up to Hunter when a group user starts a new dashboard chat
// session. Sent at most once per conversationId (the caller decides).
// Failure is non-fatal — the assistant should keep working even if
// Resend is down.
export type ChatStartedPayload = {
  userName: string | null;
  userEmail: string;
  companyName: string | null;
  groupId: string | null;
  conversationId: string;
  firstMessage: string;
};

export async function sendChatStartedEmail(
  toEmail: string,
  payload: ChatStartedPayload,
): Promise<boolean> {
  const company = payload.companyName ? ` (${payload.companyName})` : "";
  const subject = `Dashboard chat — ${payload.userName || payload.userEmail}${company}`;
  const text = [
    "A group user just opened a chat with the dashboard assistant.",
    "",
    `User:    ${payload.userName || "—"} <${payload.userEmail}>`,
    `Company: ${payload.companyName || "—"}`,
    `Group:   ${payload.groupId || "—"}`,
    "",
    "First question:",
    payload.firstMessage,
    "",
    `Conversation ID: ${payload.conversationId}`,
    "Full transcript: https://www.kennion.com/admin/chat",
  ].join("\n");
  const html = `<pre style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.5; color: #1b1b1b; white-space: pre-wrap;">${escapeHtml(text)}</pre>`;

  try {
    const client = getResendClient();
    const result = await client.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject,
      text,
      html,
    });
    if (result.error) {
      log(`[EMAIL ERROR] Chat-started email Resend error: ${JSON.stringify(result.error)}`);
      return false;
    }
    log(`[EMAIL SUCCESS] Chat-started email sent for ${payload.userEmail} (id: ${result.data?.id})`);
    return true;
  } catch (err: any) {
    log(`[EMAIL ERROR] Failed to send chat-started email: ${err.message}`);
    return false;
  }
}
