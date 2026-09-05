'use client';

import React, { useState, useEffect } from 'react';
import { useSignIn, useSignUp, useUser, useClerk } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';

export type AuthMode = 'signin' | 'signup' | 'forgot-password' | 'reset-verify' | 'verify-email';

interface CustomAuthFlowProps {
  initialMode?: AuthMode;
}

function getSafeRedirectUrl(target: string | null | undefined): string {
  const isProd = typeof window !== 'undefined' && window.location.hostname.endsWith('lexinoai.in');
  const defaultUrl = isProd ? 'https://chat.lexinoai.in' : '/chat';

  if (!target) return defaultUrl;

  if (target.startsWith('/')) {
    if (target.startsWith('/login') || target.startsWith('/signup')) {
      return defaultUrl;
    }
    return target;
  }

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
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
  const clerk = useClerk();
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

  // Cross-subdomain session sync & redirection helper
  const completeAuthAndRedirect = async (destination: string) => {
    try {
      const isLexino = typeof window !== 'undefined' && window.location.hostname.endsWith('lexinoai.in');
      let token: string | null = null;
      try {
        token = (await clerk.session?.getToken()) || null;
      } catch {}
      if (!token && typeof window !== 'undefined' && (window as any).Clerk?.session) {
        try {
          token = await (window as any).Clerk.session.getToken();
        } catch {}
      }
      if (!token && typeof document !== 'undefined') {
        const match = document.cookie.match(/(?:^|;\s*)__session=([^;]+)/);
        if (match && match[1]) token = match[1];
      }

      if (token && isLexino) {
        document.cookie = `__session=${token}; Domain=.lexinoai.in; Path=/; SameSite=Lax; Secure`;
        try {
          const destUrl = new URL(destination, window.location.origin);
          destUrl.searchParams.set('__session', token);
          window.location.href = destUrl.toString();
          return;
        } catch {}
      }
    } catch (e) {
      console.error('Session sync error:', e);
    }
    window.location.href = destination;
  };

  // Synchronize mode with prop if it changes
  useEffect(() => {
    setMode(initialMode);
    setError(null);
    setSuccessMsg(null);
  }, [initialMode]);

  // If already authenticated, forward immediately to destination
  useEffect(() => {
    if (isUserLoaded && user) {
      completeAuthAndRedirect(redirectUrl);
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
        await completeAuthAndRedirect(redirectUrl);
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
        await completeAuthAndRedirect(redirectUrl);
      } else {
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

  // Verify Email code submit
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
        await completeAuthAndRedirect(redirectUrl);
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

  // Forgot Password: Step 1
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

  // Forgot Password: Step 2
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
        await completeAuthAndRedirect(redirectUrl);
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

  // Smooth mode switch with URL sync
  const switchMode = (newMode: AuthMode) => {
    setError(null);
    setSuccessMsg(null);
    setMode(newMode);
    const path = newMode === 'signup' ? '/signup' : '/login';
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    window.history.replaceState(null, '', `${path}${query}`);
  };

  return (
    <div className="lx-auth-stage-container">
      {/* ================================================================
          EXACT 1672:941 CANVAS (Matches User Uploaded Reference Exactly)
          ================================================================ */}
      <div id="lexino-login-root">
        {/* ============================================================
            1. SIGN IN MODE — EXACT OVERLAY MATCHING REFERENCE IMAGE
            ============================================================ */}
        {mode === 'signin' && (
          <div className="lx-exact-desktop-overlay">
            {/* Google OAuth Button Overlay */}
            <button
              type="button"
              id="lx-google-btn"
              className="lx-hit"
              aria-label="Continue with Google"
              onClick={() => handleGoogleAuth('signin')}
              disabled={loading}
            />

            {/* Error or Success Message Box */}
            <div
              id="lx-form-message"
              className={error ? 'lx-msg-error' : successMsg ? 'lx-msg-success' : ''}
              style={{ display: error || successMsg ? 'block' : 'none' }}
            >
              {loading ? 'Signing in...' : error ? error : successMsg}
            </div>

            <form
              onSubmit={handleSignInSubmit}
              style={{ margin: 0, padding: 0, border: 'none', background: 'transparent' }}
            >
              {/* Email / Username Input Overlay */}
              <div id="lx-email-wrap">
                <input
                  type="text"
                  id="lx-input-identifier"
                  name="identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter your email or username"
                  autoComplete="username"
                  disabled={loading}
                  required
                  className={identifier ? 'lx-has-value' : ''}
                />
              </div>

              {/* Password Input Overlay */}
              <div id="lx-password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="lx-input-password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={loading}
                  required
                  className={password ? 'lx-has-value' : ''}
                />
                <button
                  type="button"
                  id="lx-toggle-pass"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                />
              </div>

              {/* Forgot Password Link Overlay */}
              <button
                type="button"
                id="lx-forgot-link"
                className="lx-hit"
                aria-label="Forgot password"
                onClick={() => switchMode('forgot-password')}
                disabled={loading}
              />

              {/* Sign In Submit Button Overlay */}
              <button
                type="submit"
                id="lexino-submit-btn"
                className="lx-hit"
                aria-label="Sign in"
                disabled={loading || !isSignInLoaded}
              />
            </form>

            {/* Sign Up Link Overlay */}
            <button
              type="button"
              id="lx-signup-link"
              className="lx-hit"
              aria-label="Sign up"
              onClick={() => switchMode('signup')}
              disabled={loading}
            />
          </div>
        )}

        {/* ============================================================
            2. SIGN UP / FORGOT PW / VERIFICATION MODES
            COVERS THE RIGHT CARD COMPLETELY WITH #060713 (ZERO OVERWRITE!)
            ============================================================ */}
        {mode !== 'signin' && (
          <div className="lx-clean-card-overlay" role="region" aria-label="Lexino AI Account Form">
            {/* Card Top Tagline */}
            <div className="lx-clean-tagline">
              <span className="lx-clean-tagline-line" />
              <span className="lx-clean-tagline-text">Think · Create · Grow</span>
            </div>

            {/* Card Header */}
            <div className="lx-clean-header">
              <div className="lx-clean-logo-wrap">
                <LexinoGlyph />
              </div>
              <h2 className="lx-clean-title">Lexino AI</h2>
              <p className="lx-clean-subtitle">
                {mode === 'signup' && 'Create your account to unlock your private AI workspace.'}
                {mode === 'forgot-password' && 'Enter your email to receive a recovery code.'}
                {mode === 'reset-verify' && 'Enter your reset code and choose a new password.'}
                {mode === 'verify-email' && 'Enter the 6-digit verification code sent to your inbox.'}
              </p>
            </div>

            {/* Alerts */}
            {error && (
              <div className="lx-clean-alert lx-clean-alert-error" role="alert">
                <span>⚠️</span>
                <p>{error}</p>
              </div>
            )}
            {successMsg && (
              <div className="lx-clean-alert lx-clean-alert-success" role="status">
                <span>✓</span>
                <p>{successMsg}</p>
              </div>
            )}

            {/* SIGN UP FORM */}
            {mode === 'signup' && (
              <form onSubmit={handleSignUpSubmit} className="lx-clean-form">
                <button
                  type="button"
                  className="lx-clean-google-btn"
                  onClick={() => handleGoogleAuth('signup')}
                  disabled={loading}
                  aria-label="Continue with Google"
                >
                  <GoogleIcon />
                  <span>Continue with Google</span>
                </button>

                <div className="lx-clean-divider">
                  <span className="lx-clean-divider-line" />
                  <span className="lx-clean-divider-text">or create with email</span>
                  <span className="lx-clean-divider-line" />
                </div>

                <div className="lx-clean-name-row">
                  <div className="lx-clean-field">
                    <label htmlFor="clean-fn" className="lx-clean-label">First name</label>
                    <div className="lx-clean-input-box">
                      <input
                        id="clean-fn"
                        type="text"
                        name="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First name"
                        disabled={loading}
                        className="lx-clean-input"
                      />
                    </div>
                  </div>
                  <div className="lx-clean-field">
                    <label htmlFor="clean-ln" className="lx-clean-label">Last name</label>
                    <div className="lx-clean-input-box">
                      <input
                        id="clean-ln"
                        type="text"
                        name="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last name"
                        disabled={loading}
                        className="lx-clean-input"
                      />
                    </div>
                  </div>
                </div>

                <div className="lx-clean-field">
                  <label htmlFor="clean-email" className="lx-clean-label">Email address</label>
                  <div className="lx-clean-input-box">
                    <input
                      id="clean-email"
                      type="email"
                      name="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      autoComplete="email"
                      disabled={loading}
                      required
                      className="lx-clean-input"
                    />
                  </div>
                </div>

                <div className="lx-clean-field">
                  <label htmlFor="clean-pw" className="lx-clean-label">Password (min. 8 characters)</label>
                  <div className="lx-clean-input-box">
                    <input
                      id="clean-pw"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a password"
                      autoComplete="new-password"
                      disabled={loading}
                      required
                      className="lx-clean-input"
                    />
                    <button
                      type="button"
                      className="lx-clean-pw-toggle"
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
                  className="lx-clean-gradient-btn"
                  disabled={loading || !isSignUpLoaded}
                >
                  {loading ? 'Creating account...' : 'Create Account →'}
                </button>

                <div className="lx-clean-switch-row">
                  <span>Already have an account?</span>{' '}
                  <button
                    type="button"
                    className="lx-clean-switch-btn"
                    onClick={() => switchMode('signin')}
                    disabled={loading}
                  >
                    Sign in
                  </button>
                </div>
              </form>
            )}

            {/* FORGOT PASSWORD FORM */}
            {mode === 'forgot-password' && (
              <form onSubmit={handleForgotPasswordRequest} className="lx-clean-form">
                <div className="lx-clean-field">
                  <label htmlFor="forgot-email" className="lx-clean-label">Account email</label>
                  <div className="lx-clean-input-box">
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
                      className="lx-clean-input"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="lx-clean-gradient-btn"
                  disabled={loading || !isSignInLoaded}
                >
                  {loading ? 'Sending code...' : 'Send Recovery Code →'}
                </button>

                <div className="lx-clean-switch-row">
                  <span>Remember your password?</span>{' '}
                  <button
                    type="button"
                    className="lx-clean-switch-btn"
                    onClick={() => switchMode('signin')}
                    disabled={loading}
                  >
                    Sign in
                  </button>
                </div>
              </form>
            )}

            {/* RESET PASSWORD STEP 2 */}
            {mode === 'reset-verify' && (
              <form onSubmit={handleResetPasswordSubmit} className="lx-clean-form">
                <div className="lx-clean-field">
                  <label htmlFor="reset-code" className="lx-clean-label">Recovery code</label>
                  <div className="lx-clean-input-box">
                    <input
                      id="reset-code"
                      type="text"
                      name="resetCode"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      placeholder="Enter 6-digit code"
                      disabled={loading}
                      required
                      className="lx-clean-input"
                      maxLength={6}
                    />
                  </div>
                </div>

                <div className="lx-clean-field">
                  <label htmlFor="new-pw" className="lx-clean-label">New password (min. 8 characters)</label>
                  <div className="lx-clean-input-box">
                    <input
                      id="new-pw"
                      type={showNewPassword ? 'text' : 'password'}
                      name="newPassword"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      disabled={loading}
                      required
                      className="lx-clean-input"
                    />
                    <button
                      type="button"
                      className="lx-clean-pw-toggle"
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
                  className="lx-clean-gradient-btn"
                  disabled={loading || !isSignInLoaded}
                >
                  {loading ? 'Updating password...' : 'Update Password →'}
                </button>

                <div className="lx-clean-switch-row">
                  <button
                    type="button"
                    className="lx-clean-switch-btn"
                    onClick={handleResendCode}
                    disabled={loading}
                  >
                    Resend code
                  </button>
                  {' · '}
                  <button
                    type="button"
                    className="lx-clean-switch-btn"
                    onClick={() => switchMode('signin')}
                    disabled={loading}
                  >
                    Back to sign in
                  </button>
                </div>
              </form>
            )}

            {/* VERIFY EMAIL STEP */}
            {mode === 'verify-email' && (
              <form onSubmit={handleVerifyEmailSubmit} className="lx-clean-form">
                <div className="lx-clean-field">
                  <label htmlFor="verify-code" className="lx-clean-label">Verification code</label>
                  <div className="lx-clean-input-box">
                    <input
                      id="verify-code"
                      type="text"
                      name="verificationCode"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="Enter 6-digit code"
                      disabled={loading}
                      required
                      className="lx-clean-input"
                      maxLength={6}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="lx-clean-gradient-btn"
                  disabled={loading || !isSignUpLoaded}
                >
                  {loading ? 'Verifying...' : 'Complete Verification →'}
                </button>

                <div className="lx-clean-switch-row">
                  <button
                    type="button"
                    className="lx-clean-switch-btn"
                    onClick={handleResendCode}
                    disabled={loading}
                  >
                    Resend code
                  </button>
                  {' · '}
                  <button
                    type="button"
                    className="lx-clean-switch-btn"
                    onClick={() => switchMode('signup')}
                    disabled={loading}
                  >
                    Back to sign up
                  </button>
                </div>
              </form>
            )}

            {/* Trust Badges */}
            <div className="lx-clean-trust-row">
              <div className="lx-clean-trust-item">
                <span>⚡</span>
                <span>Fast</span>
              </div>
              <div className="lx-clean-trust-div" />
              <div className="lx-clean-trust-item">
                <span>🛡️</span>
                <span>Secure</span>
              </div>
              <div className="lx-clean-trust-div" />
              <div className="lx-clean-trust-item">
                <span>👥</span>
                <span>Trusted</span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            3. MOBILE FALLBACK CARD (For Viewports < 1024px)
            ============================================================ */}
        <div className="lx-mobile-card-wrapper">
          <div className="lx-mobile-card">
            <div className="lx-clean-header">
              <div className="lx-clean-logo-wrap">
                <LexinoGlyph />
              </div>
              <h2 className="lx-clean-title">Lexino AI</h2>
              <p className="lx-clean-subtitle">
                {mode === 'signin' && 'Welcome back! Sign in to continue.'}
                {mode === 'signup' && 'Create your account to unlock your private AI workspace.'}
                {mode === 'forgot-password' && 'Enter your email to receive a recovery code.'}
                {mode === 'reset-verify' && 'Enter your reset code and choose a new password.'}
                {mode === 'verify-email' && 'Enter the 6-digit verification code.'}
              </p>
            </div>

            {error && (
              <div className="lx-clean-alert lx-clean-alert-error" role="alert">
                <span>⚠️</span>
                <p>{error}</p>
              </div>
            )}
            {successMsg && (
              <div className="lx-clean-alert lx-clean-alert-success" role="status">
                <span>✓</span>
                <p>{successMsg}</p>
              </div>
            )}

            {mode === 'signin' && (
              <form onSubmit={handleSignInSubmit} className="lx-clean-form">
                <button
                  type="button"
                  className="lx-clean-google-btn"
                  onClick={() => handleGoogleAuth('signin')}
                  disabled={loading}
                >
                  <GoogleIcon />
                  <span>Continue with Google</span>
                </button>
                <div className="lx-clean-divider">
                  <span className="lx-clean-divider-line" />
                  <span className="lx-clean-divider-text">or</span>
                  <span className="lx-clean-divider-line" />
                </div>
                <div className="lx-clean-field">
                  <label className="lx-clean-label">Email or username</label>
                  <div className="lx-clean-input-box">
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Enter your email or username"
                      className="lx-clean-input"
                      required
                    />
                  </div>
                </div>
                <div className="lx-clean-field">
                  <label className="lx-clean-label">Password</label>
                  <div className="lx-clean-input-box">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="lx-clean-input"
                      required
                    />
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    className="lx-clean-switch-btn"
                    onClick={() => switchMode('forgot-password')}
                  >
                    Forgot password?
                  </button>
                </div>
                <button type="submit" className="lx-clean-gradient-btn" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign in →'}
                </button>
                <div className="lx-clean-switch-row">
                  <span>Don’t have an account?</span>{' '}
                  <button
                    type="button"
                    className="lx-clean-switch-btn"
                    onClick={() => switchMode('signup')}
                  >
                    Sign up
                  </button>
                </div>
              </form>
            )}

            {mode === 'signup' && (
              <form onSubmit={handleSignUpSubmit} className="lx-clean-form">
                <button
                  type="button"
                  className="lx-clean-google-btn"
                  onClick={() => handleGoogleAuth('signup')}
                  disabled={loading}
                >
                  <GoogleIcon />
                  <span>Continue with Google</span>
                </button>
                <div className="lx-clean-divider">
                  <span className="lx-clean-divider-line" />
                  <span className="lx-clean-divider-text">or create with email</span>
                  <span className="lx-clean-divider-line" />
                </div>
                <div className="lx-clean-field">
                  <label className="lx-clean-label">Email address</label>
                  <div className="lx-clean-input-box">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="lx-clean-input"
                      required
                    />
                  </div>
                </div>
                <div className="lx-clean-field">
                  <label className="lx-clean-label">Password (min. 8 chars)</label>
                  <div className="lx-clean-input-box">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a password"
                      className="lx-clean-input"
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="lx-clean-gradient-btn" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account →'}
                </button>
                <div className="lx-clean-switch-row">
                  <span>Already have an account?</span>{' '}
                  <button
                    type="button"
                    className="lx-clean-switch-btn"
                    onClick={() => switchMode('signin')}
                  >
                    Sign in
                  </button>
                </div>
              </form>
            )}

            {mode === 'forgot-password' && (
              <form onSubmit={handleForgotPasswordRequest} className="lx-clean-form">
                <div className="lx-clean-field">
                  <label className="lx-clean-label">Account email</label>
                  <div className="lx-clean-input-box">
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="Enter account email"
                      className="lx-clean-input"
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="lx-clean-gradient-btn" disabled={loading}>
                  Send Recovery Code →
                </button>
                <div className="lx-clean-switch-row">
                  <button
                    type="button"
                    className="lx-clean-switch-btn"
                    onClick={() => switchMode('signin')}
                  >
                    Back to sign in
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================
          EXACT CSS STYLING & POSITIONING
          ================================================================ */}
      <style jsx global>{`
        :root {
          --violet: #8b5cf6;
          --cyan: #22d3ee;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          height: 100%;
          background: #020208;
          font-family: 'Segoe UI', Arial, -apple-system, sans-serif;
          overflow-x: hidden;
        }

        .lx-auth-stage-container {
          min-height: 100vh;
          width: 100vw;
          background: #020208;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          overflow: hidden;
        }

        /* ===== Exact 1672:941 Stage ===== */
        #lexino-login-root {
          position: relative;
          width: min(100vw, calc(100vh * (1672 / 941)));
          height: min(100vh, calc(100vw * (941 / 1672)));
          max-width: 1672px;
          max-height: 941px;
          aspect-ratio: 1672 / 941;
          background-image: url('/auth-bg.png');
          background-size: 100% 100%;
          background-repeat: no-repeat;
          margin: 0 auto;
          overflow: hidden;
        }

        /* Generic overlay hit-box */
        .lx-hit {
          position: absolute;
          background: transparent;
          border: none;
          outline: none;
          cursor: pointer;
          padding: 0;
          transition: background-color 0.2s;
        }

        .lx-hit:hover:not(:disabled) {
          background-color: rgba(255, 255, 255, 0.04);
          border-radius: 8px;
        }

        /* ===== Google button overlay ===== */
        #lx-google-btn {
          left: 65.67%;
          top: 31.65%;
          width: 27.4%;
          height: 5%;
          border-radius: 12px;
        }

        /* ===== Email field overlay ===== */
        #lx-email-wrap {
          left: 65.67%;
          top: 47.35%;
          width: 27.4%;
          height: 4.9%;
          position: absolute;
        }

        #lx-input-identifier {
          width: 100%;
          height: 100%;
          background: transparent;
          border: none;
          outline: none;
          padding-left: 8.5%;
          font-size: min(1.6vw, 15px);
          color: #f4f5fb;
          font-family: 'Segoe UI', Arial, sans-serif;
          box-sizing: border-box;
        }

        #lx-input-identifier:focus,
        #lx-input-identifier.lx-has-value {
          background: rgba(6, 7, 19, 0.96);
          border-radius: 12px;
        }

        #lx-input-identifier::placeholder {
          color: transparent;
        }

        /* ===== Password field overlay ===== */
        #lx-password-wrap {
          left: 65.67%;
          top: 56.9%;
          width: 27.4%;
          height: 5.1%;
          position: absolute;
        }

        #lx-input-password {
          width: 88%;
          height: 100%;
          background: transparent;
          border: none;
          outline: none;
          padding-left: 8.5%;
          font-size: min(1.6vw, 15px);
          color: #f4f5fb;
          font-family: 'Segoe UI', Arial, sans-serif;
          box-sizing: border-box;
        }

        #lx-input-password:focus,
        #lx-input-password.lx-has-value {
          background: rgba(6, 7, 19, 0.96);
          border-radius: 12px;
        }

        #lx-input-password::placeholder {
          color: transparent;
        }

        #lx-toggle-pass {
          position: absolute;
          right: 2%;
          top: 20%;
          width: 7%;
          height: 60%;
          background: transparent;
          border: none;
          cursor: pointer;
        }

        /* ===== Forgot password overlay ===== */
        #lx-forgot-link {
          left: 85.6%;
          top: 63.3%;
          width: 7.6%;
          height: 2.3%;
          border-radius: 6px;
        }

        /* ===== Sign in button overlay ===== */
        #lexino-submit-btn {
          left: 65.67%;
          top: 66.9%;
          width: 27.4%;
          height: 5.9%;
          border-radius: 12px;
        }

        /* ===== Sign up overlay ===== */
        #lx-signup-link {
          left: 82.9%;
          top: 74.9%;
          width: 3.9%;
          height: 2.4%;
          border-radius: 4px;
        }

        /* Message Box */
        #lx-form-message {
          position: absolute;
          left: 65.67%;
          top: 40.3%;
          width: 27.4%;
          text-align: center;
          font-size: 12px;
          font-weight: 600;
          display: none;
          font-family: 'Segoe UI', Arial, sans-serif;
          z-index: 5;
        }

        #lx-form-message.lx-msg-error {
          display: block;
          color: #fca5a5;
        }

        #lx-form-message.lx-msg-success {
          display: block;
          color: #67e8f9;
        }

        /* ================================================================
            CLEAN CARD OVERLAY (FOR SIGN UP / FORGOT PW)
            COVERS THE RIGHT CARD COMPLETELY WITH #060713 (ZERO OVERWRITE!)
            ================================================================ */
        .lx-clean-card-overlay {
          position: absolute;
          left: 59.81%;
          top: 7.65%;
          width: 35.77%;
          height: 84.48%;
          background: #060713;
          border-radius: 28px;
          border: 1.5px solid transparent;
          background-image: linear-gradient(#060713, #060713),
            linear-gradient(135deg, rgba(168, 85, 247, 0.95) 0%, rgba(34, 211, 238, 0.95) 100%);
          background-origin: border-box;
          background-clip: padding-box, border-box;
          box-shadow:
            0 25px 60px -10px rgba(0, 0, 0, 0.95),
            0 0 45px rgba(139, 92, 246, 0.35);
          z-index: 30;
          padding: min(2vw, 24px) min(2vw, 24px) min(1.5vw, 18px);
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(139, 92, 246, 0.3) transparent;
          animation: lx-fade-scale 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes lx-fade-scale {
          from {
            opacity: 0;
            transform: scale(0.98);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .lx-clean-tagline {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          margin-bottom: min(1vw, 10px);
        }

        .lx-clean-tagline-line {
          width: 32px;
          height: 2px;
          background: linear-gradient(90deg, #8b5cf6, #22d3ee);
          border-radius: 2px;
        }

        .lx-clean-tagline-text {
          font-size: min(0.95vw, 11px);
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #94a3b8;
          font-weight: 600;
        }

        .lx-clean-header {
          text-align: center;
          margin-bottom: min(1.2vw, 14px);
        }

        .lx-clean-logo-wrap {
          display: flex;
          justify-content: center;
          margin-bottom: 4px;
        }

        .lx-clean-title {
          font-family: var(--font-orbitron), 'Orbitron', 'Segoe UI', sans-serif;
          font-size: min(1.7vw, 22px);
          font-weight: 800;
          letter-spacing: 1px;
          margin: 0 0 4px;
          background: linear-gradient(135deg, #ffffff 20%, #c084fc 70%, #22d3ee 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .lx-clean-subtitle {
          font-size: min(1.05vw, 12px);
          color: #94a3b8;
          margin: 0;
          line-height: 1.35;
        }

        .lx-clean-alert {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 10px;
          font-size: min(1.05vw, 12px);
          font-weight: 500;
          margin-bottom: 10px;
        }

        .lx-clean-alert-error {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #fca5a5;
        }

        .lx-clean-alert-success {
          background: rgba(34, 211, 238, 0.15);
          border: 1px solid rgba(34, 211, 238, 0.4);
          color: #67e8f9;
        }

        .lx-clean-alert p {
          margin: 0;
        }

        .lx-clean-form {
          display: flex;
          flex-direction: column;
          gap: min(1vw, 10px);
        }

        .lx-clean-google-btn {
          width: 100%;
          min-height: min(3.5vw, 38px);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          color: #ffffff;
          font-size: min(1.15vw, 13px);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 6px 14px;
        }

        .lx-clean-google-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(139, 92, 246, 0.6);
        }

        .lx-clean-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 2px 0;
        }

        .lx-clean-divider-line {
          flex: 1;
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
        }

        .lx-clean-divider-text {
          font-size: min(0.95vw, 11px);
          color: #64748b;
        }

        .lx-clean-name-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .lx-clean-field {
          display: flex;
          flex-direction: column;
          gap: 3px;
          text-align: left;
        }

        .lx-clean-label {
          font-size: min(0.95vw, 11px);
          font-weight: 600;
          color: #cbd5e1;
        }

        .lx-clean-input-box {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
          min-height: min(3.4vw, 38px);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 11px;
          transition: border-color 0.2s;
        }

        .lx-clean-input-box:focus-within {
          border-color: #8b5cf6;
          background: rgba(255, 255, 255, 0.07);
          box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.25);
        }

        .lx-clean-input {
          width: 100%;
          height: 100%;
          background: transparent;
          border: none;
          outline: none;
          padding: 6px 12px;
          color: #ffffff;
          font-size: min(1.15vw, 13px);
          font-family: inherit;
        }

        .lx-clean-input::placeholder {
          color: #64748b;
        }

        .lx-clean-pw-toggle {
          position: absolute;
          right: 10px;
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          font-size: 13px;
        }

        .lx-clean-gradient-btn {
          width: 100%;
          min-height: min(3.8vw, 42px);
          background: linear-gradient(90deg, #8b5cf6 0%, #22d3ee 100%);
          border: none;
          border-radius: 12px;
          color: #ffffff;
          font-size: min(1.2vw, 14px);
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
          margin-top: 4px;
        }

        .lx-clean-gradient-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 0 30px rgba(139, 92, 246, 0.6);
        }

        .lx-clean-gradient-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .lx-clean-switch-row {
          text-align: center;
          font-size: min(1vw, 12px);
          color: #94a3b8;
          margin-top: 2px;
        }

        .lx-clean-switch-btn {
          background: transparent;
          border: none;
          color: #c084fc;
          font-weight: 700;
          cursor: pointer;
          padding: 0;
          transition: color 0.2s;
        }

        .lx-clean-switch-btn:hover {
          color: #e879f9;
          text-decoration: underline;
        }

        .lx-clean-trust-row {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-top: auto;
          padding-top: min(1.2vw, 12px);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .lx-clean-trust-item {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: min(0.95vw, 11px);
          color: #94a3b8;
        }

        .lx-clean-trust-div {
          width: 1px;
          height: 12px;
          background: rgba(255, 255, 255, 0.12);
        }

        .lx-mobile-card-wrapper {
          display: none;
        }

        /* ================================================================
            RESPONSIVE ADAPTATION (MOBILE & TABLET: < 1024px or Portrait)
            ================================================================ */
        @media (max-width: 1023px), (max-aspect-ratio: 1.15) {
          .lx-auth-stage-container {
            padding: 24px 16px;
            align-items: flex-start;
            overflow-y: auto;
          }

          #lexino-login-root {
            width: 100%;
            max-width: 440px;
            height: auto;
            aspect-ratio: auto;
            background-image: none;
            overflow: visible;
          }

          .lx-exact-desktop-overlay,
          .lx-clean-card-overlay {
            display: none !important;
          }

          .lx-mobile-card-wrapper {
            display: block;
            width: 100%;
          }

          .lx-mobile-card {
            width: 100%;
            background: #060713;
            border-radius: 24px;
            padding: 28px 20px;
            border: 1.5px solid rgba(139, 92, 246, 0.4);
            box-shadow:
              0 0 40px rgba(0, 0, 0, 0.9),
              0 0 25px rgba(139, 92, 246, 0.25);
            box-sizing: border-box;
          }

          .lx-clean-title {
            font-size: 22px;
          }

          .lx-clean-subtitle {
            font-size: 13px;
          }

          .lx-clean-google-btn,
          .lx-clean-input-box,
          .lx-clean-gradient-btn {
            min-height: 46px;
          }

          .lx-clean-input {
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
}
