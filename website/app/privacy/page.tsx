import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — Lexino AI',
  description: 'Learn how Lexino AI handles account authentication, security streams, data cookies, and chat history retention policies.',
  authors: [{ name: 'Lexino AI' }],
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <section style={{
            background: 'rgba(9, 16, 24, 0.45)',
            border: '1px solid rgba(52, 211, 153, 0.1)',
            borderRadius: '16px',
            padding: '24px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#34d399', margin: '0 0 12px' }}>1. User Data Handling & Clerk Authentication</h2>
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '15px', lineHeight: '1.7' }}>
              Lexino AI values your privacy. We process authentication and user profile data securely via Clerk Authentication. Clerk manages user sessions, registration, emails, and credentials, ensuring startup-grade, secure, and production-ready access. We do not store your passwords on our servers.
            </p>
          </section>

          <section style={{
            background: 'rgba(9, 16, 24, 0.45)',
            border: '1px solid rgba(52, 211, 153, 0.1)',
            borderRadius: '16px',
            padding: '24px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#34d399', margin: '0 0 12px' }}>2. AI Conversation Logs & File Uploads</h2>
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '15px', lineHeight: '1.7' }}>
              To provide chat features and enforce safety systems, we process and temporarily store your text queries, conversation history, and uploaded documents. These files and transcripts are parsed contextually to generate AI responses. AI-generated content is generated on-demand and may not always be 100% accurate; we recommend verifying all critical outputs.
            </p>
          </section>

          <section style={{
            background: 'rgba(9, 16, 24, 0.45)',
            border: '1px solid rgba(52, 211, 153, 0.1)',
            borderRadius: '16px',
            padding: '24px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#34d399', margin: '0 0 12px' }}>3. Cookies, Sessions & Analytics Usage</h2>
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '15px', lineHeight: '1.7' }}>
              We utilize essential session cookies and local storage tokens to preserve your interface settings, active wallpaper themes, and token quotas. Anonymous usage metrics and analytics are processed to monitor stream health, diagnose server lag, and optimize response speeds.
            </p>
          </section>

          <section style={{
            background: 'rgba(9, 16, 24, 0.45)',
            border: '1px solid rgba(52, 211, 153, 0.1)',
            borderRadius: '16px',
            padding: '24px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#34d399', margin: '0 0 12px' }}>4. Abuse Prevention & Safety Systems</h2>
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '15px', lineHeight: '1.7' }}>
              We employ active monitoring tools to screen query patterns for security vulnerabilities, malware requests, and system exploitation. We prohibit illegal usage, service abuse, harmful activities, or exploiting rate limits. Data may be scanned to enforce safety and prevent platform disruption.
            </p>
          </section>

          <section style={{
            background: 'rgba(9, 16, 24, 0.45)',
            border: '1px solid rgba(52, 211, 153, 0.1)',
            borderRadius: '16px',
            padding: '24px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#34d399', margin: '0 0 12px' }}>5. Data Retention & Sharing Policy</h2>
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '15px', lineHeight: '1.7' }}>
              Your chat logs and custom settings are stored safely under your account space. We do not sell, rent, or trade user data to third parties. We share data only with trusted infrastructure providers (such as hosting nodes, Clerk, and LLM APIs) solely to deliver the core service.
            </p>
          </section>

          <section style={{
            background: 'rgba(9, 16, 24, 0.45)',
            border: '1px solid rgba(52, 211, 153, 0.1)',
            borderRadius: '16px',
            padding: '24px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#34d399', margin: '0 0 12px' }}>6. User Privacy Rights</h2>
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '15px', lineHeight: '1.7' }}>
              You maintain rights to inspect, update, or completely delete your account data. Initiating account deletion through profile panels triggers immediate purging of associated chat logs and personal metadata from our active systems.
            </p>
          </section>

          <section style={{
            background: 'rgba(9, 16, 24, 0.45)',
            border: '1px solid rgba(52, 211, 153, 0.1)',
            borderRadius: '16px',
            padding: '24px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#34d399', margin: '0 0 12px' }}>7. Contact Privacy Team</h2>
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '15px', lineHeight: '1.7' }}>
              For inquiries regarding data protection or to request information, contact our privacy officers at:<br />
              <strong>Email:</strong> lexinoofficial@gmail.com
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
