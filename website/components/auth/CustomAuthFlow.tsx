'use client';

import React, { useState, useEffect } from 'react';
import { useSignIn, useSignUp, useUser } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export type AuthMode = 'signin' | 'signup' | 'forgot-password' | 'reset-verify' | 'verify-email';

interface CustomAuthFlowProps {
  initialMode?: AuthMode;
}

function getSafeRedirectUrl(target: string | null | undefined): string {
  const isProd = typeof window !== 'undefined' && window.location.hostname.endsWith('lexinoai.in');
  const defaultUrl = isProd ? 'https://chat.lexinoai.in' : '/chat';

  if (!target) return defaultUrl;

  // Relative paths
  if (target.startsWith('/')) {
    if (target.startsWith('/login') || target.startsWith('/signup')) {
      return defaultUrl;
    }
    return target;
  }

  // Absolute URLs
  try {
    const parsed = new URL(target);
    const host = parsed.hostname.toLowerCase();
    const isAllowedHost =
      host === 'lexinoai.in' ||
      host.endsWith('.lexinoai.in') ||
      host === 'localhost' ||
      host === '127.0.0.1';

    if (!isAllowedHost) return defaultUrl;

    if (parsed.pathname === '/login' || parsed.pathname === '/signup') {
      return defaultUrl;
    }

    return target;
  } catch {
    return defaultUrl;
  }
}

// Google Multicolor Icon
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.34 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.92 0 12s.45 3.85 1.24 5.42l4.04-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

// Lexino Logo Aperture Glyph
const LexinoGlyph = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10" stroke="url(#lexino-grad)" strokeWidth="1.8" strokeDasharray="3 3" />
    <path
      d="M12 7v10M7 12h10M8.5 8.5l7 7M8.5 15.5l7-7"
      stroke="url(#lexino-grad)"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <circle cx="12" cy="12" r="3" fill="url(#lexino-grad)" />
    <defs>
      <linearGradient id="lexino-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8b5cf6" />
        <stop offset="100%" stopColor="#22d3ee" />
      </linearGradient>
    </defs>
  </svg>
);

export function CustomAuthFlow({ initialMode = 'signin' }: CustomAuthFlowProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const searchParams = useSearchParams();

  // Clerk hooks
  const { isLoaded: isSignInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();
  const { user, isLoaded: isUserLoaded } = useUser();

  // Form states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password states
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Email verification state
  const [verificationCode, setVerificationCode] = useState('');

  // UI status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const rawRedirect = searchParams.get('redirect_url') || searchParams.get('redirectUrl');
  const redirectUrl = getSafeRedirectUrl(rawRedirect);

  // Synchronize mode with prop if it changes
  useEffect(() => {
    setMode(initialMode);
    setError(null);
    setSuccessMsg(null);
  }, [initialMode]);

  // If already authenticated, forward immediately to destination
  useEffect(() => {
    if (isUserLoaded && user) {
      window.location.href = redirectUrl;
    }
  }, [isUserLoaded, user, redirectUrl]);

  // Google OAuth handler
  const handleGoogleAuth = async (targetMode: 'signin' | 'signup') => {
    setError(null);
    setLoading(true);
    try {
      if (targetMode === 'signup' && signUp) {
        await signUp.authenticateWithRedirect({
          strategy: 'oauth_google',
          redirectUrl: '/sso-callback',
          redirectUrlComplete: redirectUrl,
        });
      } else if (signIn) {
        await signIn.authenticateWithRedirect({
          strategy: 'oauth_google',
          redirectUrl: '/sso-callback',
          redirectUrlComplete: redirectUrl,
        });
      }
    } catch (err: any) {
      setLoading(false);
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        'Google authentication could not be initiated. Please try again.';
      setError(msg);
    }
  };

  // Sign In submit
  const handleSignInSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isSignInLoaded || !signIn) return;
    setError(null);
    setSuccessMsg(null);

    if (!identifier.trim() || !password) {
      setError('Please fill in both fields to continue.');
      return;
    }

    setLoading(true);
    try {
      const res = await signIn.create({
        identifier: identifier.trim(),
        password,
      });

      if (res.status === 'complete') {
        setSuccessMsg('Signed in successfully. Redirecting...');
        await setSignInActive({ session: res.createdSessionId });
        window.location.href = redirectUrl;
      } else if (res.status === 'needs_first_factor') {
        setMode('verify-email');
        setError('Verification required. Check your email for a verification code.');
        setLoading(false);
      } else {
        setError(`Additional authentication step required (${res.status}).`);
        setLoading(false);
      }
    } catch (err: any) {
      setLoading(false);
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        'Invalid email or password. Please try again.';
      setError(msg);
    }
  };

  // Sign Up submit
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignUpLoaded || !signUp) return;
    setError(null);
    setSuccessMsg(null);

    if (!email.trim() || !password) {
      setError('Please provide an email address and password.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      const res = await signUp.create({
        emailAddress: email.trim(),
        password,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      });

      if (res.status === 'complete') {
        setSuccessMsg('Account created successfully! Redirecting...');
        await setSignUpActive({ session: res.createdSessionId });
        window.location.href = redirectUrl;
      } else {
        // Verification email needed
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        setMode('verify-email');
        setSuccessMsg('Verification code sent to ' + email.trim());
        setLoading(false);
      }
    } catch (err: any) {
      setLoading(false);
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        'Could not create account. Please ensure your email is valid and not already registered.';
      setError(msg);
    }
  };

  // Verify Email code submit (for Sign Up)
  const handleVerifyEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignUpLoaded || !signUp) return;
    setError(null);
    setSuccessMsg(null);

    if (!verificationCode.trim()) {
      setError('Please enter the verification code.');
      return;
    }

    setLoading(true);
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });

      if (completeSignUp.status === 'complete') {
        setSuccessMsg('Verification complete! Redirecting to workspace...');
        await setSignUpActive({ session: completeSignUp.createdSessionId });
        window.location.href = redirectUrl;
      } else {
        setError(`Verification status: ${completeSignUp.status}. Please try again.`);
        setLoading(false);
      }
    } catch (err: any) {
      setLoading(false);
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        'Invalid or expired verification code. Please check your email.';
      setError(msg);
    }
  };

  // Forgot Password: Step 1 - request reset code
  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignInLoaded || !signIn) return;
    setError(null);
    setSuccessMsg(null);

    if (!forgotEmail.trim()) {
      setError('Please enter your account email.');
      return;
    }

    setLoading(true);
    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: forgotEmail.trim(),
      });
      setMode('reset-verify');
      setSuccessMsg(`Reset code sent to ${forgotEmail.trim()}`);
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        'Unable to send reset code. Please ensure this email belongs to an existing account.';
      setError(msg);
    }
  };

  // Forgot Password: Step 2 - submit code & new password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignInLoaded || !signIn) return;
    setError(null);
    setSuccessMsg(null);

    if (!resetCode.trim() || !newPassword) {
      setError('Please provide both the reset code and a new password.');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      const res = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: resetCode.trim(),
        password: newPassword,
      });

      if (res.status === 'complete') {
        setSuccessMsg('Password updated! Redirecting...');
        await setSignInActive({ session: res.createdSessionId });
        window.location.href = redirectUrl;
      } else {
        setSuccessMsg('Password updated successfully! Please sign in with your new password.');
        setMode('signin');
        setPassword('');
        setLoading(false);
      }
    } catch (err: any) {
      setLoading(false);
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        'Failed to reset password. Please verify the code and try again.';
      setError(msg);
    }
  };

  // Resend code helper
  const handleResendCode = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      if (mode === 'verify-email' && signUp) {
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        setSuccessMsg('A new verification code has been dispatched.');
      } else if (mode === 'reset-verify' && signIn && forgotEmail) {
        await signIn.create({
          strategy: 'reset_password_email_code',
          identifier: forgotEmail.trim(),
        });
        setSuccessMsg('A new reset code has been dispatched.');
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || 'Could not resend code. Please try again shortly.');
    } finally {
      setLoading(false);
    }
  };

  // Smooth mode switch that also updates browser history URL
  const switchMode = (newMode: AuthMode) => {
    setError(null);
    setSuccessMsg(null);
    setMode(newMode);
    const path = newMode === 'signup' ? '/signup' : '/login';
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    window.history.replaceState(null, '', `${path}${query}`);
  };

  return (
    <main className="lx-web-auth-page">
      {/* Background ambient lighting */}
      <div className="lx-bg-ambient lx-ambient-top" />
      <div className="lx-bg-ambient lx-ambient-bottom" />
      <div className="lx-bg-grid" />

      {/* Main split container */}
      <div className="lx-web-container">
        {/* ============================================================
            LEFT COLUMN: BRAND SHOWCASE (Desktop only)
            ============================================================ */}
        <aside className="lx-left-showcase" aria-label="Lexino AI Features">
          {/* Subtle cosmic border glow */}
          <div className="lx-showcase-art-wrap">
            <img
              src="/auth-artwork-left.webp"
              alt="Lexino AI — Your Smartest Digital Partner"
              className="lx-showcase-img"
              loading="eager"
            />
            <div className="lx-showcase-overlay-vignette" />
          </div>
        </aside>

        {/* ============================================================
            RIGHT COLUMN: INTERACTIVE AUTH CARD (Real web component)
            ============================================================ */}
        <section className="lx-right-auth-section" aria-label="Lexino AI Account Access">
          <div className="lx-card-glow-shell">
            <div className="lx-auth-card">
              {/* Card Top: Small Tagline */}
              <div className="lx-card-top-tagline">
                <span className="lx-tagline-accent" />
                <span className="lx-tagline-text">Think · Create · Grow</span>
              </div>

              {/* Card Header: Brand Icon & Title */}
              <div className="lx-card-header">
                <div className="lx-brand-icon-wrap">
                  <LexinoGlyph />
                </div>
                <h1 className="lx-brand-title">Lexino AI</h1>
                <p className="lx-brand-subtitle">
                  {mode === 'signin' && 'Welcome back! Sign in to continue to your AI workspace.'}
                  {mode === 'signup' && 'Create your account to unlock your private AI workspace.'}
                  {mode === 'forgot-password' && 'Enter your email to receive a secure recovery code.'}
                  {mode === 'reset-verify' && 'Enter the reset code sent to your email and set your new password.'}
                  {mode === 'verify-email' && 'Enter the 6-digit verification code sent to your inbox.'}
                </p>
              </div>

              {/* Status / Alert Messages */}
              {error && (
                <div className="lx-alert lx-alert-error" role="alert">
                  <span className="lx-alert-icon">⚠️</span>
                  <p>{error}</p>
                </div>
              )}
              {successMsg && (
                <div className="lx-alert lx-alert-success" role="status">
                  <span className="lx-alert-icon">✓</span>
                  <p>{successMsg}</p>
                </div>
              )}

              {/* ========================================================
                  MODE 1: SIGN IN (Real Web Form)
                  ======================================================== */}
              {mode === 'signin' && (
                <form onSubmit={handleSignInSubmit} className="lx-form-body">
                  <button
                    type="button"
                    className="lx-google-btn"
                    onClick={() => handleGoogleAuth('signin')}
                    disabled={loading}
                    aria-label="Continue with Google"
                  >
                    <GoogleIcon />
                    <span>Continue with Google</span>
                  </button>

                  <div className="lx-divider">
                    <span className="lx-divider-line" />
                    <span className="lx-divider-text">or</span>
                    <span className="lx-divider-line" />
                  </div>

                  <div className="lx-field-group">
                    <label htmlFor="signin-identifier" className="lx-field-label">
                      Email or username
                    </label>
                    <div className="lx-input-wrap">
                      <span className="lx-input-icon">✉️</span>
                      <input
                        id="signin-identifier"
                        type="text"
                        name="identifier"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="Enter your email or username"
                        autoComplete="username"
                        disabled={loading}
                        required
                        className="lx-input"
                      />
                    </div>
                  </div>

                  <div className="lx-field-group">
                    <label htmlFor="signin-password" className="lx-field-label">
                      Password
                    </label>
                    <div className="lx-input-wrap">
                      <span className="lx-input-icon">🔒</span>
                      <input
                        id="signin-password"
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        disabled={loading}
                        required
                        className="lx-input"
                      />
                      <button
                        type="button"
                        className="lx-toggle-pw"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        tabIndex={-1}
                      >
                        {showPassword ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
                  </div>

                  <div className="lx-forgot-wrap">
                    <button
                      type="button"
                      className="lx-text-link"
                      onClick={() => switchMode('forgot-password')}
                      disabled={loading}
                    >
                      Forgot password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="lx-submit-btn"
                    disabled={loading || !isSignInLoaded}
                  >
                    {loading ? (
                      <span className="lx-spinner-row">
                        <span className="lx-spinner" /> Signing in...
                      </span>
                    ) : (
                      <span>Sign in →</span>
                    )}
                  </button>

                  <div className="lx-toggle-mode-row">
                    <span>Don’t have an account?</span>{' '}
                    <button
                      type="button"
                      className="lx-highlight-link"
                      onClick={() => switchMode('signup')}
                      disabled={loading}
                    >
                      Sign up
                    </button>
                  </div>
                </form>
              )}

              {/* ========================================================
                  MODE 2: SIGN UP / CREATE ACCOUNT (Real Web Form)
                  ======================================================== */}
              {mode === 'signup' && (
                <form onSubmit={handleSignUpSubmit} className="lx-form-body">
                  <button
                    type="button"
                    className="lx-google-btn"
                    onClick={() => handleGoogleAuth('signup')}
                    disabled={loading}
                    aria-label="Continue with Google"
                  >
                    <GoogleIcon />
                    <span>Continue with Google</span>
                  </button>

                  <div className="lx-divider">
                    <span className="lx-divider-line" />
                    <span className="lx-divider-text">or create with email</span>
                    <span className="lx-divider-line" />
                  </div>

                  <div className="lx-field-row-split">
                    <div className="lx-field-group">
                      <label htmlFor="signup-fn" className="lx-field-label">
                        First name
                      </label>
                      <div className="lx-input-wrap">
                        <span className="lx-input-icon">👤</span>
                        <input
                          id="signup-fn"
                          type="text"
                          name="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="First name"
                          autoComplete="given-name"
                          disabled={loading}
                          className="lx-input"
                        />
                      </div>
                    </div>
                    <div className="lx-field-group">
                      <label htmlFor="signup-ln" className="lx-field-label">
                        Last name
                      </label>
                      <div className="lx-input-wrap">
                        <span className="lx-input-icon">👤</span>
                        <input
                          id="signup-ln"
                          type="text"
                          name="lastName"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Last name"
                          autoComplete="family-name"
                          disabled={loading}
                          className="lx-input"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="lx-field-group">
                    <label htmlFor="signup-email" className="lx-field-label">
                      Email address
                    </label>
                    <div className="lx-input-wrap">
                      <span className="lx-input-icon">✉️</span>
                      <input
                        id="signup-email"
                        type="email"
                        name="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email address"
                        autoComplete="email"
                        disabled={loading}
                        required
                        className="lx-input"
                      />
                    </div>
                  </div>

                  <div className="lx-field-group">
                    <label htmlFor="signup-password" className="lx-field-label">
                      Password (min. 8 characters)
                    </label>
                    <div className="lx-input-wrap">
                      <span className="lx-input-icon">🔒</span>
                      <input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a strong password"
                        autoComplete="new-password"
                        disabled={loading}
                        required
                        className="lx-input"
                      />
                      <button
                        type="button"
                        className="lx-toggle-pw"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        tabIndex={-1}
                      >
                        {showPassword ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="lx-submit-btn"
                    disabled={loading || !isSignUpLoaded}
                  >
                    {loading ? (
                      <span className="lx-spinner-row">
                        <span className="lx-spinner" /> Creating account...
                      </span>
                    ) : (
                      <span>Create Account →</span>
                    )}
                  </button>

                  <div className="lx-toggle-mode-row">
                    <span>Already have an account?</span>{' '}
                    <button
                      type="button"
                      className="lx-highlight-link"
                      onClick={() => switchMode('signin')}
                      disabled={loading}
                    >
                      Sign in
                    </button>
                  </div>
                </form>
              )}

              {/* ========================================================
                  MODE 3: FORGOT PASSWORD (STEP 1)
                  ======================================================== */}
              {mode === 'forgot-password' && (
                <form onSubmit={handleForgotPasswordRequest} className="lx-form-body">
                  <div className="lx-field-group">
                    <label htmlFor="forgot-email" className="lx-field-label">
                      Account email
                    </label>
                    <div className="lx-input-wrap">
                      <span className="lx-input-icon">✉️</span>
                      <input
                        id="forgot-email"
                        type="email"
                        name="forgotEmail"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="Enter your account email"
                        autoComplete="email"
                        disabled={loading}
                        required
                        className="lx-input"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="lx-submit-btn"
                    disabled={loading || !isSignInLoaded}
                  >
                    {loading ? (
                      <span className="lx-spinner-row">
                        <span className="lx-spinner" /> Sending code...
                      </span>
                    ) : (
                      <span>Send Recovery Code →</span>
                    )}
                  </button>

                  <div className="lx-toggle-mode-row">
                    <span>Remember your password?</span>{' '}
                    <button
                      type="button"
                      className="lx-highlight-link"
                      onClick={() => switchMode('signin')}
                      disabled={loading}
                    >
                      Sign in
                    </button>
                  </div>
                </form>
              )}

              {/* ========================================================
                  MODE 4: FORGOT PASSWORD (STEP 2: RESET CODE)
                  ======================================================== */}
              {mode === 'reset-verify' && (
                <form onSubmit={handleResetPasswordSubmit} className="lx-form-body">
                  <div className="lx-field-group">
                    <label htmlFor="reset-code" className="lx-field-label">
                      6-digit recovery code
                    </label>
                    <div className="lx-input-wrap">
                      <input
                        id="reset-code"
                        type="text"
                        name="resetCode"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        placeholder="Enter code"
                        disabled={loading}
                        required
                        className="lx-input lx-code-input"
                        maxLength={6}
                      />
                    </div>
                  </div>

                  <div className="lx-field-group">
                    <label htmlFor="new-pw" className="lx-field-label">
                      New password (min. 8 characters)
                    </label>
                    <div className="lx-input-wrap">
                      <span className="lx-input-icon">🔒</span>
                      <input
                        id="new-pw"
                        type={showNewPassword ? 'text' : 'password'}
                        name="newPassword"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter your new password"
                        disabled={loading}
                        required
                        className="lx-input"
                      />
                      <button
                        type="button"
                        className="lx-toggle-pw"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                        tabIndex={-1}
                      >
                        {showNewPassword ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="lx-submit-btn"
                    disabled={loading || !isSignInLoaded}
                  >
                    {loading ? (
                      <span className="lx-spinner-row">
                        <span className="lx-spinner" /> Updating password...
                      </span>
                    ) : (
                      <span>Update Password →</span>
                    )}
                  </button>

                  <div className="lx-code-actions-row">
                    <button
                      type="button"
                      className="lx-text-link"
                      onClick={handleResendCode}
                      disabled={loading}
                    >
                      Resend code
                    </button>
                    <button
                      type="button"
                      className="lx-text-link"
                      onClick={() => switchMode('signin')}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* ========================================================
                  MODE 5: SIGN UP EMAIL VERIFICATION
                  ======================================================== */}
              {mode === 'verify-email' && (
                <form onSubmit={handleVerifyEmailSubmit} className="lx-form-body">
                  <div className="lx-field-group">
                    <label htmlFor="verify-code" className="lx-field-label">
                      Verification code
                    </label>
                    <div className="lx-input-wrap">
                      <input
                        id="verify-code"
                        type="text"
                        name="verificationCode"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder="Enter 6-digit code"
                        disabled={loading}
                        required
                        className="lx-input lx-code-input"
                        maxLength={6}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="lx-submit-btn"
                    disabled={loading || !isSignUpLoaded}
                  >
                    {loading ? (
                      <span className="lx-spinner-row">
                        <span className="lx-spinner" /> Verifying...
                      </span>
                    ) : (
                      <span>Complete Verification →</span>
                    )}
                  </button>

                  <div className="lx-code-actions-row">
                    <button
                      type="button"
                      className="lx-text-link"
                      onClick={handleResendCode}
                      disabled={loading}
                    >
                      Resend code
                    </button>
                    <button
                      type="button"
                      className="lx-text-link"
                      onClick={() => switchMode('signup')}
                      disabled={loading}
                    >
                      Back to sign up
                    </button>
                  </div>
                </form>
              )}

              {/* Trust Indicators */}
              <div className="lx-trust-indicators">
                <div className="lx-trust-item">
                  <span className="lx-trust-icon">⚡</span>
                  <span className="lx-trust-text">Fast</span>
                </div>
                <div className="lx-trust-divider" />
                <div className="lx-trust-item">
                  <span className="lx-trust-icon">🛡️</span>
                  <span className="lx-trust-text">Secure</span>
                </div>
                <div className="lx-trust-divider" />
                <div className="lx-trust-item">
                  <span className="lx-trust-icon">👥</span>
                  <span className="lx-trust-text">Trusted</span>
                </div>
              </div>

              {/* Card Footer: Domain & Homepage Link */}
              <div className="lx-card-footer">
                <span className="lx-footer-domain">LEXINOAI.IN</span>
                <Link href="https://www.lexinoai.in" className="lx-back-link">
                  ← Back to Home
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ================================================================
          NATIVE WEB STYLING (TRUE MODERN SAAS FEEL)
          ================================================================ */}
      <style jsx global>{`
        :root {
          --violet: #8b5cf6;
          --cyan: #22d3ee;
        }

        .lx-web-auth-page {
          min-height: 100vh;
          width: 100%;
          background: #020208;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
          position: relative;
          overflow-x: hidden;
          padding: 24px 16px;
          box-sizing: border-box;
        }

        /* Ambient background glow effects */
        .lx-bg-ambient {
          position: fixed;
          border-radius: 50%;
          filter: blur(140px);
          pointer-events: none;
          z-index: 0;
          opacity: 0.45;
        }

        .lx-ambient-top {
          width: 600px;
          height: 600px;
          top: -150px;
          right: -100px;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.35) 0%, transparent 70%);
        }

        .lx-ambient-bottom {
          width: 650px;
          height: 650px;
          bottom: -150px;
          left: -100px;
          background: radial-gradient(circle, rgba(34, 211, 238, 0.25) 0%, transparent 70%);
        }

        .lx-bg-grid {
          position: fixed;
          inset: 0;
          background-image: linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
          z-index: 0;
        }

        /* Responsive 2-Column Split Container */
        .lx-web-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 1400px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 40px;
          margin: 0 auto;
        }

        /* Left Showcase Column (Desktop Only) */
        .lx-left-showcase {
          display: none;
          flex: 1.15;
          align-items: center;
          justify-content: center;
          max-width: 680px;
        }

        @media (min-width: 1024px) {
          .lx-left-showcase {
            display: flex;
          }
        }

        .lx-showcase-art-wrap {
          position: relative;
          width: 100%;
          border-radius: 28px;
          overflow: hidden;
          border: 1px solid rgba(139, 92, 246, 0.25);
          box-shadow:
            0 25px 60px -15px rgba(0, 0, 0, 0.95),
            0 0 35px rgba(139, 92, 246, 0.15);
          background: #03040b;
        }

        .lx-showcase-img {
          width: 100%;
          height: auto;
          display: block;
          object-fit: cover;
          transform: scale(1.01);
        }

        .lx-showcase-overlay-vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 50%, transparent 60%, rgba(2, 2, 8, 0.4) 100%);
          pointer-events: none;
        }

        /* Right Auth Column */
        .lx-right-auth-section {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          max-width: 480px;
          width: 100%;
        }

        /* Neon gradient glowing shell */
        .lx-card-glow-shell {
          position: relative;
          width: 100%;
          border-radius: 28px;
          padding: 1.5px;
          background: linear-gradient(
            135deg,
            rgba(139, 92, 246, 0.75) 0%,
            rgba(34, 211, 238, 0.5) 50%,
            rgba(139, 92, 246, 0.75) 100%
          );
          box-shadow:
            0 25px 60px -10px rgba(0, 0, 0, 0.95),
            0 0 45px rgba(139, 92, 246, 0.25);
          transition: all 0.3s ease;
        }

        .lx-card-glow-shell:hover {
          box-shadow:
            0 30px 70px -10px rgba(0, 0, 0, 0.95),
            0 0 55px rgba(139, 92, 246, 0.35);
        }

        /* Inner solid glassmorphism card */
        .lx-auth-card {
          width: 100%;
          background: rgba(9, 11, 24, 0.98);
          border-radius: 26.5px;
          padding: 34px 30px 24px;
          box-sizing: border-box;
          backdrop-filter: blur(30px);
          -webkit-backdrop-filter: blur(30px);
          display: flex;
          flex-direction: column;
        }

        /* Tagline at top */
        .lx-card-top-tagline {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 14px;
          gap: 6px;
        }

        .lx-tagline-accent {
          width: 38px;
          height: 2px;
          background: linear-gradient(90deg, #8b5cf6, #22d3ee);
          border-radius: 2px;
        }

        .lx-tagline-text {
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #94a3b8;
          font-weight: 600;
        }

        /* Brand Title & Icon */
        .lx-card-header {
          text-align: center;
          margin-bottom: 20px;
        }

        .lx-brand-icon-wrap {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 6px;
        }

        .lx-brand-title {
          font-family: var(--font-orbitron), 'Orbitron', 'Segoe UI', sans-serif;
          font-size: 24px;
          font-weight: 800;
          letter-spacing: 1px;
          margin: 0 0 6px;
          background: linear-gradient(135deg, #ffffff 20%, #c084fc 70%, #22d3ee 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .lx-brand-subtitle {
          font-size: 13px;
          color: #94a3b8;
          margin: 0;
          line-height: 1.45;
        }

        /* Alert notifications */
        .lx-alert {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 12.5px;
          font-weight: 500;
          margin-bottom: 14px;
          line-height: 1.4;
          box-sizing: border-box;
          animation: lx-fade-in 0.25s ease-out;
        }

        .lx-alert-error {
          background: rgba(239, 68, 68, 0.14);
          border: 1px solid rgba(239, 68, 68, 0.45);
          color: #fca5a5;
        }

        .lx-alert-success {
          background: rgba(34, 211, 238, 0.14);
          border: 1px solid rgba(34, 211, 238, 0.45);
          color: #67e8f9;
        }

        .lx-alert p {
          margin: 0;
          word-break: break-word;
        }

        @keyframes lx-fade-in {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Form elements */
        .lx-form-body {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        /* Continue with Google button */
        .lx-google-btn {
          width: 100%;
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 14px;
          color: #f8fafc;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          padding: 10px 18px;
          box-sizing: border-box;
        }

        .lx-google-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(139, 92, 246, 0.6);
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.25);
          transform: translateY(-1px);
        }

        .lx-google-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Divider */
        .lx-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 2px 0;
        }

        .lx-divider-line {
          flex: 1;
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
        }

        .lx-divider-text {
          font-size: 12px;
          color: #64748b;
          text-transform: lowercase;
        }

        /* Field groups & inputs */
        .lx-field-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
          text-align: left;
        }

        .lx-field-row-split {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .lx-field-label {
          font-size: 12px;
          font-weight: 600;
          color: #cbd5e1;
          letter-spacing: 0.2px;
        }

        .lx-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
          min-height: 44px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .lx-input-wrap:focus-within {
          border-color: #8b5cf6;
          background: rgba(255, 255, 255, 0.07);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.3);
        }

        .lx-input-icon {
          position: absolute;
          left: 14px;
          font-size: 14px;
          pointer-events: none;
          opacity: 0.7;
        }

        .lx-input {
          width: 100%;
          height: 100%;
          background: transparent;
          border: none;
          outline: none;
          padding: 10px 40px 10px 42px;
          color: #f8fafc;
          font-size: 14px;
          font-family: inherit;
          box-sizing: border-box;
        }

        .lx-input::placeholder {
          color: #64748b;
        }

        .lx-code-input {
          letter-spacing: 6px;
          font-weight: 700;
          font-size: 18px;
          text-align: center;
          padding-left: 14px;
          padding-right: 14px;
        }

        .lx-toggle-pw {
          position: absolute;
          right: 12px;
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          font-size: 14px;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.2s;
        }

        .lx-toggle-pw:hover {
          opacity: 1;
        }

        .lx-forgot-wrap {
          display: flex;
          justify-content: flex-end;
          margin-top: -4px;
        }

        .lx-text-link {
          background: transparent;
          border: none;
          color: #c084fc;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          padding: 0;
          transition: color 0.2s;
        }

        .lx-text-link:hover {
          color: #e879f9;
          text-decoration: underline;
        }

        /* Primary Action Button (Gradient) */
        .lx-submit-btn {
          width: 100%;
          min-height: 45px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(90deg, #8b5cf6 0%, #22d3ee 100%);
          border: none;
          border-radius: 12px;
          color: #ffffff;
          font-size: 14.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 0 24px rgba(139, 92, 246, 0.4);
          margin-top: 4px;
          padding: 10px 18px;
          box-sizing: border-box;
        }

        .lx-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 0 34px rgba(139, 92, 246, 0.6);
          filter: brightness(1.08);
        }

        .lx-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .lx-spinner-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .lx-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: lx-spin 0.8s linear infinite;
        }

        @keyframes lx-spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Toggle Mode Row */
        .lx-toggle-mode-row {
          text-align: center;
          font-size: 13px;
          color: #94a3b8;
          margin-top: 4px;
        }

        .lx-highlight-link {
          background: transparent;
          border: none;
          color: #c084fc;
          font-weight: 700;
          cursor: pointer;
          padding: 0;
          margin-left: 4px;
          transition: color 0.2s;
        }

        .lx-highlight-link:hover {
          color: #e879f9;
          text-decoration: underline;
        }

        .lx-code-actions-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 6px;
        }

        /* Trust Badges */
        .lx-trust-indicators {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 18px;
          margin-top: 22px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .lx-trust-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .lx-trust-icon {
          font-size: 13px;
          opacity: 0.85;
        }

        .lx-trust-text {
          font-size: 11.5px;
          color: #94a3b8;
          font-weight: 500;
          letter-spacing: 0.5px;
        }

        .lx-trust-divider {
          width: 1px;
          height: 14px;
          background: rgba(255, 255, 255, 0.12);
        }

        /* Card Footer */
        .lx-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 18px;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.04);
        }

        .lx-footer-domain {
          font-size: 11px;
          letter-spacing: 0.2em;
          color: #64748b;
          font-weight: 600;
        }

        .lx-back-link {
          font-size: 11.5px;
          color: #94a3b8;
          text-decoration: none;
          transition: color 0.2s;
        }

        .lx-back-link:hover {
          color: #c084fc;
          text-decoration: underline;
        }

        /* Responsive Mobile Adaptation */
        @media (max-width: 1023px) {
          .lx-web-auth-page {
            padding: 20px 12px;
          }

          .lx-auth-card {
            padding: 28px 20px 20px;
          }

          .lx-brand-title {
            font-size: 22px;
          }

          .lx-google-btn {
            min-height: 48px;
          }

          .lx-input-wrap {
            min-height: 48px;
          }

          .lx-submit-btn {
            min-height: 48px;
          }
        }
      `}</style>
    </main>
  );
}
