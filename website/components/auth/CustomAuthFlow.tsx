'use client';

import React, { useState, useEffect } from 'react';
import { useSignIn, useSignUp, useUser } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';

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

// Lexino Logo Glyph
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

  // Google OAuth handler (works for both Sign In & Sign Up)
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
    <div className="lx-auth-viewport">
      {/* ================================================================
          EXACT IMAGE STAGE (1672 x 941 Aspect Ratio Stage)
          ================================================================ */}
      <div id="lexino-login-root">
        {/* MODE: SIGN IN - EXACT OVERLAY MATCHING REFERENCE HTML */}
        {mode === 'signin' && (
          <div className="lx-exact-desktop-overlay">
            {/* Google button overlay */}
            <button
              type="button"
              id="lx-google-btn"
              className="lx-hit"
              aria-label="Continue with Google"
              onClick={() => handleGoogleAuth('signin')}
              disabled={loading}
            />

            {/* Form status / error message */}
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
              {/* Email field overlay */}
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
                />
              </div>

              {/* Password field overlay */}
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
                />
                <button
                  type="button"
                  id="lx-toggle-pass"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                />
              </div>

              {/* Forgot password overlay */}
              <button
                type="button"
                id="lx-forgot-link"
                className="lx-hit"
                aria-label="Forgot password"
                onClick={() => switchMode('forgot-password')}
                disabled={loading}
              />

              {/* Sign in button overlay */}
              <button
                type="submit"
                id="lexino-submit-btn"
                className="lx-hit"
                aria-label="Sign in"
                disabled={loading || !isSignInLoaded}
              />
            </form>

            {/* Sign up overlay */}
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
            FORMS FOR SIGN UP / FORGOT PASSWORD / VERIFICATION
            OR MOBILE/TABLET SCREENS
            ============================================================ */}
        {(mode !== 'signin' || true) && (
          <div
            className={`lx-card-stage ${mode === 'signin' ? 'lx-mobile-only-card' : ''}`}
            role="region"
            aria-label="Lexino AI Authentication"
          >
            {/* Card Header: Brand Icon & Title */}
            <div className="lx-card-header">
              <div className="lx-brand-icon-wrap">
                <LexinoGlyph />
              </div>
              <h2 className="lx-brand-title">Lexino AI</h2>
              <p className="lx-brand-subtitle">
                {mode === 'signin' && 'Welcome back! Sign in to continue to your AI workspace.'}
                {mode === 'signup' && 'Create your account to unlock your private AI workspace.'}
                {mode === 'forgot-password' && 'Forgot password? Enter your email to receive a recovery code.'}
                {mode === 'reset-verify' && 'Enter the reset code sent to your email to set a new password.'}
                {mode === 'verify-email' && 'Enter the 6-digit verification code sent to your inbox.'}
              </p>
            </div>

            {/* Status / Alert Messages */}
            {error && (
              <div className="lx-alert lx-alert-error" role="alert">
                <span>⚠️</span>
                <p>{error}</p>
              </div>
            )}
            {successMsg && (
              <div className="lx-alert lx-alert-success" role="status">
                <span>✓</span>
                <p>{successMsg}</p>
              </div>
            )}

            {/* Mobile Sign In Form */}
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
                  <label htmlFor="mobile-signin-id" className="lx-field-label">
                    Email or username
                  </label>
                  <div className="lx-input-wrap">
                    <span className="lx-input-icon">✉️</span>
                    <input
                      id="mobile-signin-id"
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
                  <label htmlFor="mobile-signin-pw" className="lx-field-label">
                    Password
                  </label>
                  <div className="lx-input-wrap">
                    <span className="lx-input-icon">🔒</span>
                    <input
                      id="mobile-signin-pw"
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

            {/* Mode: Create Account (Sign Up) */}
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
                  <label htmlFor="signup-pw" className="lx-field-label">
                    Password (min. 8 characters)
                  </label>
                  <div className="lx-input-wrap">
                    <span className="lx-input-icon">🔒</span>
                    <input
                      id="signup-pw"
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

                {/* Create Account Submit Button - FULLY VISIBLE */}
                <button
                  type="submit"
                  className="lx-submit-btn lx-create-btn"
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

            {/* Mode: Forgot Password */}
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
                      placeholder="Enter your registered email"
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
                    <span>Send Reset Code →</span>
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
                    Back to Sign In
                  </button>
                </div>
              </form>
            )}

            {/* Mode: Reset Verify */}
            {mode === 'reset-verify' && (
              <form onSubmit={handleResetPasswordSubmit} className="lx-form-body">
                <div className="lx-field-group">
                  <label htmlFor="reset-code" className="lx-field-label">
                    Reset code from email
                  </label>
                  <div className="lx-input-wrap">
                    <span className="lx-input-icon">🔑</span>
                    <input
                      id="reset-code"
                      type="text"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      placeholder="Enter reset code"
                      disabled={loading}
                      required
                      className="lx-input"
                    />
                  </div>
                </div>

                <div className="lx-field-group">
                  <label htmlFor="reset-np" className="lx-field-label">
                    New password (min. 8 chars)
                  </label>
                  <div className="lx-input-wrap">
                    <span className="lx-input-icon">🔒</span>
                    <input
                      id="reset-np"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      autoComplete="new-password"
                      disabled={loading}
                      required
                      className="lx-input"
                    />
                    <button
                      type="button"
                      className="lx-toggle-pw"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label="Toggle password visibility"
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
                    className="lx-highlight-link"
                    onClick={() => switchMode('signin')}
                    disabled={loading}
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            )}

            {/* Mode: Verify Email */}
            {mode === 'verify-email' && (
              <form onSubmit={handleVerifyEmailSubmit} className="lx-form-body">
                <div className="lx-field-group">
                  <label htmlFor="verify-code" className="lx-field-label">
                    6-digit verification code
                  </label>
                  <div className="lx-input-wrap">
                    <span className="lx-input-icon">🛡️</span>
                    <input
                      id="verify-code"
                      type="text"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="123456"
                      disabled={loading}
                      required
                      className="lx-input lx-code-input"
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
                    <span>Verify & Launch Workspace →</span>
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
                    className="lx-highlight-link"
                    onClick={() => switchMode('signin')}
                    disabled={loading}
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            )}

            {/* Bottom Trust Indicators */}
            <div className="lx-trust-indicators">
              <div className="lx-trust-item">
                <span className="lx-trust-icon">⚡</span>
                <span className="lx-trust-text">Fast</span>
              </div>
              <div className="lx-trust-item">
                <span className="lx-trust-icon">🛡️</span>
                <span className="lx-trust-text">Secure</span>
              </div>
              <div className="lx-trust-item">
                <span className="lx-trust-icon">👥</span>
                <span className="lx-trust-text">Trusted</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================
          EXACT CSS FROM THE ATTACHED DESIGN + RESPONSIVE STYLES
          ================================================================ */}
      <style jsx global>{`
        :root {
          --violet: #8b5cf6;
          --cyan: #22d3ee;
        }

        .lx-auth-viewport {
          min-height: 100vh;
          background: #020208;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Segoe UI', Arial, sans-serif;
          width: 100%;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          overflow-x: hidden;
        }

        /* ===== Exact-image stage: keeps the 1672:941 ratio at any screen size ===== */
        #lexino-login-root {
          position: relative;
          width: 100%;
          max-width: 1672px;
          aspect-ratio: 1672 / 941;
          background-image: url('/auth-bg.png');
          background-size: 100% 100%;
          background-repeat: no-repeat;
          margin: 0 auto;
          overflow: hidden;
        }

        /* generic overlay hit-box */
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
          height: 5.0%;
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
        }

        #lx-input-identifier:focus {
          background: rgba(5, 6, 16, 0.65);
          border-radius: 10px;
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
        }

        #lx-input-password:focus {
          background: rgba(5, 6, 16, 0.65);
          border-radius: 10px;
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
          border-radius: 6px;
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
            GLASSMORPHISM FORM STYLES (Sign Up, Forgot Password & Mobile)
            ================================================================ */
        .lx-card-stage {
          position: absolute;
          right: 4.2%;
          top: 6.8%;
          width: 32.8%;
          max-height: 87.5%;
          background: rgba(8, 9, 20, 0.94);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          border-radius: 28px;
          border: 1px solid rgba(139, 92, 246, 0.35);
          box-shadow:
            0 20px 45px rgba(0, 0, 0, 0.8),
            0 0 35px rgba(139, 92, 246, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
          padding: min(2.4vw, 28px) min(2.2vw, 26px) min(1.8vw, 20px);
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          z-index: 20;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(139, 92, 246, 0.3) transparent;
        }

        /* Hide the mobile card on desktop when in signin mode */
        @media (min-width: 1024px) and (min-aspect-ratio: 1.15) {
          .lx-mobile-only-card {
            display: none !important;
          }
        }

        .lx-card-stage::-webkit-scrollbar {
          width: 4px;
        }
        .lx-card-stage::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.4);
          border-radius: 4px;
        }

        .lx-card-header {
          text-align: center;
          margin-bottom: min(1.4vw, 16px);
        }

        .lx-brand-icon-wrap {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 4px;
        }

        .lx-brand-title {
          font-family: var(--font-orbitron), 'Orbitron', 'Segoe UI', sans-serif;
          font-size: min(1.9vw, 22px);
          font-weight: 800;
          letter-spacing: 1px;
          margin: 0 0 4px;
          background: linear-gradient(135deg, #ffffff 30%, #c084fc 80%, #22d3ee 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .lx-brand-subtitle {
          font-size: min(1.15vw, 13px);
          color: #94a3b8;
          margin: 0;
          line-height: 1.4;
        }

        .lx-alert {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 10px;
          font-size: min(1.15vw, 12px);
          font-weight: 500;
          margin-bottom: 10px;
          line-height: 1.4;
          box-sizing: border-box;
        }

        .lx-alert-error {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #fca5a5;
        }

        .lx-alert-success {
          background: rgba(34, 211, 238, 0.12);
          border: 1px solid rgba(34, 211, 238, 0.4);
          color: #67e8f9;
        }

        .lx-alert p {
          margin: 0;
          word-break: break-word;
        }

        .lx-form-body {
          display: flex;
          flex-direction: column;
          gap: min(1.1vw, 12px);
        }

        .lx-google-btn {
          width: 100%;
          min-height: min(3.6vw, 42px);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 12px;
          color: #f1f5f9;
          font-size: min(1.25vw, 14px);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          padding: 8px 16px;
          box-sizing: border-box;
        }

        .lx-google-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(139, 92, 246, 0.5);
          box-shadow: 0 0 16px rgba(139, 92, 246, 0.2);
          transform: translateY(-1px);
        }

        .lx-google-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

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
          font-size: min(1.05vw, 12px);
          color: #64748b;
          text-transform: lowercase;
        }

        .lx-field-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
          text-align: left;
        }

        .lx-field-row-split {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .lx-field-label {
          font-size: min(1.05vw, 12px);
          font-weight: 600;
          color: #cbd5e1;
        }

        .lx-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
          min-height: min(3.6vw, 40px);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 11px;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .lx-input-wrap:focus-within {
          border-color: #8b5cf6;
          background: rgba(255, 255, 255, 0.06);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.25);
        }

        .lx-input-icon {
          position: absolute;
          left: 12px;
          font-size: min(1.1vw, 13px);
          pointer-events: none;
          opacity: 0.7;
        }

        .lx-input {
          width: 100%;
          height: 100%;
          background: transparent;
          border: none;
          outline: none;
          padding: 8px 36px 8px 36px;
          color: #f8fafc;
          font-size: min(1.25vw, 14px);
          font-family: inherit;
          box-sizing: border-box;
        }

        .lx-input::placeholder {
          color: #64748b;
        }

        .lx-code-input {
          letter-spacing: 4px;
          font-weight: 700;
          font-size: min(1.5vw, 18px);
          text-align: center;
          padding-left: 12px;
          padding-right: 12px;
        }

        .lx-toggle-pw {
          position: absolute;
          right: 10px;
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          font-size: min(1.1vw, 13px);
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
          margin-top: -3px;
        }

        .lx-text-link {
          background: transparent;
          border: none;
          color: #a78bfa;
          font-size: min(1.05vw, 12px);
          font-weight: 500;
          cursor: pointer;
          padding: 0;
          transition: color 0.2s;
        }

        .lx-text-link:hover {
          color: #c4b5fd;
          text-decoration: underline;
        }

        .lx-submit-btn {
          width: 100%;
          min-height: min(3.8vw, 42px);
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(90deg, #8b5cf6 0%, #22d3ee 100%);
          border: none;
          border-radius: 12px;
          color: #ffffff;
          font-size: min(1.25vw, 14px);
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 0 24px rgba(139, 92, 246, 0.35);
          margin-top: 4px;
          padding: 10px 16px;
          box-sizing: border-box;
        }

        .lx-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 0 32px rgba(139, 92, 246, 0.55);
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

        .lx-toggle-mode-row {
          text-align: center;
          font-size: min(1.15vw, 13px);
          color: #94a3b8;
          margin-top: 2px;
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

        .lx-trust-indicators {
          display: flex;
          justify-content: space-around;
          align-items: center;
          margin-top: min(1.6vw, 18px);
          padding-top: min(1vw, 12px);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .lx-trust-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .lx-trust-icon {
          font-size: min(1.2vw, 14px);
          opacity: 0.85;
        }

        .lx-trust-text {
          font-size: min(0.95vw, 11px);
          color: #94a3b8;
          font-weight: 500;
          letter-spacing: 0.5px;
        }

        /* ================================================================
            RESPONSIVE ADAPTATION (MOBILE & TABLET: < 1024px or Portrait)
            ================================================================ */
        @media (max-width: 1023px), (max-aspect-ratio: 1.15) {
          .lx-auth-viewport {
            padding: 24px 16px;
            align-items: flex-start;
          }

          #lexino-login-root {
            aspect-ratio: auto;
            max-width: 460px;
            background-image: none;
            box-shadow: none;
            border-radius: 0;
            overflow: visible;
          }

          .lx-exact-desktop-overlay {
            display: none !important;
          }

          .lx-card-stage {
            position: relative;
            right: auto;
            top: auto;
            width: 100%;
            max-height: none;
            border-radius: 24px;
            padding: 28px 22px;
            background: rgba(10, 11, 24, 0.95);
            box-shadow:
              0 0 40px rgba(0, 0, 0, 0.9),
              0 0 25px rgba(139, 92, 246, 0.18);
            border: 1px solid rgba(139, 92, 246, 0.4);
            display: flex !important;
          }

          .lx-brand-title {
            font-size: 22px;
          }

          .lx-brand-subtitle {
            font-size: 13px;
          }

          .lx-google-btn {
            min-height: 48px;
            font-size: 14px;
          }

          .lx-input-wrap {
            min-height: 48px;
          }

          .lx-input {
            font-size: 15px;
          }

          .lx-submit-btn {
            min-height: 48px;
            font-size: 15px;
          }

          .lx-trust-indicators {
            margin-top: 24px;
            padding-top: 16px;
          }

          .lx-trust-text {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}
