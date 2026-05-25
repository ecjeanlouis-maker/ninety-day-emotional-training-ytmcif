const BRAND_COLOR = '#6366f1';
const HEADER_BG = '#1e293b';

interface TemplateOptions {
  userName?: string;
  url: string;
}

function emailLayout(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: #f9fafb;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: ${HEADER_BG};
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 30px 20px;
    }
    .content p {
      margin: 0 0 16px 0;
      font-size: 16px;
    }
    .content p:last-child {
      margin-bottom: 0;
    }
    .cta-button {
      display: inline-block;
      background: ${BRAND_COLOR};
      color: white;
      padding: 12px 32px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      margin: 20px 0;
      font-size: 16px;
    }
    .cta-button:hover {
      opacity: 0.9;
    }
    .footer {
      background: #f3f4f6;
      padding: 20px;
      text-align: center;
      font-size: 14px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      margin: 0;
    }
    .note {
      background: #f0f9ff;
      border-left: 4px solid ${BRAND_COLOR};
      padding: 12px 16px;
      margin: 16px 0;
      font-size: 14px;
      color: #0c4a6e;
    }
  </style>
</head>
<body>
  <div class="container">
    ${content}
  </div>
</body>
</html>
  `.trim();
}

export function verificationEmailTemplate(options: TemplateOptions): {
  html: string;
  text: string;
} {
  const greeting = options.userName ? `Hi ${options.userName},` : 'Hello,';

  const html = emailLayout(`
    <div class="header">
      <h1>Verify Your Email</h1>
    </div>
    <div class="content">
      <p>${greeting}</p>
      <p>Thank you for signing up for Control & Confidence! To get started and unlock all the features of our application, please verify your email address.</p>
      <div style="text-align: center;">
        <a href="${options.url}" class="cta-button">Verify Email Address</a>
      </div>
      <p>Or copy and paste this link in your browser:</p>
      <p style="word-break: break-all; font-size: 14px; color: #6b7280;">
        <code>${options.url}</code>
      </p>
      <div class="note">
        <strong>Note:</strong> This link expires in 24 hours. If you didn't create this account, you can safely ignore this email.
      </div>
    </div>
    <div class="footer">
      <p>© 2026 Control & Confidence. All rights reserved.</p>
      <p>You received this email because you signed up for Control & Confidence.</p>
    </div>
  `);

  const text = `
Hi ${options.userName || 'there'},

Thank you for signing up for Control & Confidence! To get started and unlock all the features of our application, please verify your email address.

Click the link below to verify your email:
${options.url}

This link expires in 24 hours. If you didn't create this account, you can safely ignore this email.

---
© 2026 Control & Confidence. All rights reserved.
  `.trim();

  return { html, text };
}

export function resetPasswordEmailTemplate(options: TemplateOptions): {
  html: string;
  text: string;
} {
  const greeting = options.userName ? `Hi ${options.userName},` : 'Hello,';

  const html = emailLayout(`
    <div class="header">
      <h1>Reset Your Password</h1>
    </div>
    <div class="content">
      <p>${greeting}</p>
      <p>We received a request to reset your password for your Control & Confidence account. Click the button below to create a new password.</p>
      <div style="text-align: center;">
        <a href="${options.url}" class="cta-button">Reset Password</a>
      </div>
      <p>Or copy and paste this link in your browser:</p>
      <p style="word-break: break-all; font-size: 14px; color: #6b7280;">
        <code>${options.url}</code>
      </p>
      <div class="note">
        <strong>Note:</strong> This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
      </div>
    </div>
    <div class="footer">
      <p>© 2026 Control & Confidence. All rights reserved.</p>
      <p>You received this email because a password reset was requested for your account.</p>
    </div>
  `);

  const text = `
Hi ${options.userName || 'there'},

We received a request to reset your password for your Control & Confidence account. Click the link below to create a new password.

${options.url}

This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.

---
© 2026 Control & Confidence. All rights reserved.
  `.trim();

  return { html, text };
}

export function welcomeEmailTemplate(options: {
  userName?: string;
}): {
  html: string;
  text: string;
} {
  const greeting = options.userName ? `Hi ${options.userName},` : 'Hello,';

  const html = emailLayout(`
    <div class="header">
      <h1>Welcome to Control & Confidence</h1>
    </div>
    <div class="content">
      <p>${greeting}</p>
      <p>Your account has been created successfully! We're excited to have you join the Control & Confidence community.</p>
      <p>You now have access to our comprehensive wellness programs designed to help you:</p>
      <ul>
        <li>Build emotional resilience</li>
        <li>Develop lasting confidence</li>
        <li>Manage stress effectively</li>
        <li>Improve social anxiety</li>
        <li>Control intrusive thoughts</li>
        <li>And much more...</li>
      </ul>
      <p>Start exploring the app and discover the program that's right for you. Our support team is always here if you need any assistance.</p>
      <div style="text-align: center; margin-top: 30px;">
        <p style="margin-bottom: 10px;">Questions? We're here to help!</p>
        <p style="margin: 0; font-size: 14px; color: #6b7280;">Reply to this email or visit our support center</p>
      </div>
    </div>
    <div class="footer">
      <p>© 2026 Control & Confidence. All rights reserved.</p>
      <p>Welcome aboard!</p>
    </div>
  `);

  const text = `
Hi ${options.userName || 'there'},

Your account has been created successfully! We're excited to have you join the Control & Confidence community.

You now have access to our comprehensive wellness programs designed to help you:
- Build emotional resilience
- Develop lasting confidence
- Manage stress effectively
- Improve social anxiety
- Control intrusive thoughts
- And much more...

Start exploring the app and discover the program that's right for you. Our support team is always here if you need any assistance.

Questions? We're here to help! Reply to this email or visit our support center.

---
© 2026 Control & Confidence. All rights reserved.
  `.trim();

  return { html, text };
}
