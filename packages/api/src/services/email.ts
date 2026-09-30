import { env } from "@my-better-t-app/env/server";

export interface SendEmailPayload {
  to: Array<{ email: string; name?: string }>;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  simulated?: boolean;
  error?: string;
}

/**
 * Sends a transactional email using the Brevo (Sendinblue) REST API.
 * Free tier: 300 emails/day, no credit card required.
 */
export async function sendBrevoEmail(payload: SendEmailPayload): Promise<EmailResult> {
  const apiKey = env.BREVO_API_KEY;
  const senderEmail = env.BREVO_SENDER_EMAIL || "notifications@dmh-hospital.org";
  const senderName = env.BREVO_SENDER_NAME || "Debre Markos Hospital";

  // Development / Test fallback: if API key is not yet configured or pending approval
  if (!apiKey || apiKey.trim() === "" || apiKey === "your_brevo_api_key_here") {
    console.log("-----------------------------------------------------------------");
    console.log("ℹ️ [BREVO EMAIL SIMULATION (API Key not configured)]");
    console.log(`To: ${payload.to.map((t) => `${t.name ?? "Patient"} <${t.email}>`).join(", ")}`);
    console.log(`Subject: ${payload.subject}`);
    console.log("Configure BREVO_API_KEY in apps/server/.env to send real emails via Brevo.");
    console.log("-----------------------------------------------------------------");
    return { success: true, simulated: true };
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: payload.to,
        subject: payload.subject,
        htmlContent: payload.htmlContent,
        ...(payload.textContent ? { textContent: payload.textContent } : {}),
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`❌ [Brevo API Error ${res.status}]:`, errText);
      return { success: false, error: `Brevo API returned status ${res.status}: ${errText}` };
    }

    const data = (await res.json()) as { messageId?: string };
    console.log(`✅ [Brevo Email Sent] MessageId: ${data.messageId} to ${payload.to[0]?.email}`);
    return { success: true, messageId: data.messageId };
  } catch (error: any) {
    console.error("❌ [Brevo Email Send Failure]:", error);
    return { success: false, error: error?.message || "Unknown network error" };
  }
}

/**
 * Generates and sends an appointment booking confirmation email.
 */
export async function sendAppointmentConfirmationEmail(params: {
  patientEmail: string;
  patientName: string;
  healthId: string;
  doctor: string;
  department: string;
  date: string;
  time: string;
  hospitalName?: string;
}): Promise<EmailResult> {
  const hospital = params.hospitalName || env.BREVO_SENDER_NAME || "Debre Markos Comprehensive Specialized Hospital";

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>Appointment Confirmation</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { background: #0d9488; color: #ffffff; padding: 28px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
        .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
        .content { padding: 28px 24px; }
        .card { background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 12px; padding: 18px 20px; margin: 20px 0; }
        .card-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
        .card-row:last-child { margin-bottom: 0; }
        .card-label { color: #64748b; }
        .card-value { font-weight: 600; color: #0f172a; text-align: right; }
        .instructions { font-size: 13px; color: #475569; line-height: 1.6; margin: 20px 0 0 0; }
        .instructions ul { padding-left: 18px; margin: 8px 0; }
        .footer { border-top: 1px solid #f1f5f9; padding: 18px 24px; text-align: center; font-size: 12px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${hospital}</h1>
          <p>Appointment Scheduled / የቀጠሮ ማረጋገጫ</p>
        </div>
        <div class="content">
          <p style="font-size: 15px; margin-top: 0;">Dear <strong>${params.patientName}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.5; color: #334155;">
            Your clinic appointment has been successfully scheduled. Below are the details of your visit:
          </p>

          <div class="card">
            <div class="card-row">
              <span class="card-label">Health ID (የታካሚ መለያ)</span>
              <span class="card-value" style="font-family: monospace;">${params.healthId}</span>
            </div>
            <div class="card-row">
              <span class="card-label">Doctor</span>
              <span class="card-value">${params.doctor}</span>
            </div>
            <div class="card-row">
              <span class="card-label">Department</span>
              <span class="card-value">${params.department}</span>
            </div>
            <div class="card-row">
              <span class="card-label">Appointment Date</span>
              <span class="card-value">${params.date}</span>
            </div>
            <div class="card-row">
              <span class="card-label">Time</span>
              <span class="card-value">${params.time}</span>
            </div>
          </div>

          <div class="instructions">
            <strong>Important Patient Instructions:</strong>
            <ul>
              <li>Please arrive at the clinic <strong>15 minutes</strong> prior to your scheduled time.</li>
              <li>Bring your Health ID card and your CBHI Insurance booklet (if enrolled).</li>
              <li>If you need to reschedule or cancel, please contact reception in advance.</li>
            </ul>
          </div>
        </div>
        <div class="footer">
          <p style="margin: 0;">This is an automated notification from ${hospital} Management System.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendBrevoEmail({
    to: [{ email: params.patientEmail, name: params.patientName }],
    subject: `Appointment Confirmed: ${params.date} at ${params.time} - ${hospital}`,
    htmlContent: html,
    textContent: `Hello ${params.patientName}, your appointment with ${params.doctor} (${params.department}) is scheduled for ${params.date} at ${params.time}. Health ID: ${params.healthId}.`,
  });
}

/**
 * Sends an email notification when an appointment is cancelled or updated.
 */
export async function sendAppointmentStatusEmail(params: {
  patientEmail: string;
  patientName: string;
  doctor: string;
  dept: string;
  date: string;
  time: string;
  status: string;
  hospitalName?: string;
}): Promise<EmailResult> {
  const hospital = params.hospitalName || env.BREVO_SENDER_NAME || "Debre Markos Comprehensive Specialized Hospital";
  const isCancelled = params.status === "cancelled";

  const statusLabel = isCancelled ? "Cancelled" : params.status;
  const statusAm = isCancelled ? "ተሰርዟል" : params.status;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>Appointment Update</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; }
        .header { background: ${isCancelled ? "#e11d48" : "#0d9488"}; color: #ffffff; padding: 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 18px; font-weight: 700; }
        .content { padding: 24px; font-size: 14px; line-height: 1.6; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-weight: 600; font-size: 12px; background: ${isCancelled ? "#ffe4e6" : "#ccfbf1"}; color: ${isCancelled ? "#be123c" : "#0f766e"}; }
        .footer { border-top: 1px solid #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${hospital}</h1>
          <p style="margin: 4px 0 0; font-size: 13px;">Appointment Status Update</p>
        </div>
        <div class="content">
          <p>Dear <strong>${params.patientName}</strong>,</p>
          <p>
            Your appointment scheduled for <strong>${params.date} at ${params.time}</strong> with <strong>${params.doctor}</strong> (${params.dept}) has been updated to:
          </p>
          <p style="text-align: center; margin: 20px 0;">
            <span class="badge">${statusLabel.toUpperCase()} (${statusAm})</span>
          </p>
          ${isCancelled ? "<p>If you did not request this cancellation or would like to re-book, please contact the clinic reception.</p>" : ""}
        </div>
        <div class="footer">
          <p style="margin: 0;">${hospital} Automated System</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendBrevoEmail({
    to: [{ email: params.patientEmail, name: params.patientName }],
    subject: `Appointment ${statusLabel}: ${params.date} - ${hospital}`,
    htmlContent: html,
    textContent: `Dear ${params.patientName}, your appointment for ${params.date} at ${params.time} with ${params.doctor} is now ${statusLabel}.`,
  });
}
