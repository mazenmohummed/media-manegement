// lib/email.ts
import { Resend } from "resend";

// Initialize Resend with key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

interface SendPasswordResetEmailParams {
  to: string;
  resetUrl: string;
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
}: SendPasswordResetEmailParams): Promise<void> {
  // Use Resend's default testing sender for dev, or your verified domain in production
  const fromEmail = process.env.NODE_ENV === "production"
    ? "Auth <noreply@yourdomain.com>"
    : "Auth <onboarding@resend.dev>";

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: [to],
    subject: "Reset Your Password",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f5; padding: 20px; }
            .card { background: #ffffff; padding: 30px; border-radius: 8px; max-width: 500px; margin: 0 auto; }
            .button { display: inline-block; padding: 12px 24px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Password Reset Request</h2>
            <p>You recently requested to reset your password. Click the button below to proceed. This link will expire in <strong>15 minutes</strong>.</p>
            <a href="${resetUrl}" class="button" style="color: #ffffff;">Reset Password</a>
            <p style="margin-top: 25px; font-size: 12px; color: #71717a;">If you did not request a password reset, please ignore this email.</p>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    console.error("[RESEND_ERROR]: Failed to send email", error);
    throw new Error("Could not dispatch password reset email.");
  }
}