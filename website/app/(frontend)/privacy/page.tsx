import type { Metadata } from 'next';
import Link from 'next/link';

const siteUrl = 'https://lexinoai.in';

export const metadata: Metadata = {
  title: 'Privacy Policy & Data Security Guarantee — Lexino AI',
  description:
    'Learn how Lexino AI protects your personal data with end-to-end encryption, strict zero unauthorized data retention, and enterprise-grade privacy standards.',
  alternates: {
    canonical: `${siteUrl}/privacy`,
  },
  openGraph: {
    title: 'Privacy Policy — Lexino AI',
    description:
      'Learn how Lexino AI protects your personal information and encrypts your AI chat history.',
    url: `${siteUrl}/privacy`,
  },
};

export default function PrivacyPage() {
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
        background: 'rgba(52, 211, 153, 0.08)',
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
            }}>Privacy Policy</h1>
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
            border: '1px solid rgba(52, 211, 153, 0.15)',
            borderRadius: '16px',
            padding: '28px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#34d399', margin: '0 0 12px' }}>1. Introduction & Overview</h2>
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '15px', lineHeight: '1.75' }}>
              Welcome to <strong>Lexino AI</strong> ("Service", "we", "us", or "our"), operated in India and accessible via <a href="https://lexinoai.in" style={{ color: '#34d399', textDecoration: 'none' }}>lexinoai.in</a>. We provide an intelligent AI mentor and preparation operating system tailored for students (preparing for exams such as UPSC, JEE, NEET, GATE, and university degrees) and software developers.
              <br /><br />
              This Privacy Policy explains how we collect, process, store, protect, and delete your personal information in accordance with the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act, India)</strong> and applicable information technology regulations. By creating an account or using Lexino AI, you acknowledge and consent to the data practices described herein.
            </p>
          </section>

          <section style={{
            background: 'rgba(9, 16, 24, 0.55)',
            border: '1px solid rgba(52, 211, 153, 0.15)',
            borderRadius: '16px',
            padding: '28px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#34d399', margin: '0 0 12px' }}>2. Data We Collect & Specific Purposes</h2>
            <p style={{ margin: '0 0 14px', color: '#e2e8f0', fontSize: '15px', lineHeight: '1.75' }}>
              We collect personal data strictly on a need-to-know basis to operate, personalize, and secure the Service. The categories of data collected include:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#cbd5e1', fontSize: '14.5px', lineHeight: '1.7' }}>
              <div style={{ padding: '14px 18px', background: 'rgba(255, 255, 255, 0.025)', borderRadius: '12px', borderLeft: '3px solid #34d399' }}>
                <strong style={{ color: '#ffffff' }}>a. Account & Identity Information:</strong>
                <br />
                When you register, authentication is securely managed via <em>Clerk</em>. We store your full name, email address, profile avatar URL, and user identifier. We never collect or store your raw account passwords on our servers.
              </div>
              <div style={{ padding: '14px 18px', background: 'rgba(255, 255, 255, 0.025)', borderRadius: '12px', borderLeft: '3px solid #34d399' }}>
                <strong style={{ color: '#ffffff' }}>b. Student Verification Data (Consent-Based):</strong>
                <br />
                To qualify for our subsidized <strong>Student Plan (₹49/month)</strong>, we ask you to provide your college/school/coaching institute name, target exam or degree course, and student roll number / enrollment ID.
                <br />
                <em>Legal Basis & Purpose:</em> Collected strictly with your explicit consent solely to verify discount eligibility. We do not use student verification data for behavioral advertising, profiling, or cross-platform tracking, nor do we sell or disclose it to third parties.
              </div>
              <div style={{ padding: '14px 18px', background: 'rgba(255, 255, 255, 0.025)', borderRadius: '12px', borderLeft: '3px solid #34d399' }}>
                <strong style={{ color: '#ffffff' }}>c. Conversation History & Uploaded Documents:</strong>
                <br />
                We store your chat messages, code snippets, prompt history, session titles, pinned chats, and uploaded study materials (e.g. PDFs, notes) so you can access synchronized conversation threads across your devices.
              </div>
              <div style={{ padding: '14px 18px', background: 'rgba(255, 255, 255, 0.025)', borderRadius: '12px', borderLeft: '3px solid #34d399' }}>
                <strong style={{ color: '#ffffff' }}>d. Payment & Billing Information:</strong>
                <br />
                All payments are processed securely through <strong>Razorpay</strong>, an RBI-authorized, PCI-DSS Level 1 compliant payment gateway. Lexino AI never receives or stores your full credit/debit card numbers, CVVs, net banking credentials, or UPI MPINs. We only receive confirmation metadata (such as Razorpay Order ID, Payment ID, timestamp, currency INR, and subscription tier status).
              </div>
              <div style={{ padding: '14px 18px', background: 'rgba(255, 255, 255, 0.025)', borderRadius: '12px', borderLeft: '3px solid #34d399' }}>
                <strong style={{ color: '#ffffff' }}>e. Technical Usage & Telemetry Data:</strong>
                <br />
                We process automated technical metrics (e.g. token consumption, daily query counters, API latency, IP address, device operating system, and browser headers) via Vercel Analytics and server logs to monitor uptime, prevent bot abuse, and enforce plan quotas.
              </div>
            </div>
          </section>

          <section style={{
            background: 'rgba(9, 16, 24, 0.55)',
            border: '1px solid rgba(52, 211, 153, 0.15)',
            borderRadius: '16px',
            padding: '28px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#34d399', margin: '0 0 12px' }}>3. Third-Party Processors & AI Models</h2>
            <p style={{ margin: '0 0 14px', color: '#e2e8f0', fontSize: '15px', lineHeight: '1.75' }}>
              To generate intelligent responses and provide reliable infrastructure, Lexino AI transmits relevant prompt context to trusted third-party sub-processors:
            </p>
            <ul style={{ margin: 0, paddingLeft: '22px', color: '#cbd5e1', fontSize: '14.5px', lineHeight: '1.8' }}>
              <li><strong>AI Foundation Providers (OpenAI, Anthropic, Groq):</strong> Chat prompts and contextual messages are sent via enterprise/commercial API endpoints to generate answers. Under standard commercial API data policies, these providers do not use prompt data submitted via their APIs to train their public foundation models.</li>
              <li><strong>Authentication (Clerk):</strong> Secure identity verification, multi-factor authentication, and session cookie management.</li>
              <li><strong>Database & Cloud Hosting (Neon / PostgreSQL & Vercel):</strong> Encrypted database storage and serverless edge execution nodes.</li>
              <li><strong>Payment Processing (Razorpay):</strong> Tokenized, encrypted payment transactions in INR.</li>
            </ul>
          </section>

          <section style={{
            background: 'rgba(9, 16, 24, 0.55)',
            border: '1px solid rgba(52, 211, 153, 0.15)',
            borderRadius: '16px',
            padding: '28px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#34d399', margin: '0 0 12px' }}>4. Data Retention & Automatic Purging</h2>
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '15px', lineHeight: '1.75' }}>
              We retain personal data only for as long as necessary to fulfill the purposes outlined in this policy:
              <br /><br />
              • <strong>Active Chat Sessions:</strong> Retained while your account remains active so you can review your study notes and code history. Older inactive threads may be automatically compressed for storage efficiency.
              <br />
              • <strong>Student Verification Metadata:</strong> Maintained during the active term of your Student Plan subscription and purged once verification is concluded or upon subscription cancellation.
              <br />
              • <strong>Account Deletion:</strong> When you delete your account, all associated personal profiles, conversation threads, uploaded files, and preferences are permanently deleted from our active database.
            </p>
          </section>

          <section style={{
            background: 'rgba(9, 16, 24, 0.55)',
            border: '1px solid rgba(52, 211, 153, 0.15)',
            borderRadius: '16px',
            padding: '28px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#34d399', margin: '0 0 12px' }}>5. User Rights Under the DPDP Act 2023 (India)</h2>
            <p style={{ margin: '0 0 14px', color: '#e2e8f0', fontSize: '15px', lineHeight: '1.75' }}>
              As a Data Principal under the Digital Personal Data Protection Act, 2023, you enjoy comprehensive statutory rights:
            </p>
            <ul style={{ margin: '0 0 16px', paddingLeft: '22px', color: '#cbd5e1', fontSize: '14.5px', lineHeight: '1.8' }}>
              <li><strong>Right to Access:</strong> You may request a summary of the personal data processed by Lexino AI.</li>
              <li><strong>Right to Correction & Updating:</strong> You may update inaccurate or incomplete information directly via your account profile or by contacting support.</li>
              <li><strong>Right to Erasure (Right to be Forgotten):</strong> You can delete individual chats at any time or permanently delete your entire account via the <Link href="/account" style={{ color: '#34d399', textDecoration: 'underline' }}>Account Profile Settings</Link> page.</li>
              <li><strong>Right to Withdraw Consent:</strong> You may withdraw your consent for future data processing at any time. Withdrawal does not affect the lawfulness of processing carried out prior to withdrawal.</li>
              <li><strong>Right of Grievance Redressal:</strong> You have the right to register a grievance with our designated Grievance Officer.</li>
            </ul>
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '14.5px', lineHeight: '1.7' }}>
              To exercise any of these rights outside the in-app controls, email us at <a href="mailto:support@lexinoai.in" style={{ color: '#34d399', textDecoration: 'none' }}>support@lexinoai.in</a>.
            </p>
          </section>

          <section style={{
            background: 'rgba(9, 16, 24, 0.55)',
            border: '1px solid rgba(52, 211, 153, 0.15)',
            borderRadius: '16px',
            padding: '28px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#34d399', margin: '0 0 12px' }}>6. Data Security, Storage & Breach Notification</h2>
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '15px', lineHeight: '1.75' }}>
              • <strong>Encryption & Access Controls:</strong> All communications between your browser and Lexino AI are encrypted in transit via Transport Layer Security (TLS 1.3). Database records are encrypted at rest using industry-standard AES-256 protocols.
              <br /><br />
              • <strong>Cross-Border Transfer & Storage:</strong> Data is hosted across enterprise cloud servers and edge networks in India and international cloud regions compliant with DPDP Act cross-border data transfer guidelines.
              <br /><br />
              • <strong>Breach Notification Commitment:</strong> In the unlikely event of a personal data breach impacting your information, Lexino AI will notify affected users and the Data Protection Board of India promptly and without unreasonable delay, detailing the nature of the breach and mitigation steps taken.
            </p>
          </section>

          <section style={{
            background: 'rgba(9, 16, 24, 0.55)',
            border: '1px solid rgba(52, 211, 153, 0.15)',
            borderRadius: '16px',
            padding: '28px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#34d399', margin: '0 0 12px' }}>7. Cookies & Local Browser Storage</h2>
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '15px', lineHeight: '1.75' }}>
              We use essential session cookies and browser <code style={{ color: '#34d399', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>localStorage</code> items strictly to maintain your logged-in state, remember your preferred wallpaper theme, and enforce token quotas. We do not use invasive third-party ad trackers or cross-site tracking cookies.
            </p>
          </section>

          <section style={{
            background: 'rgba(9, 16, 24, 0.55)',
            border: '1px solid rgba(52, 211, 153, 0.15)',
            borderRadius: '16px',
            padding: '28px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#34d399', margin: '0 0 12px' }}>8. Children & Minors (Age Policy)</h2>
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '15px', lineHeight: '1.75' }}>
              Lexino AI is designed for students aged <strong>13 years and older</strong>. Users under the age of 18 must use the Service under parental or legal guardian supervision and consent. We do not knowingly collect personal data from children under 13. If we discover that an account has been created by a child under 13 without verifiable parental authorization, we will immediately delete that account and all associated data.
            </p>
          </section>

          <section style={{
            background: 'rgba(9, 16, 24, 0.55)',
            border: '1px solid rgba(52, 211, 153, 0.15)',
            borderRadius: '16px',
            padding: '28px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#34d399', margin: '0 0 12px' }}>9. Policy Updates & Notice Process</h2>
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '15px', lineHeight: '1.75' }}>
              We may update this Privacy Policy from time to time to reflect technological upgrades, legal requirements, or service enhancements. When material updates are made, we will notify you through a prominent announcement banner on the chat dashboard or via email to your registered account address at least 7 days before the modifications take effect. The "Last Updated" date at the top of this page will always indicate the latest revision.
            </p>
          </section>

          <section style={{
            background: 'rgba(9, 16, 24, 0.55)',
            border: '1px solid rgba(52, 211, 153, 0.15)',
            borderRadius: '16px',
            padding: '28px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#34d399', margin: '0 0 12px' }}>10. Grievance Officer & Contact Details</h2>
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '15px', lineHeight: '1.75' }}>
              In accordance with the Digital Personal Data Protection Act, 2023 and Information Technology rules, our designated Grievance Officer details are:
              <br /><br />
              <strong>Data Protection & Grievance Officer:</strong> Sumit Ravindra Choudhary (Founder & Operator, Lexino AI)
              <br />
              <strong>Official Support Email:</strong> <a href="mailto:support@lexinoai.in" style={{ color: '#34d399', textDecoration: 'none' }}>support@lexinoai.in</a>
              <br />
              <strong>Grievance Escalation:</strong> <a href="mailto:grievance@lexinoai.in" style={{ color: '#34d399', textDecoration: 'none' }}>grievance@lexinoai.in</a>
              <br />
              <strong>Response SLA:</strong> All grievances are acknowledged within 48 hours and resolved within 30 days of receipt.
              <br />
              <strong>Location:</strong> Maharashtra, India
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
