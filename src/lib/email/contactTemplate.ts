export interface ContactEmailData {
  fullName: string;
  company?: string;
  email: string;
  message: string;
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildContactEmail(data: ContactEmailData): string {
  const fullName = esc(data.fullName);
  const company  = data.company ? esc(data.company) : "";
  const email    = esc(data.email);
  const message  = esc(data.message).replace(/\n/g, "<br />");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Contact Message</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">

          <!-- HEADER -->
          <tr>
            <td style="background-color: #1a3a6e; padding: 24px 32px; border-radius: 8px 8px 0 0;">
              <p style="margin: 0; font-size: 12px; font-weight: 600; color: #93c5fd; text-transform: uppercase; letter-spacing: 0.1em;">PDD Stock Inventory</p>
              <h1 style="margin: 6px 0 0 0; font-size: 22px; font-weight: 700; color: #ffffff;">New Contact Message</h1>
            </td>
          </tr>

          <!-- INTRO -->
          <tr>
            <td style="background-color: #ffffff; padding: 24px 32px 16px 32px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 15px; color: #374151; line-height: 1.6;">
                Hi Brady, you have received a new contact message from the PDD Stock website.
              </p>
            </td>
          </tr>

          <!-- SENDER INFORMATION -->
          <tr>
            <td style="background-color: #ffffff; padding: 20px 32px 8px 32px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              <p style="margin: 0 0 16px 0; font-size: 11px; font-weight: 700; color: #1a3a6e; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 2px solid #1a3a6e; padding-bottom: 8px;">
                Sender Information
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 4px 32px; font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; width: 160px; vertical-align: top;">Full Name</td>
                  <td style="padding: 4px 32px; font-size: 15px; color: #111827; font-weight: 600; vertical-align: top;">${fullName}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 32px; font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; vertical-align: top;">Company</td>
                  <td style="padding: 4px 32px; font-size: 14px; color: #374151; vertical-align: top;">${company || "—"}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 32px 16px 32px; font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; vertical-align: top;">Email Address</td>
                  <td style="padding: 4px 32px 16px 32px; font-size: 14px; vertical-align: top;">
                    <a href="mailto:${email}" style="color: #1a3a6e; text-decoration: underline;">${email}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- MESSAGE -->
          <tr>
            <td style="background-color: #ffffff; padding: 20px 32px 8px 32px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              <p style="margin: 0 0 16px 0; font-size: 11px; font-weight: 700; color: #1a3a6e; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 2px solid #1a3a6e; padding-bottom: 8px;">
                Message
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 4px 32px 24px 32px; font-size: 14px; color: #374151; line-height: 1.7;">${message}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center; line-height: 1.6;">
                This email was sent from the PDD Stock Inventory website.<br />
                Submitted on ${new Date().toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}
