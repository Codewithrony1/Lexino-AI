import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service — Lexino AI',
  description: 'Review our acceptable use policies, account terms, disclaimer matrices, and billing agreements.',
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <section style={{
            background: 'rgba(9, 16, 24, 0.45)',
            border: '1px solid rgba(168, 85, 247, 0.1)',
            borderRadius: '16px',
            padding: '24px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#a855f7', margin: '0 0 12px' }}>1. Acceptance of Terms</h2>
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '15px', lineHeight: '1.7' }}>
              By connecting to and using Lexino AI ("Service"), provided by Lexino Technologies, you accept and agree to be bound by these Terms of Service. If you do not agree, you are prohibited from accessing or using the Service.
            </p>
          </section>

          <section style={{
            background: 'rgba(9, 16, 24, 0.45)',
            border: '1px solid rgba(168, 85, 247, 0.1)',
            borderRadius: '16px',
            padding: '24px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#a855f7', margin: '0 0 12px' }}>2. Acceptable Use Policy</h2>
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '15px', lineHeight: '1.7' }}>
              You agree to use Lexino AI solely for lawful, authorized purposes. You are strictly prohibited from utilizing the Service to generate, upload, or transmit any materials that are illegal, harmful, abusive, harassing, threatening, or designed to exploit any digital systems.
              <br /><br />
              <strong>Lexino AI reserves the right to temporarily limit or suspend accounts involved in abuse, illegal activity, or excessive automated usage.</strong>
            </p>
          </section>

          <section style={{
            background: 'rgba(9, 16, 24, 0.45)',
            border: '1px solid rgba(168, 85, 247, 0.1)',
            borderRadius: '16px',
            padding: '24px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#a855f7', margin: '0 0 12px' }}>3. Prohibited Activities & Account Misuse</h2>
            <p style={{ margin: '0 0 10px', color: '#e2e8f0', fontSize: '15px', lineHeight: '1.7' }}>
              Under this use agreement, you may not:
            </p>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#e2e8f0', fontSize: '15px', lineHeight: '1.8' }}>
              <li>Initiate automated scripting, scraping, or bot-driven requests that exceed regular interactive boundaries.</li>
              <li>Attempt to bypass, exploit, or manipulate token allocation systems, daily query limits, or subscription boundaries.</li>
              <li>Use image generation modules to synthesize illegal, copyrighted, explicit NSFW, or harmful media content.</li>
              <li>Impersonate other entities, share credentials, or facilitate account sharing to circumvent security measures.</li>
            </ul>
          </section>

          <section style={{
            background: 'rgba(9, 16, 24, 0.45)',
            border: '1px solid rgba(168, 85, 247, 0.1)',
            borderRadius: '16px',
            padding: '24px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#a855f7', margin: '0 0 12px' }}>4. AI Limitations & Disclaimers</h2>
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '15px', lineHeight: '1.7' }}>
              Lexino AI uses advanced generative language models (including OpenAI ChatGPT, Anthropic Claude, and Groq). You acknowledge that AI-generated content is probabilistic and may not always be accurate, complete, or reliable. You should verify important instructions, code outputs, or financial decisions before relying on them.
            </p>
          </section>

          <section style={{
            background: 'rgba(9, 16, 24, 0.45)',
            border: '1px solid rgba(168, 85, 247, 0.1)',
            borderRadius: '16px',
            padding: '24px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#a855f7', margin: '0 0 12px' }}>5. Subscription, Payments & Refund Policy</h2>
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '15px', lineHeight: '1.7' }}>
              Pricing for Student and Pro tiers is processed securely in Indian Rupees (INR). Subscriptions are billed in advance on a recurring monthly cycle. All payments are non-refundable. Refund exemptions are processed strictly at the discretion of Lexino Technologies for service interruptions or system errors.
            </p>
          </section>

          <section style={{
            background: 'rgba(9, 16, 24, 0.45)',
            border: '1px solid rgba(168, 85, 247, 0.1)',
            borderRadius: '16px',
            padding: '24px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#a855f7', margin: '0 0 12px' }}>6. Service Modifications & Suspension Rights</h2>
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '15px', lineHeight: '1.7' }}>
              We reserve the right to modify, rate-limit, suspend, or discontinue any aspect of the service without notice to prevent system abuse, spam, or security threats. Accounts found violating these terms will face immediate suspension without refund eligibility.
            </p>
          </section>

          <section style={{
            background: 'rgba(9, 16, 24, 0.45)',
            border: '1px solid rgba(168, 85, 247, 0.1)',
            borderRadius: '16px',
            padding: '24px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#a855f7', margin: '0 0 12px' }}>7. Governing Law</h2>
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '15px', lineHeight: '1.7' }}>
              These terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Lexino Technologies operates, without regard to its conflict of law provisions.
            </p>
          </section>

          <section style={{
            background: 'rgba(9, 16, 24, 0.45)',
            border: '1px solid rgba(168, 85, 247, 0.1)',
            borderRadius: '16px',
            padding: '24px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#a855f7', margin: '0 0 12px' }}>8. Contact Legal</h2>
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '15px', lineHeight: '1.7' }}>
              For questions regarding these Terms, please contact us at:<br />
              <strong>Email:</strong> legal@lexinotech.com<br />
              <strong>Address:</strong> Lexino Technologies Legal Department
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
