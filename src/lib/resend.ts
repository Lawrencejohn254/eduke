import { Resend } from "resend";

// npm install resend
// Env vars needed:
//   RESEND_API_KEY   - from resend.com dashboard
//   EMAIL_FROM       - e.g. "EduKe <onboarding@resend.dev>" until your domain is verified,
//                       then "EduKe <noreply@yourdomain.com>"
//   NEXT_PUBLIC_APP_URL - e.g. "https://app.eduke.co.ke" (used to build the login link)

export const resend = new Resend(process.env.RESEND_API_KEY);

export const EMAIL_FROM = process.env.EMAIL_FROM ?? "EduKe <noreply@edukeschools.com>";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://edukeschools.com";