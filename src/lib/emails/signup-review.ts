import { resend, EMAIL_FROM, APP_URL } from "@/lib/resend";

/**
 * Both functions swallow their own errors (log + return) rather than throw.
 * A failed notification email should never fail the approve/reject action itself —
 * the school record is already created/updated by the time we send this.
 */

export async function sendSchoolApprovedEmail({
  to,
  principalFirstName,
  schoolName,
}: {
  to: string;
  principalFirstName: string;
  schoolName: string;
}) {
  const loginUrl = `${APP_URL}/login`;

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: `${schoolName} has been approved on EduKe`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
          <h2 style="color: #16a34a;">You're approved! 🎉</h2>
          <p>Hi ${principalFirstName},</p>
          <p>
            Good news — <strong>${schoolName}</strong> has been reviewed and approved
            on EduKe. You can now log in with the email and password you created
            during signup.
          </p>
          <p style="margin: 28px 0;">
            <a
              href="${loginUrl}"
              style="background:#16a34a;color:#fff;padding:12px 20px;border-radius:8px;
                     text-decoration:none;font-weight:600;display:inline-block;"
            >
              Log in to your school
            </a>
          </p>
          <p style="font-size:13px;color:#6b7280;">
            Or copy this link into your browser: ${loginUrl}
          </p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send school-approved email:", err);
  }
}

export async function sendSchoolRejectedEmail({
  to,
  principalFirstName,
  schoolName,
  reason,
}: {
  to: string;
  principalFirstName: string;
  schoolName: string;
  reason: string;
}) {
  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: `Update on your EduKe application for ${schoolName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
          <h2 style="color: #dc2626;">Application not approved</h2>
          <p>Hi ${principalFirstName},</p>
          <p>
            Thanks for your interest in EduKe. After review, we weren't able to
            approve the application for <strong>${schoolName}</strong> at this time.
          </p>
          <div style="background:#f9fafb;border-left:3px solid #dc2626;padding:12px 16px;margin:20px 0;">
            <p style="margin:0;font-size:14px;"><strong>Reason:</strong> ${reason}</p>
          </div>
          <p>
            If you believe this was a mistake or would like to reapply with updated
            information, please submit a new signup request.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send school-rejected email:", err);
  }
}