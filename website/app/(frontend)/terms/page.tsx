import type { Metadata } from 'next';
import Link from 'next/link';

const siteUrl = 'https://lexinoai.in';

export const metadata: Metadata = {
  title: 'Terms of Service & Usage Policy — Lexino AI',
  description:
    'Review the official Terms of Service, student discount eligibility, acceptable use policies, and billing agreements for Lexino AI.',
  alternates: {
    canonical: `${siteUrl}/terms`,
  },
  openGraph: {
    title: 'Terms of Service — Lexino AI',
    description:
      'Review the official Terms of Service and usage policies for Lexino AI.',
    url: `${siteUrl}/terms`,
  },
};

export default function TermsPage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #030506 0%, #071017 44%, #020405 100%)',
      color: '#f8fafc',
      padding: '60px 24px 80px',
      fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      position: 'relative'
    }}>
      {/* Decorative Gradients */}
      <div style={{
        position: 'absolute',
        width: '40vw',
        aspectRatio: '1',
        borderRadius: '50%',
        background: 'rgba(168, 85, 247, 0.08)',
        filter: 'blur(100px)',
        top: '10%',
        left: '-10%',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        width: '30vw',
        aspectRatio: '1',
        borderRadius: '50%',
        background: 'rgba(59, 130, 246, 0.07)',
        filter: 'blur(100px)',
        bottom: '10%',
        right: '-10%',
        pointerEvents: 'none'
      }} />

      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Header */}
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(52, 211, 153, 0.22)',
          paddingBottom: '20px',
          marginBottom: '40px'
        }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '32px',
              fontWeight: 800,
              fontFamily: 'Orbitron, sans-serif',
              background: 'linear-gradient(135deg, #00f0ff 0%, #a855f7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>Terms of Service</h1>
            <p style={{ margin: '6px 0 0', color: '#a6b6c8', fontSize: '14px' }}>Last Updated: May 30, 2026</p>
          </div>
          <Link href="/" style={{
            background: 'rgba(255, 255, 255, 0.045)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#f8fafc',
            padding: '8px 20px',
            borderRadius: '50px',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: 700,
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
          }}>
            ← Back to Home
          </Link>
        </header>

        {/* Content sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <section style={{
            background: 'rgba(9, 16, 24, 0.55)',
            border: '1px solid rgba(168, 85, 247, 0.15)',
            borderRadius: '16px',
            padding: '28px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#c084fc', margin: '0 0 12px' }}>1. Operating Entity & Acceptance of Terms</h2>
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '15px', lineHeight: '1.75' }}>
              These Terms of Service ("Terms") constitute a legally binding agreement between you ("User", "you", or "your") and <strong>Lexino AI</strong> ("Service", "we", "us", or "our"), an Indian digital platform founded and operated by <strong>Sumit Ravindra Choudhary</strong> (Maharashtra, India).
              <br /><br />
              By accessing, browsing, registering for, or using Lexino AI via <a href="https://lexinoai.in" style={{ color: '#c084fc', textDecoration: 'none' }}>lexinoai.in</a> or associated mobile/desktop interfaces, you acknowledge that you have read, understood, and agreed to be bound by these Terms and our <Link href="/privacy" style={{ color: '#c084fc', textDecoration: 'underline' }}>Privacy Policy</Link>. If you do not agree to these Terms, you must discontinue use of the Service immediately.
            </p>
          </section>

          <section style={{
            background: 'rgba(9, 16, 24, 0.55)',
            border: '1px solid rgba(168, 85, 247, 0.15)',
            borderRadius: '16px',
            padding: '28px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#c084fc', margin: '0 0 12px' }}>2. Subscription Tiers, Billing & RBI Recurring Payment Terms</h2>
            <p style={{ margin: '0 0 14px', color: '#e2e8f0', fontSize: '15px', lineHeight: '1.75' }}>
              Lexino AI offers both free and paid subscription tiers billed in Indian Rupees (INR) through <strong>Razorpay</strong>:
            </p>
            <ul style={{ margin: '0 0 14px', paddingLeft: '22px', color: '#cbd5e1', fontSize: '14.5px', lineHeight: '1.8' }}>
              <li><strong>Explorer Tier (Free):</strong> Includes 50 queries per day, standard response speed, basic text generation, and 6 smooth celestial wallpapers.</li>
              <li><strong>Student Plan (₹49 / month):</strong> Subsidized exclusively for students preparing for competitive exams (UPSC, JEE, NEET, GATE) and college curricula. Includes 300 queries per day, ChatGPT (GPT-4o) access, all 13 premium space wallpapers, and priority processing. <em>Requires valid student verification details.</em></li>
              <li><strong>Pro Tier (₹299 / month):</strong> Includes 1,500 queries per day, dual multi-model intelligence (GPT-4o and Claude 3.5 Sonnet), priority speed, deep workspaces, and priority support.</li>
            </ul>
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '14.5px', lineHeight: '1.75' }}>
              • <strong>Billing & Auto-Renewal:</strong> Paid subscriptions are billed in advance on a monthly recurring basis. In accordance with Reserve Bank of India (RBI) directives on recurring e-mandates, subscription charges and pre-debit notifications will be communicated to your registered payment method/email prior to any recurring deduction. You can view current pricing at any time on our <Link href="/pricing" style={{ color: '#c084fc', textDecoration: 'underline' }}>Pricing Page</Link>.
            </p>
          </section>

          <section style={{
            background: 'rgba(9, 16, 24, 0.55)',
            border: '1px solid rgba(168, 85, 247, 0.15)',
            borderRadius: '16px',
            padding: '28px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#c084fc', margin: '0 0 12px' }}>3. Refund & Cancellation Policy</h2>
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '15px', lineHeight: '1.75' }}>
              • <strong>Subscription Cancellation:</strong> You may cancel your subscription at any time through your <Link href="/account" style={{ color: '#c084fc', textDecoration: 'underline' }}>Account Profile</Link> or by contacting support. Cancellation takes effect at the conclusion of your current paid billing cycle. You will retain full access to your paid tier benefits until the current period expires.
              <br /><br />
              • <strong>Refund Eligibility Window:</strong> Because digital AI generation and compute credits are consumed in real-time, payments are generally non-refundable once computational usage has begun. However, if you experience a verified technical billing error (e.g. duplicate charge) or a persistent service outage preventing use within <strong>48 to 72 hours</strong> of payment, you may request a refund by emailing <a href="mailto:support@lexinoai.in" style={{ color: '#c084fc', textDecoration: 'none' }}>support@lexinoai.in</a> with your transaction details.
              <br /><br />
              • <strong>Student Discount Integrity:</strong> The Student Plan discount is conditional upon providing truthful enrollment details (institute name, target exam/degree, and roll number). If student information is determined to be fabricated, forged, or abusive, Lexino AI reserves the right to immediately terminate the discounted tier without refund.
            </p>
          </section>

          <section style={{
            background: 'rgba(9, 16, 24, 0.55)',
            border: '1px solid rgba(168, 85, 247, 0.15)',
            borderRadius: '16px',
            padding: '28px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#c084fc', margin: '0 0 12px' }}>4. Acceptable Use Policy & Enforced Limits</h2>
            <p style={{ margin: '0 0 14px', color: '#e2e8f0', fontSize: '15px', lineHeight: '1.75' }}>
              You agree to use Lexino AI responsibly and solely for lawful educational, development, and research purposes. You agree not to:
            </p>
            <ul style={{ margin: 0, paddingLeft: '22px', color: '#cbd5e1', fontSize: '14.5px', lineHeight: '1.8' }}>
              <li>Scrape, crawl, or extract AI model outputs or responses in bulk via automated bots, scripts, or unofficial API clients.</li>
              <li>Bypass or attempt to circumvent rate limits, daily token quotas, or tier access restrictions.</li>
              <li>Generate, distribute, or request content that is illegal, defamatory, promoting violence, synthesizing malicious code/exploits, or generating non-consensual NSFW material.</li>
              <li>Reverse engineer, decompile, or attempt to derive underlying algorithms, system prompts, or model weights of Lexino AI or our upstream model partners.</li>
              <li>Share login credentials or facilitate multi-user account pooling to circumvent individual subscription quotas.</li>
            </ul>
          </section>

          <section style={{
            background: 'rgba(9, 16, 24, 0.55)',
            border: '1px solid rgba(168, 85, 247, 0.15)',
            borderRadius: '16px',
            padding: '28px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#c084fc', margin: '0 0 12px' }}>5. AI Output & Academic Disclaimer (No Exam Guarantee)</h2>
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '15px', lineHeight: '1.75' }}>
              • <strong>Probabilistic Nature:</strong> Lexino AI utilizes cutting-edge large language models provided by OpenAI, Anthropic, and Groq. AI-generated responses are generated probabilistically and may occasionally contain inaccuracies, hallucinations, or incomplete solutions.
              <br /><br />
              • <strong>No Professional Advice:</strong> AI responses should not be considered professional legal, medical, or financial advice. Critical code, mathematical calculations, and sensitive decisions must be independently reviewed and verified.
              <br /><br />
              • <strong>Academic Outcome Disclaimer:</strong> While Lexino AI is optimized as a powerful study assistant and coaching partner for competitive exams (UPSC CSE, IIT JEE, NEET UG, GATE, etc.), <strong>Lexino AI does not guarantee specific exam scores, percentiles, ranks, selection, or university admissions</strong>. Academic success remains solely dependent on the student's individual preparation and diligence.
            </p>
          </section>

          <section style={{
            background: 'rgba(9, 16, 24, 0.55)',
            border: '1px solid rgba(168, 85, 247, 0.15)',
            borderRadius: '16px',
            padding: '28px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#c084fc', margin: '0 0 12px' }}>6. Intellectual Property & Content Ownership</h2>
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '15px', lineHeight: '1.75' }}>
              • <strong>Your Content:</strong> You retain all ownership rights to the prompts, code, text, and files you upload or submit to Lexino AI.
              <br /><br />
              • <strong>Generated Output:</strong> To the maximum extent permitted by applicable law, you own the AI-generated text and code outputs created during your sessions, and may use them for personal, educational, or commercial projects.
              <br /><br />
              • <strong>Lexino AI License:</strong> You grant Lexino AI a limited, worldwide, non-exclusive license to process, store, and transmit your content solely as necessary to operate the platform, generate answers, and enforce safety filters. We do not use your proprietary prompts to train public AI foundation models.
            </p>
          </section>

          <section style={{
            background: 'rgba(9, 16, 24, 0.55)',
            border: '1px solid rgba(168, 85, 247, 0.15)',
            borderRadius: '16px',
            padding: '28px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#c084fc', margin: '0 0 12px' }}>7. Account Termination & Suspension</h2>
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '15px', lineHeight: '1.75' }}>
              We reserve the right to suspend, rate-limit, or permanently terminate your account without prior notice if you violate these Terms, engage in fraud or abuse, or fail to pay subscription charges. You may terminate your account at any time via the <Link href="/account" style={{ color: '#c084fc', textDecoration: 'underline' }}>Account Settings</Link> page, which triggers permanent deletion of your profile and conversation data in accordance with our Privacy Policy.
            </p>
          </section>

          <section style={{
            background: 'rgba(9, 16, 24, 0.55)',
            border: '1px solid rgba(168, 85, 247, 0.15)',
            borderRadius: '16px',
            padding: '28px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#c084fc', margin: '0 0 12px' }}>8. Limitation of Liability & Indemnification</h2>
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '15px', lineHeight: '1.75' }}>
              To the fullest extent permitted by Indian law, Lexino AI, its founder, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or loss of profits, data, or academic opportunities resulting from your use of or inability to use the Service. In no event shall Lexino AI's total aggregate liability exceed the total subscription fee paid by you in the <strong>one (1) month</strong> immediately preceding the claim.
            </p>
          </section>

          <section style={{
            background: 'rgba(9, 16, 24, 0.55)',
            border: '1px solid rgba(168, 85, 247, 0.15)',
            borderRadius: '16px',
            padding: '28px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#c084fc', margin: '0 0 12px' }}>9. Governing Law & Dispute Resolution</h2>
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '15px', lineHeight: '1.75' }}>
              These Terms shall be governed by, construed, and enforced in accordance with the laws of the <strong>Republic of India</strong>, without giving effect to any conflict of law principles. Any dispute, controversy, or claim arising out of or relating to these Terms or the Service shall be subject to the exclusive jurisdiction of the competent courts situated in <strong>Maharashtra, India</strong>.
            </p>
          </section>

          <section style={{
            background: 'rgba(9, 16, 24, 0.55)',
            border: '1px solid rgba(168, 85, 247, 0.15)',
            borderRadius: '16px',
            padding: '28px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#c084fc', margin: '0 0 12px' }}>10. Legal Notices & Contact Information</h2>
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '15px', lineHeight: '1.75' }}>
              For legal inquiries, formal notices, or service-related questions, please contact:
              <br /><br />
              <strong>Entity:</strong> Lexino AI (Operated by Sumit Ravindra Choudhary)
              <br />
              <strong>General Support Email:</strong> <a href="mailto:support@lexinoai.in" style={{ color: '#c084fc', textDecoration: 'none' }}>support@lexinoai.in</a>
              <br />
              <strong>Legal & Compliance Department:</strong> <a href="mailto:legal@lexinoai.in" style={{ color: '#c084fc', textDecoration: 'none' }}>legal@lexinoai.in</a>
              <br />
              <strong>Jurisdiction:</strong> Maharashtra, India
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
