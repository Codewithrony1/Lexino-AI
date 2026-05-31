'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function HelpPage() {
  const [activeTab, setActiveTab] = useState<'faq' | 'support'>('faq');
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({});
  
  // Form State
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('general');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Synchronize with URL query parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const section = params.get('section');
      const queryTopic = params.get('topic');
      
      if (section === 'support') {
        setActiveTab('support');
      }
      if (queryTopic === 'bug') {
        setTopic('bug');
      }
    }
  }, []);

  const toggleFaq = (index: number) => {
    setFaqOpen(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !description) return;

    setSubmitting(true);
    
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Support Ticket',
          email,
          rating: 5,
          msg: `[Topic: ${topic.toUpperCase()}] ${description}`
        }),
      });

      if (response.ok) {
        setSubmitted(true);
      } else {
        alert('Something went wrong. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setEmail('');
    setTopic('general');
    setDescription('');
    setSubmitted(false);
  };

  return (
    <main className="help-root-container">
      <title>Help Center & Customer Support — Lexino AI</title>
      
      {/* Dynamic Styling Overrides for Cyberpunk Glass Theme */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

        .help-root-container {
          min-height: 100vh;
          background: #030506;
          background-image: 
            radial-gradient(circle at 10% 20%, rgba(59, 130, 246, 0.045) 0%, transparent 40%),
            radial-gradient(circle at 90% 80%, rgba(52, 211, 153, 0.04) 0%, transparent 40%),
            radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.035) 0%, transparent 50%);
          color: #f8fafc;
          padding: 60px 24px;
          font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif;
          position: relative;
          overflow: hidden;
        }

        .decorative-glow-1 {
          position: absolute;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: rgba(0, 240, 255, 0.03);
          filter: blur(140px);
          top: -100px;
          left: -100px;
          pointer-events: none;
        }

        .decorative-glow-2 {
          position: absolute;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: rgba(168, 85, 247, 0.025);
          filter: blur(160px);
          bottom: -150px;
          right: -100px;
          pointer-events: none;
        }

        .help-wrapper {
          max-width: 960px;
          margin: 0 auto;
          position: relative;
          z-index: 5;
        }

        .help-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          padding-bottom: 24px;
          margin-bottom: 40px;
        }

        .help-title-container h1 {
          font-family: 'Orbitron', sans-serif;
          font-weight: 800;
          font-size: 32px;
          margin: 0;
          letter-spacing: 1px;
          background: linear-gradient(135deg, #00f0ff 0%, #a855f7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 2px 10px rgba(0, 240, 255, 0.15));
        }

        .help-subtitle {
          margin: 6px 0 0;
          color: #a6b6c8;
          font-size: 14.5px;
          font-weight: 500;
        }

        .back-home-btn {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #f8fafc;
          padding: 10px 22px;
          border-radius: 100px;
          text-decoration: none;
          font-size: 13.5px;
          font-weight: 700;
          transition: all 0.25s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .back-home-btn:hover {
          background: rgba(0, 240, 255, 0.07);
          border-color: rgba(0, 240, 255, 0.35);
          color: #00f0ff;
          box-shadow: 0 0 20px rgba(0, 240, 255, 0.15);
          transform: translateY(-1px);
        }

        .help-layout {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 32px;
        }

        @media (max-width: 768px) {
          .help-layout {
            grid-template-columns: 1fr;
            gap: 24px;
          }
          .help-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
          .back-home-btn {
            align-self: stretch;
            justify-content: center;
          }
        }

        .help-nav-sidebar {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .help-nav-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 14px;
          color: #a6b6c8;
          font-size: 14.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          text-align: left;
          width: 100%;
        }

        .help-nav-btn:hover {
          background: rgba(255, 255, 255, 0.025);
          color: #f8fafc;
          border-color: rgba(255, 255, 255, 0.06);
          transform: translateX(2px);
        }

        .help-nav-btn.active {
          background: rgba(0, 240, 255, 0.045);
          border-color: rgba(0, 240, 255, 0.18);
          color: #00f0ff;
          text-shadow: 0 0 8px rgba(0, 240, 255, 0.3);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .help-nav-btn.active .nav-icon {
          color: #00f0ff;
          filter: drop-shadow(0 0 6px rgba(0, 240, 255, 0.4));
        }

        .help-nav-btn .nav-icon {
          font-size: 16px;
          color: #a6b6c8;
          transition: color 0.2s ease;
        }

        .help-card-panel {
          background: rgba(9, 16, 24, 0.48);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 20px;
          padding: 32px;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow: 
            0 24px 64px rgba(0, 0, 0, 0.35),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
          min-height: 480px;
          position: relative;
        }

        .panel-heading {
          font-family: 'Orbitron', sans-serif;
          font-weight: 700;
          font-size: 20px;
          color: #00f0ff;
          margin: 0 0 12px;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          gap: 10px;
          text-shadow: 0 0 12px rgba(0, 240, 255, 0.22);
        }

        .panel-desc {
          margin: 0 0 28px;
          color: #a6b6c8;
          font-size: 14.5px;
          line-height: 1.6;
        }

        /* FAQ Accordion Styling */
        .faq-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .faq-accordion-item {
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.015);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.22s ease;
          cursor: pointer;
        }

        .faq-accordion-item:hover {
          border-color: rgba(0, 240, 255, 0.2);
          background: rgba(255, 255, 255, 0.025);
        }

        .faq-accordion-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          font-weight: 600;
          font-size: 15px;
          color: #f8fafc;
          user-select: none;
        }

        .faq-accordion-header.open {
          color: #00f0ff;
        }

        .faq-arrow {
          font-size: 16px;
          color: #a6b6c8;
          transition: transform 0.22s ease;
        }

        .faq-arrow.open {
          transform: rotate(45deg);
          color: #00f0ff;
        }

        .faq-accordion-body {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.25s cubic-bezier(0.16, 1, 0.3, 1), padding 0.25s ease;
          padding: 0 20px;
          color: #a6b6c8;
          font-size: 14.2px;
          line-height: 1.6;
        }

        .faq-accordion-body.open {
          max-height: 200px;
          padding-bottom: 18px;
        }

        /* Support Form Inputs */
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 20px;
        }

        .form-group label {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: #a6b6c8;
        }

        .form-input {
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 8px;
          padding: 11px 14px;
          color: #f8fafc;
          font-size: 14px;
          outline: none;
          transition: all 0.2s ease;
          width: 100%;
        }

        .form-input:focus {
          border-color: rgba(0, 240, 255, 0.42);
          background: rgba(255, 255, 255, 0.06);
          box-shadow: 0 0 14px rgba(0, 240, 255, 0.12);
        }

        .form-select {
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 8px;
          padding: 11px 14px;
          color: #f8fafc;
          font-size: 14px;
          outline: none;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 100%;
        }

        .form-select option {
          background: #0f172a;
          color: white;
        }

        .form-select:focus {
          border-color: rgba(0, 240, 255, 0.42);
        }

        .form-textarea {
          resize: vertical;
          min-height: 110px;
        }

        .submit-btn {
          background: linear-gradient(135deg, #00f0ff 0%, #a855f7 100%);
          border: none;
          color: #030506;
          font-weight: 800;
          font-size: 14px;
          padding: 13px;
          border-radius: 8px;
          cursor: pointer;
          width: 100%;
          transition: all 0.25s ease;
          margin-top: 8px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }

        .submit-btn:hover {
          filter: brightness(1.15);
          box-shadow: 0 0 24px rgba(0, 240, 255, 0.35);
          transform: translateY(-1px);
        }

        .submit-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          filter: none;
          box-shadow: none;
        }

        .support-info-panel {
          margin-top: 32px;
          background: rgba(255, 255, 255, 0.01);
          border: 1px dashed rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 18px 22px;
        }

        .support-info-title {
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          color: #00f0ff;
          margin-bottom: 8px;
          letter-spacing: 0.8px;
        }

        .support-info-links {
          font-size: 13.5px;
          color: #a6b6c8;
          line-height: 1.8;
        }

        .support-info-links strong {
          color: #f8fafc;
        }

        /* Success screen animations */
        .success-checkmark {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: rgba(0, 240, 255, 0.08);
          border: 2px solid #00f0ff;
          font-size: 32px;
          color: #00f0ff;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          text-shadow: 0 0 10px rgba(0, 240, 255, 0.4);
          animation: pulseCheckmark 1.6s infinite alternate;
        }

        @keyframes pulseCheckmark {
          0% { transform: scale(1); box-shadow: 0 0 8px rgba(0, 240, 255, 0.2); }
          100% { transform: scale(1.08); box-shadow: 0 0 20px rgba(0, 240, 255, 0.4); }
        }

        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(0, 0, 0, 0.1);
          border-left-color: #030506;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          vertical-align: middle;
          margin-right: 8px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}} />

      <div className="decorative-glow-1" />
      <div className="decorative-glow-2" />

      <div className="help-wrapper">
        {/* Header */}
        <header className="help-header">
          <div className="help-title-container">
            <h1>Help & Support</h1>
            <p className="help-subtitle">Answers, documentation, and customer support pathways</p>
          </div>
          <Link href="/chat" className="back-home-btn">
            ← Back to Dashboard
          </Link>
        </header>

        {/* Layout */}
        <div className="help-layout">
          {/* Navigation Sidebar */}
          <nav className="help-nav-sidebar">
            <button 
              className={`help-nav-btn ${activeTab === 'faq' ? 'active' : ''}`}
              onClick={() => setActiveTab('faq')}
            >
              <span className="nav-icon">💡</span> FAQ & Guides
            </button>
            <button 
              className={`help-nav-btn ${activeTab === 'support' ? 'active' : ''}`}
              onClick={() => setActiveTab('support')}
            >
              <span className="nav-icon">🛠️</span> Customer Support
            </button>
          </nav>

          {/* Main Card Panel */}
          <div className="help-card-panel">
            {activeTab === 'faq' ? (
              <div>
                <h2 className="panel-heading">💡 Frequently Asked Questions</h2>
                <p className="panel-desc">Quickly find solutions to common questions regarding Lexino systems.</p>
                
                <div className="faq-list">
                  {[
                    {
                      q: 'What is Lexino AI?',
                      a: 'Lexino AI is a premium conversational AI partner. It acts as an intelligent student mentor, structures schedules dynamically, supports complex programming tasks, and features custom reactive wallpapers.'
                    },
                    {
                      q: 'How does daily quota rate-limiting work?',
                      a: 'To ensure fast inference streams, daily limits are structured by account tier: Free plans get 50 queries/day, Student plans get 300 queries/day, and Pro plans get 1500 queries/day. Exceeding this triggers a temporary cool down.'
                    },
                    {
                      q: 'Are ChatGPT and Claude Sonnet access included?',
                      a: 'Yes! Student plans include ChatGPT (GPT-4o) access, while Pro plans grant access to both ChatGPT and Claude 3.5 Sonnet. You can toggle models from the composer selector.'
                    },
                    {
                      q: 'How do I unlock custom space wallpapers?',
                      a: 'Free plans get 4 celestial backgrounds. Upgrading to Student unlocks 10+ premium space wallpapers, and Pro unlocks all 3D premium backgrounds and custom settings.'
                    }
                  ].map((item, idx) => (
                    <div 
                      key={idx} 
                      className="faq-accordion-item"
                      onClick={() => toggleFaq(idx)}
                    >
                      <div className={`faq-accordion-header ${faqOpen[idx] ? 'open' : ''}`}>
                        {item.q}
                        <span className={`faq-arrow ${faqOpen[idx] ? 'open' : ''}`}>+</span>
                      </div>
                      <div className={`faq-accordion-body ${faqOpen[idx] ? 'open' : ''}`}>
                        {item.a}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <h2 className="panel-heading">✉️ Create a Support Ticket</h2>
                <p className="panel-desc">Need help with billing, credentials, or accounts? Submit a ticket to our developers.</p>
                
                {submitted ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div className="success-checkmark">✓</div>
                    <h3 style={{ color: '#00f0ff', fontFamily: 'Orbitron, sans-serif', fontSize: '20px', margin: '0 0 10px' }}>Ticket Logged!</h3>
                    <p style={{ color: '#a6b6c8', margin: '0 0 24px', fontSize: '14px' }}>Our support matrix has received your request and will contact you shortly.</p>
                    <button className="submit-btn" style={{ maxWidth: '200px', margin: '0 auto' }} onClick={handleReset}>
                      New Ticket
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <div className="form-group">
                      <label>Email Address</label>
                      <input 
                        type="email" 
                        className="form-input" 
                        placeholder="yourname@domain.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required 
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Category</label>
                      <select 
                        className="form-select"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                      >
                        <option value="general">General Query</option>
                        <option value="bug">Report a Problem / Bug</option>
                        <option value="billing">Billing & Account Issues</option>
                        <option value="abuse">Report Abuse</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Description</label>
                      <textarea 
                        className="form-input form-textarea" 
                        placeholder="Describe your issue or query..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required 
                      />
                    </div>

                    <button type="submit" className="submit-btn" disabled={submitting}>
                      {submitting ? (
                        <>
                          <span className="spinner"></span> Processing
                        </>
                      ) : (
                        'Submit Ticket'
                      )}
                    </button>
                  </form>
                )}

                <div className="support-info-panel">
                  <div className="support-info-title">Direct Escalation Paths</div>
                  <div className="support-info-links">
                    <strong>Support Email:</strong> support@lexinotech.com<br />
                    <strong>Billing Queries:</strong> payments@lexinotech.com<br />
                    <strong>Enterprise:</strong> systems@lexinotech.com
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

