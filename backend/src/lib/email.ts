import { Resend } from 'resend';

type EmailResult =
  | { ok: true; id: string; mode: 'live' }
  | { ok: true; id: string; mode: 'dry-run' }
  | { ok: false; error: string };

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (!resendClient && process.env.RESEND_API_KEY) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

function isDryRunMode(): boolean {
  const dryRunEnv = process.env.EMAIL_DRY_RUN?.toLowerCase();
  if (dryRunEnv === 'true') return true;

  const hasApiKey = !!process.env.RESEND_API_KEY;
  const isProduction = process.env.NODE_ENV === 'production';

  return !hasApiKey && !isProduction;
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}): Promise<EmailResult> {
  const from = process.env.EMAIL_FROM || 'Control & Confidence <noreply@example.com>';
  const replyTo = options.replyTo || process.env.EMAIL_REPLY_TO || 'support@example.com';
  const dryRun = isDryRunMode();

  const emailPayload = {
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    replyTo,
  };

  if (dryRun) {
    console.log('[EMAIL DRY-RUN]', JSON.stringify(emailPayload, null, 2));
    return { ok: true, id: `dry-run-${Date.now()}`, mode: 'dry-run' };
  }

  try {
    const client = getResendClient();
    if (!client) {
      return {
        ok: false,
        error: 'Resend client not configured - no RESEND_API_KEY provided',
      };
    }

    const result = (await client.emails.send(emailPayload)) as any;

    if (result.error) {
      let errMsg = 'Unknown email error';
      if (result.error instanceof Error) {
        errMsg = result.error.message;
      } else if (typeof result.error === 'string') {
        errMsg = result.error;
      } else {
        errMsg = JSON.stringify(result.error);
      }
      console.error('[EMAIL ERROR]', errMsg);
      return { ok: false, error: errMsg };
    }

    if (!result.id) {
      console.error('[EMAIL ERROR] No ID in response');
      return { ok: false, error: 'No email ID in response' };
    }

    console.log('[EMAIL SENT]', {
      to: options.to,
      subject: options.subject,
      id: result.id,
    });

    return { ok: true, id: result.id, mode: 'live' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[EMAIL EXCEPTION]', errorMessage);
    return { ok: false, error: errorMessage };
  }
}
