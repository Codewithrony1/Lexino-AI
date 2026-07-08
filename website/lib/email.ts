/**
 * Sends a warning email to the user regarding inactivity-based data deletion.
 */
export async function sendWarningEmail({
  email,
  name,
  daysInactive,
  daysLeft,
  tier,
}: {
  email: string;
  name: string;
  daysInactive: number;
  daysLeft: number;
  tier: string;
}): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;

  const subject = 'Your Lexino AI chats will be deleted soon';
  const body = `Hi ${name || 'there'},

You have been inactive for a while.
Log in once to keep your chat history.
Your conversations will be permanently deleted after your inactivity period ends.

Current Details:
- Subscription Tier: ${tier}
- Inactivity: ${daysInactive} days
- Days remaining before deletion: ${daysLeft} days

Log in to Lexino AI today: https://lexinoai.vercel.app/chat

Best regards,
The Lexino AI Team`;

  if (!resendApiKey) {
    console.log(`[EMAIL SIMULATOR] Warning email would be sent to: ${email}`);
    console.log(`[EMAIL SIMULATOR] Subject: ${subject}`);
    console.log(`[EMAIL SIMULATOR] Body:\n${body}`);
    console.log(`[EMAIL SIMULATOR] Configure RESEND_API_KEY in environment variables to send live emails.`);
    return true;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Lexino AI <noreply@lexino.ai>',
        to: email,
        subject: subject,
        text: body,
      }),
    });

    if (response.ok) {
      console.log(`Warning email successfully sent to ${email} via Resend.`);
      return true;
    } else {
      const errText = await response.text();
      console.error(`Failed to send warning email via Resend API:`, errText);
      return false;
    }
  } catch (error) {
    console.error(`Error sending warning email to ${email}:`, error);
    return false;
  }
}
