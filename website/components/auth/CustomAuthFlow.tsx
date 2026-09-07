'use client';

import React, { useState, useEffect, useRef } from 'react';
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

export function CustomAuthFlow({ initialMode = 'signin' }: CustomAuthFlowProps) {
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirect_url') || searchParams.get('redirectUrl');
  const redirectUrl = getSafeRedirectUrl(rawRedirect);

  // Clerk hooks
  const clerk = useClerk();
  const { isLoaded: isSignInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();
  const { user, isLoaded: isUserLoaded } = useUser();

  // Mode and Flip state
  const [isFlipped, setIsFlipped] = useState(initialMode === 'signup');
  const [modalMode, setModalMode] = useState<'none' | 'forgot' | 'reset-verify' | 'verify-email'>('none');

  // Form states - Sign In
  const [signInIdentifier, setSignInIdentifier] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Form states - Sign Up
  const [signUpFullName, setSignUpFullName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);

  // Form states - Forgot / Reset Password
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Form states - Verification Code
  const [verificationCode, setVerificationCode] = useState('');

  // UI status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Refs for 3D canvas and tilt
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tiltCardRef = useRef<HTMLDivElement | null>(null);
  const tiltGlareRef = useRef<HTMLDivElement | null>(null);
  const audioCtxRef = useRef<any>(null);

  // Procedural Web Audio API synthesizer for tactile feedback
  const playChime = (freq = 520, type: OscillatorType = 'sine', duration = 0.18) => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + duration);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  };

  // Toast notification trigger
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3600);
  };

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

  // Sync mode from prop if user directly loads /signup or /login
  useEffect(() => {
    if (initialMode === 'signup') {
      setIsFlipped(true);
    } else if (initialMode === 'signin') {
      setIsFlipped(false);
    }
    setError(null);
  }, [initialMode]);

  // If already authenticated, forward immediately to destination
  useEffect(() => {
    if (isUserLoaded && user) {
      completeAuthAndRedirect(redirectUrl);
    }
  }, [isUserLoaded, user, redirectUrl]);

  // Flip card handler
  const handleFlipCard = (toSignUp: boolean) => {
    setError(null);
    playChime(toSignUp ? 620 : 440, 'triangle', 0.22);
    setIsFlipped(toSignUp);
    setModalMode('none');
    triggerToast(toSignUp ? 'Switching to Create Account...' : 'Switching to Sign In...');

    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      const flipper = document.getElementById('login-auth-flipper');
      if (flipper) {
        setTimeout(() => {
          flipper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 120);
      }
    }
  };

  // Three.js 3D Cosmic Space Initialization
  useEffect(() => {
    let animId: number;
    let renderer: any = null;
    let scene: any = null;
    let camera: any = null;
    let starsParticles: any = null;
    let dustParticles: any = null;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const startThree = () => {
      const THREE = (window as any).THREE;
      if (!THREE || !canvasRef.current) return;

      const canvas = canvasRef.current;
      scene = new THREE.Scene();

      camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.z = 240;

      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      // Star Particles
      const starQty = 2400;
      const starGeom = new THREE.BufferGeometry();
      const starCoords = new Float32Array(starQty * 3);
      const starColors = new Float32Array(starQty * 3);

      const colorPalette = [
        new THREE.Color('#ffffff'),
        new THREE.Color('#c084fc'),
        new THREE.Color('#38bdf8'),
        new THREE.Color('#d946ef'),
        new THREE.Color('#06b6d4'),
      ];

      for (let i = 0; i < starQty * 3; i += 3) {
        starCoords[i] = (Math.random() - 0.5) * 1500;
        starCoords[i + 1] = (Math.random() - 0.5) * 1500;
        starCoords[i + 2] = (Math.random() - 0.5) * 900;

        const col = colorPalette[Math.floor(Math.random() * colorPalette.length)];
        starColors[i] = col.r;
        starColors[i + 1] = col.g;
        starColors[i + 2] = col.b;
      }

      starGeom.setAttribute('position', new THREE.BufferAttribute(starCoords, 3));
      starGeom.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

      // Circular Point Texture
      const ptCanvas = document.createElement('canvas');
      ptCanvas.width = 16;
      ptCanvas.height = 16;
      const ptCtx = ptCanvas.getContext('2d');
      if (ptCtx) {
        const radialGrad = ptCtx.createRadialGradient(8, 8, 0, 8, 8, 8);
        radialGrad.addColorStop(0, 'rgba(255,255,255,1)');
        radialGrad.addColorStop(0.4, 'rgba(255,255,255,0.4)');
        radialGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ptCtx.fillStyle = radialGrad;
        ptCtx.fillRect(0, 0, 16, 16);
      }

      const ptTexture = new THREE.CanvasTexture(ptCanvas);
      const starMat = new THREE.PointsMaterial({
        size: 3.2,
        vertexColors: true,
        map: ptTexture,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      starsParticles = new THREE.Points(starGeom, starMat);
      scene.add(starsParticles);

      // Nebular Dust Floating
      const dustQty = 180;
      const dustGeom = new THREE.BufferGeometry();
      const dustCoords = new Float32Array(dustQty * 3);
      for (let i = 0; i < dustQty * 3; i += 3) {
        dustCoords[i] = (Math.random() - 0.5) * 700;
        dustCoords[i + 1] = (Math.random() - 0.5) * 700;
        dustCoords[i + 2] = (Math.random() - 0.5) * 350;
      }
      dustGeom.setAttribute('position', new THREE.BufferAttribute(dustCoords, 3));

      const dustMat = new THREE.PointsMaterial({
        size: 8.5,
        color: 0x9333ea,
        map: ptTexture,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
      });
      dustParticles = new THREE.Points(dustGeom, dustMat);
      scene.add(dustParticles);

      const handleMouseMove = (e: MouseEvent) => {
        targetX = (e.clientX - window.innerWidth / 2) * 0.04;
        targetY = (e.clientY - window.innerHeight / 2) * 0.04;
      };

      const handleResize = () => {
        if (!camera || !renderer) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('resize', handleResize);

      const renderLoop = () => {
        animId = requestAnimationFrame(renderLoop);

        if (starsParticles) {
          starsParticles.rotation.y += 0.0003;
          starsParticles.rotation.x += 0.00015;
        }
        if (dustParticles) {
          dustParticles.rotation.y -= 0.0004;
        }

        currentX += (targetX - currentX) * 0.04;
        currentY += (targetY - currentY) * 0.04;

        if (camera && scene) {
          camera.position.x = currentX * 0.4;
          camera.position.y = -currentY * 0.4;
          camera.lookAt(scene.position);
          renderer.render(scene, camera);
        }
      };

      renderLoop();

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('resize', handleResize);
      };
    };

    let cleanupListeners: (() => void) | undefined;

    if (typeof window !== 'undefined') {
      if ((window as any).THREE) {
        cleanupListeners = startThree();
      } else {
        const existingScript = document.querySelector('script[src*="three.min.js"]');
        if (existingScript) {
          existingScript.addEventListener('load', () => {
            cleanupListeners = startThree();
          });
        } else {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
          script.async = true;
          script.onload = () => {
            cleanupListeners = startThree();
          };
          document.head.appendChild(script);
        }
      }
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (cleanupListeners) cleanupListeners();
      if (renderer) renderer.dispose();
    };
  }, []);

  // 3D Card Tilt on Left Column
  useEffect(() => {
    const tiltCard = tiltCardRef.current;
    const glare = tiltGlareRef.current;
    if (!tiltCard) return;

    const handleMouseMove = (e: MouseEvent) => {
      const bounds = tiltCard.getBoundingClientRect();
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;

      const diffX = e.clientX - centerX;
      const diffY = e.clientY - centerY;

      const rotX = -(diffY / window.innerHeight) * 26 + 13;
      const rotY = (diffX / window.innerWidth) * 32 - 19;

      tiltCard.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(-3deg)`;

      if (glare) {
        const glareX = (e.clientX / window.innerWidth) * 100;
        const glareY = (e.clientY / window.innerHeight) * 100;
        glare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.28) 0%, transparent 60%)`;
      }
    };

    const handleMouseLeave = () => {
      tiltCard.style.transform = `rotateY(-19deg) rotateX(13deg) rotateZ(-3.5deg)`;
    };

    document.addEventListener('mousemove', handleMouseMove);
    tiltCard.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      tiltCard.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Google SSO Handler
  const handleGoogleAuth = async (targetMode: 'signin' | 'signup') => {
    setError(null);
    setLoading(true);
    playChime(580, 'sine', 0.2);
    triggerToast('Connecting securely with Google Cloud SSO...');

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
      triggerToast('Google authentication failed');
    }
  };

  // Sign In submit
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignInLoaded || !signIn) return;
    setError(null);

    if (!signInIdentifier.trim() || !signInPassword) {
      setError('Please fill in both fields to continue.');
      return;
    }

    setLoading(true);
    playChime(880, 'sine', 0.25);
    triggerToast(`Authenticating ${signInIdentifier.trim()}...`);

    try {
      const res = await signIn.create({
        identifier: signInIdentifier.trim(),
        password: signInPassword,
      });

      if (res.status === 'complete') {
        triggerToast('Welcome back! Initializing your secure session...');
        await setSignInActive({ session: res.createdSessionId });
        await completeAuthAndRedirect(redirectUrl);
      } else if (res.status === 'needs_first_factor') {
        setModalMode('verify-email');
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
      triggerToast('Sign in failed. Check credentials.');
    }
  };

  // Sign Up submit
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignUpLoaded || !signUp) return;
    setError(null);

    if (!signUpFullName.trim() || !signUpEmail.trim() || !signUpPassword) {
      setError('Please fill in all registration fields.');
      return;
    }

    if (signUpPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (signUpPassword !== signUpConfirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    if (!termsAccepted) {
      setError('Please accept the Terms of Service and Privacy Policy to proceed.');
      return;
    }

    setLoading(true);
    playChime(920, 'sine', 0.3);
    triggerToast(`Creating workspace for ${signUpFullName.trim()}...`);

    const nameParts = signUpFullName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || undefined;

    try {
      const res = await signUp.create({
        emailAddress: signUpEmail.trim(),
        password: signUpPassword,
        firstName,
        lastName,
      });

      if (res.status === 'complete') {
        triggerToast('Account created! Entering workspace...');
        await setSignUpActive({ session: res.createdSessionId });
        await completeAuthAndRedirect(redirectUrl);
      } else {
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        setModalMode('verify-email');
        triggerToast('Verification code dispatched to your email');
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
      triggerToast('Registration failed');
    }
  };

  // Verify Email code submit
  const handleVerifyEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignUpLoaded || !signUp) return;
    setError(null);

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
        triggerToast('Verification complete! Launching workspace...');
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

  // Forgot Password: Request code
  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignInLoaded || !signIn) return;
    setError(null);

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
      setModalMode('reset-verify');
      triggerToast(`Reset code sent to ${forgotEmail.trim()}`);
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

  // Forgot Password: Reset code and new password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignInLoaded || !signIn) return;
    setError(null);

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
        triggerToast('Password updated! Redirecting to workspace...');
        await setSignInActive({ session: res.createdSessionId });
        await completeAuthAndRedirect(redirectUrl);
      } else {
        triggerToast('Password updated! Please sign in with your new password.');
        setModalMode('none');
        setIsFlipped(false);
        setSignInPassword('');
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

  return (
    <div className="login-auth-wrapper">
      {/* Background Canvas & Atmospherics */}
      <canvas id="login-canvas-3d" ref={canvasRef}></canvas>
      <div className="login-nebula-overlay"></div>
      <div className="login-planet-arc"></div>
      <div className="login-horizon-waters"></div>

      {/* SVG Mountains Silhouette matching exact horizon & water reflections */}
      <svg className="login-mountains-silhouette" viewBox="0 0 1440 260" fill="none" preserveAspectRatio="none">
        <path
          d="M0,260 L0,180 L80,150 L160,200 L240,110 L330,175 L420,95 L510,190 L600,140 L690,210 L780,120 L870,170 L960,80 L1050,165 L1140,130 L1230,190 L1320,110 L1440,170 L1440,260 Z"
          fill="#04060c"
        />
        <path
          d="M0,260 L0,210 L120,180 L220,230 L380,160 L490,225 L610,185 L740,235 L890,170 L1020,220 L1180,175 L1310,215 L1440,195 L1440,260 Z"
          fill="#020306"
        />
        <line
          x1="0"
          y1="235"
          x2="1440"
          y2="235"
          stroke="rgba(168, 85, 247, 0.5)"
          strokeWidth="1.8"
          strokeDasharray="14 8"
        />
      </svg>

      {/* Pinwheel Iris Geometry SVG definition */}
      <svg style={{ display: 'none' }}>
        <defs>
          <g id="login-exact-logo-symbol">
            <circle cx="150" cy="150" r="32" stroke="#ffffff" strokeWidth="5" fill="none" />
            <circle cx="150" cy="150" r="18" stroke="#ffffff" strokeWidth="5" fill="none" />
            <rect x="146" y="73" width="74" height="15" stroke="#ffffff" strokeWidth="5" fill="none" strokeLinejoin="miter" />
            <g transform="rotate(45, 150, 150)">
              <rect x="146" y="73" width="74" height="15" stroke="#ffffff" strokeWidth="5" fill="none" strokeLinejoin="miter" />
            </g>
            <g transform="rotate(90, 150, 150)">
              <rect x="146" y="73" width="74" height="15" stroke="#ffffff" strokeWidth="5" fill="none" strokeLinejoin="miter" />
            </g>
            <g transform="rotate(135, 150, 150)">
              <rect x="146" y="73" width="74" height="15" stroke="#ffffff" strokeWidth="5" fill="none" strokeLinejoin="miter" />
            </g>
            <g transform="rotate(180, 150, 150)">
              <rect x="146" y="73" width="74" height="15" stroke="#ffffff" strokeWidth="5" fill="none" strokeLinejoin="miter" />
            </g>
            <g transform="rotate(225, 150, 150)">
              <rect x="146" y="73" width="74" height="15" stroke="#ffffff" strokeWidth="5" fill="none" strokeLinejoin="miter" />
            </g>
            <g transform="rotate(270, 150, 150)">
              <rect x="146" y="73" width="74" height="15" stroke="#ffffff" strokeWidth="5" fill="none" strokeLinejoin="miter" />
            </g>
            <g transform="rotate(315, 150, 150)">
              <rect x="146" y="73" width="74" height="15" stroke="#ffffff" strokeWidth="5" fill="none" strokeLinejoin="miter" />
            </g>
          </g>
        </defs>
      </svg>

      <div className="login-shell-container" id="login-main-shell">
        {/* Top Header */}
        <header className="login-header-nav">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <a href="https://www.lexinoai.in" className="login-brand-anchor">
              <div className="login-brand-logo-icon">
                <svg viewBox="0 0 300 300" width="46" height="46">
                  <use href="#login-exact-logo-symbol" />
                </svg>
              </div>
              <span className="login-brand-name-text">Lexino AI</span>
            </a>

            <div className="login-status-pill">
              <span className="login-status-beacon"></span>
              PRIVATE AI WORKSPACE
            </div>
          </div>

          <div className="login-nav-tagline" title="Lexino AI Core Philosophy">
            <span className="login-tagline-line"></span>
            <span className="login-tagline-text">
              Think <span className="login-tagline-dot">•</span> Create <span className="login-tagline-dot">•</span> Grow
            </span>
          </div>
        </header>

        {/* Main Grid Content */}
        <main className="login-hero-stage">
          {/* Left Column */}
          <section className="login-hero-copy">
            <h1 className="login-hero-lead-title">
              Your<br />
              Smartest<br />
              <span className="login-gradient-violet">Digital</span><br />
              <span className="login-gradient-aqua">Partner.</span>
            </h1>

            <p className="login-hero-summary">
              Secure access to your cinematic AI chat, saved conversations, pinned threads, and future cloud sync.
            </p>

            <div className="login-feature-cluster">
              <div className="login-feature-row" onClick={() => triggerToast('AI Chat workspace loaded.')}>
                <div className="login-icon-box login-glow-purple">
                  <i className="fa-regular fa-comment-dots"></i>
                </div>
                <div>
                  <div className="login-feature-title">AI Chat</div>
                  <div className="login-feature-desc">Get instant, intelligent answers</div>
                </div>
              </div>

              <div className="login-feature-row" onClick={() => triggerToast('Saved conversations synced.')}>
                <div className="login-icon-box login-glow-magenta">
                  <i className="fa-regular fa-file-lines"></i>
                </div>
                <div>
                  <div className="login-feature-title">Saved Conversations</div>
                  <div className="login-feature-desc">Keep your ideas, always with you</div>
                </div>
              </div>

              <div className="login-feature-row" onClick={() => triggerToast('Cloud synchronization active.')}>
                <div className="login-icon-box login-glow-sky">
                  <i className="fa-solid fa-cloud"></i>
                </div>
                <div>
                  <div className="login-feature-title">Cloud Sync</div>
                  <div className="login-feature-desc">Access anywhere, anytime</div>
                </div>
              </div>

              <div className="login-feature-row" onClick={() => triggerToast('End-to-end encryption verified.')}>
                <div className="login-icon-box login-glow-teal">
                  <i className="fa-solid fa-shield-halved"></i>
                </div>
                <div>
                  <div className="login-feature-title">Private & Secure</div>
                  <div className="login-feature-desc">Your data, your control</div>
                </div>
              </div>
            </div>

            <div className="login-tilt-arena">
              <div className="login-tilt-slab login-float-effect" id="login-tilt-element" ref={tiltCardRef}>
                <div className="login-tilt-glare" id="login-tilt-glare-effect" ref={tiltGlareRef}></div>
                <div className="login-tilt-core">
                  <svg
                    viewBox="0 0 300 300"
                    width="84"
                    height="84"
                    style={{ filter: 'drop-shadow(0 0 16px rgba(255, 255, 255, 0.7))' }}
                  >
                    <use href="#login-exact-logo-symbol" />
                  </svg>
                  <div className="login-tilt-brand">Lexino AI</div>
                  <div className="login-tilt-motto">THINK &nbsp;•&nbsp; CREATE &nbsp;•&nbsp; GROW</div>
                </div>
              </div>

              <div className="login-handwritten-block">
                <span className="login-hand-built">Built</span>
                <span className="login-hand-for-a">for a</span>
                <span className="login-hand-smarter-you">Smarter You</span>
                <div className="login-hand-brushline"></div>
              </div>
            </div>

            <div className="login-quote-strip">
              <p>“Empowering minds with AI for a smarter tomorrow.”</p>
              <span>— Lexino AI</span>
            </div>
          </section>

          {/* Right Column: Interactive 3D Authentication Pane */}
          <section className="login-auth-pane">
            {/* Mobile Cosmic Header */}
            <div className="login-mobile-cosmic-header">
              <div className="login-mobile-handwritten-slogan">
                Smarter Ideas
                <span>Bigger Possibilities</span>
              </div>
              <div className="login-mobile-planet-glow"></div>
            </div>

            <div className={`login-flip-container ${isFlipped ? 'login-is-flipped' : ''}`} id="login-auth-flipper">
              {/* ================= FRONT FACE: SIGN IN ================= */}
              <div className="login-flip-face login-flip-face-front">
                <div className="login-card-header">
                  <div className="login-card-logo-wrap">
                    <svg viewBox="0 0 300 300" width="56" height="56">
                      <use href="#login-exact-logo-symbol" />
                    </svg>
                  </div>
                  <h2 className="login-card-brand-title">Lexino AI</h2>
                  <div className="login-card-salutation">
                    Welcome <span>back!</span>
                  </div>
                  <p className="login-card-subheading">Sign in to continue to your AI workspace.</p>
                </div>

                {/* Error Banner */}
                {error && !isFlipped && (
                  <div
                    style={{
                      backgroundColor: 'rgba(225, 29, 72, 0.15)',
                      border: '1px solid rgba(244, 63, 94, 0.4)',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      marginBottom: '14px',
                      fontSize: '12.5px',
                      color: '#fecdd3',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      lineHeight: '1.4',
                    }}
                  >
                    <i className="fa-solid fa-circle-exclamation" style={{ color: '#fb7185', flexShrink: 0 }} />
                    <span>{error}</span>
                  </div>
                )}

                {/* Google SSO */}
                <button
                  type="button"
                  className="login-btn-google-sso"
                  onClick={() => handleGoogleAuth('signin')}
                  disabled={loading}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  Continue with Google
                </button>

                {/* Divider */}
                <div className="login-divider-row">
                  <div className="login-divider-line"></div>
                  <span className="login-divider-label">or</span>
                  <div className="login-divider-line"></div>
                </div>

                {/* Form */}
                <form onSubmit={handleSignInSubmit}>
                  {/* Email or Username */}
                  <div className="login-field-unit">
                    <label className="login-field-tag">Email or username</label>
                    <div className="login-field-bar">
                      <i className="fa-regular fa-envelope login-field-prefix-ico"></i>
                      <input
                        type="text"
                        value={signInIdentifier}
                        onChange={(e) => setSignInIdentifier(e.target.value)}
                        className="login-field-input"
                        placeholder="Enter your email or username"
                        required
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="login-field-unit">
                    <label className="login-field-tag">Password</label>
                    <div className="login-field-bar">
                      <i className="fa-solid fa-lock login-field-prefix-ico"></i>
                      <input
                        type={showSignInPassword ? 'text' : 'password'}
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        className="login-field-input"
                        placeholder="Enter your password"
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="login-field-eye-btn"
                        onClick={() => {
                          setShowSignInPassword(!showSignInPassword);
                          playChime(780, 'sine', 0.08);
                        }}
                        title="Toggle password visibility"
                      >
                        <i className={`fa-regular ${showSignInPassword ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                      </button>
                    </div>
                  </div>

                  {/* Forgot Password */}
                  <div className="login-forgot-anchor-wrap">
                    <a
                      href="javascript:void(0)"
                      className="login-forgot-anchor"
                      onClick={() => {
                        setError(null);
                        setModalMode('forgot');
                        playChime(650, 'sine', 0.15);
                      }}
                    >
                      Forgot password?
                    </a>
                  </div>

                  {/* Action Submit */}
                  <button type="submit" className="login-btn-action-primary" disabled={loading}>
                    {loading ? (
                      <span>Connecting...</span>
                    ) : (
                      <>
                        <span>Sign in</span>
                        <i className="fa-solid fa-arrow-right"></i>
                      </>
                    )}
                  </button>
                </form>

                {/* Toggle to Flip to Sign Up */}
                <div className="login-mode-switch-prompt">
                  <span>Don’t have an account?</span>
                  <a href="javascript:void(0)" className="login-mode-switch-link" onClick={() => handleFlipCard(true)}>
                    Sign up <i className="fa-solid fa-rotate" style={{ fontSize: '11px' }}></i>
                  </a>
                </div>

                {/* Trust Badges */}
                <div className="login-trust-cluster">
                  <div className="login-trust-item">
                    <i className="fa-solid fa-shield-halved"></i>
                    <span>Secure</span>
                  </div>
                  <div className="login-trust-item">
                    <i className="fa-solid fa-bolt"></i>
                    <span>Fast</span>
                  </div>
                  <div className="login-trust-item">
                    <i className="fa-solid fa-cloud"></i>
                    <span>Anywhere</span>
                  </div>
                </div>
              </div>

              {/* ================= BACK FACE: SIGN UP (3D FLIPPED) ================= */}
              <div className="login-flip-face login-flip-face-back">
                {/* Back Arrow Button */}
                <button
                  type="button"
                  className="login-back-nav-btn"
                  onClick={() => handleFlipCard(false)}
                  title="Back to Sign In"
                >
                  <i className="fa-solid fa-arrow-left"></i>
                </button>

                <div className="login-card-header">
                  <div className="login-card-logo-wrap">
                    <svg viewBox="0 0 300 300" width="56" height="56">
                      <use href="#login-exact-logo-symbol" />
                    </svg>
                  </div>
                  <h2 className="login-card-brand-title">Lexino AI</h2>
                  <div className="login-card-salutation">
                    Create your <span style={{ color: '#d946ef' }}>account</span>
                  </div>
                  <p className="login-card-subheading">Join Lexino AI and start your smarter journey.</p>
                </div>

                {/* Error Banner */}
                {error && isFlipped && (
                  <div
                    style={{
                      backgroundColor: 'rgba(225, 29, 72, 0.15)',
                      border: '1px solid rgba(244, 63, 94, 0.4)',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      marginBottom: '12px',
                      fontSize: '12px',
                      color: '#fecdd3',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      lineHeight: '1.4',
                    }}
                  >
                    <i className="fa-solid fa-circle-exclamation" style={{ color: '#fb7185', flexShrink: 0 }} />
                    <span>{error}</span>
                  </div>
                )}

                {/* Google SSO */}
                <button
                  type="button"
                  className="login-btn-google-sso"
                  onClick={() => handleGoogleAuth('signup')}
                  disabled={loading}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  Continue with Google
                </button>

                {/* Divider */}
                <div className="login-divider-row">
                  <div className="login-divider-line"></div>
                  <span className="login-divider-label">or</span>
                  <div className="login-divider-line"></div>
                </div>

                {/* Registration Form */}
                <form onSubmit={handleSignUpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Full Name */}
                  <div className="login-field-unit" style={{ marginBottom: 0 }}>
                    <label className="login-field-tag">Full name</label>
                    <div className="login-field-bar">
                      <i className="fa-regular fa-user login-field-prefix-ico"></i>
                      <input
                        type="text"
                        value={signUpFullName}
                        onChange={(e) => setSignUpFullName(e.target.value)}
                        className="login-field-input"
                        placeholder="e.g. Rony Rai"
                        required
                        autoComplete="name"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="login-field-unit" style={{ marginBottom: 0 }}>
                    <label className="login-field-tag">Email address</label>
                    <div className="login-field-bar">
                      <i className="fa-regular fa-envelope login-field-prefix-ico"></i>
                      <input
                        type="email"
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                        className="login-field-input"
                        placeholder="you@example.com"
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="login-field-unit" style={{ marginBottom: 0 }}>
                    <label className="login-field-tag">Password (min. 8 characters)</label>
                    <div className="login-field-bar">
                      <i className="fa-solid fa-lock login-field-prefix-ico"></i>
                      <input
                        type={showSignUpPassword ? 'text' : 'password'}
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        className="login-field-input"
                        placeholder="Create a strong password"
                        required
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="login-field-eye-btn"
                        onClick={() => {
                          setShowSignUpPassword(!showSignUpPassword);
                          playChime(780, 'sine', 0.08);
                        }}
                        title="Toggle password visibility"
                      >
                        <i className={`fa-regular ${showSignUpPassword ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="login-field-unit" style={{ marginBottom: 0 }}>
                    <label className="login-field-tag">Confirm password</label>
                    <div className="login-field-bar">
                      <i className="fa-solid fa-lock login-field-prefix-ico"></i>
                      <input
                        type={showSignUpConfirmPassword ? 'text' : 'password'}
                        value={signUpConfirmPassword}
                        onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                        className="login-field-input"
                        placeholder="Re-enter your password"
                        required
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="login-field-eye-btn"
                        onClick={() => {
                          setShowSignUpConfirmPassword(!showSignUpConfirmPassword);
                          playChime(780, 'sine', 0.08);
                        }}
                        title="Toggle password visibility"
                      >
                        <i className={`fa-regular ${showSignUpConfirmPassword ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                      </button>
                    </div>
                  </div>

                  {/* Terms agreement checkbox */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '9px',
                      marginTop: '4px',
                      marginBottom: '6px',
                    }}
                  >
                    <input
                      type="checkbox"
                      id="login-reg-terms-chk"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      style={{ accentColor: '#a855f7', marginTop: '3px' }}
                    />
                    <label
                      htmlFor="login-reg-terms-chk"
                      style={{ fontSize: '11.5px', color: '#94a3b8', lineHeight: 1.35 }}
                    >
                      I agree to the{' '}
                      <a
                        href="https://www.lexinoai.in/terms"
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#d946ef', textDecoration: 'none' }}
                      >
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a
                        href="https://www.lexinoai.in/privacy"
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#d946ef', textDecoration: 'none' }}
                      >
                        Privacy Policy
                      </a>
                    </label>
                  </div>

                  {/* Action Submit */}
                  <button
                    type="submit"
                    className="login-btn-action-primary"
                    style={{ marginTop: '2px' }}
                    disabled={loading}
                  >
                    {loading ? (
                      <span>Creating account...</span>
                    ) : (
                      <>
                        <span>Create account</span>
                        <i className="fa-solid fa-arrow-right"></i>
                      </>
                    )}
                  </button>
                </form>

                {/* Toggle to Flip back to Sign In */}
                <div className="login-mode-switch-prompt" style={{ marginTop: '14px' }}>
                  <span>Already have an account?</span>
                  <a
                    href="javascript:void(0)"
                    className="login-mode-switch-link"
                    onClick={() => handleFlipCard(false)}
                  >
                    Sign in <i className="fa-solid fa-rotate" style={{ fontSize: '11px' }}></i>
                  </a>
                </div>

                {/* Trust Badges */}
                <div className="login-trust-cluster" style={{ marginTop: '18px', paddingTop: '14px' }}>
                  <div className="login-trust-item">
                    <i className="fa-solid fa-shield-halved"></i>
                    <span>Secure</span>
                  </div>
                  <div className="login-trust-item">
                    <i className="fa-solid fa-bolt"></i>
                    <span>Fast</span>
                  </div>
                  <div className="login-trust-item">
                    <i className="fa-solid fa-cloud"></i>
                    <span>Anywhere</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Glassmorphic Overlay for Forgot Password / Reset / Email Verification */}
            {modalMode !== 'none' && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(3, 4, 9, 0.88)',
                  backdropFilter: 'blur(16px)',
                  borderRadius: '36px',
                  padding: '24px',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    maxWidth: '420px',
                    background: 'rgba(14, 18, 36, 0.95)',
                    border: '1px solid rgba(168, 85, 247, 0.55)',
                    borderRadius: '24px',
                    padding: '30px 24px',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(168,85,247,0.3)',
                    position: 'relative',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setModalMode('none');
                      setError(null);
                    }}
                    style={{
                      position: 'absolute',
                      top: '18px',
                      right: '18px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '10px',
                      color: '#ffffff',
                      width: '32px',
                      height: '32px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Close"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>

                  {modalMode === 'forgot' && (
                    <div>
                      <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
                        Reset Password
                      </h3>
                      <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>
                        Enter your registered account email to receive a recovery code.
                      </p>

                      {error && (
                        <div
                          style={{
                            color: '#f87171',
                            fontSize: '12px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            marginBottom: '14px',
                          }}
                        >
                          {error}
                        </div>
                      )}

                      <form onSubmit={handleForgotPasswordRequest}>
                        <div className="login-field-unit">
                          <label className="login-field-tag">Account Email</label>
                          <div className="login-field-bar">
                            <i className="fa-regular fa-envelope login-field-prefix-ico"></i>
                            <input
                              type="email"
                              value={forgotEmail}
                              onChange={(e) => setForgotEmail(e.target.value)}
                              className="login-field-input"
                              placeholder="Enter your email address"
                              required
                            />
                          </div>
                        </div>

                        <button type="submit" className="login-btn-action-primary" disabled={loading}>
                          {loading ? 'Sending Code...' : 'Send Recovery Code →'}
                        </button>
                      </form>
                    </div>
                  )}

                  {modalMode === 'reset-verify' && (
                    <div>
                      <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
                        Create New Password
                      </h3>
                      <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>
                        Enter the code sent to {forgotEmail} and your new password.
                      </p>

                      {error && (
                        <div
                          style={{
                            color: '#f87171',
                            fontSize: '12px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            marginBottom: '14px',
                          }}
                        >
                          {error}
                        </div>
                      )}

                      <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div className="login-field-unit" style={{ marginBottom: 0 }}>
                          <label className="login-field-tag">Verification Code</label>
                          <div className="login-field-bar">
                            <i className="fa-solid fa-key login-field-prefix-ico"></i>
                            <input
                              type="text"
                              value={resetCode}
                              onChange={(e) => setResetCode(e.target.value)}
                              className="login-field-input"
                              placeholder="6-digit reset code"
                              required
                            />
                          </div>
                        </div>

                        <div className="login-field-unit" style={{ marginBottom: 0 }}>
                          <label className="login-field-tag">New Password</label>
                          <div className="login-field-bar">
                            <i className="fa-solid fa-lock login-field-prefix-ico"></i>
                            <input
                              type={showNewPassword ? 'text' : 'password'}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="login-field-input"
                              placeholder="Min. 8 characters"
                              required
                            />
                            <button
                              type="button"
                              className="login-field-eye-btn"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                              <i className={`fa-regular ${showNewPassword ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                            </button>
                          </div>
                        </div>

                        <button type="submit" className="login-btn-action-primary" disabled={loading}>
                          {loading ? 'Updating...' : 'Update Password & Enter Workspace →'}
                        </button>
                      </form>
                    </div>
                  )}

                  {modalMode === 'verify-email' && (
                    <div>
                      <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
                        Verify Your Email
                      </h3>
                      <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>
                        Please enter the 6-digit confirmation code sent to your email.
                      </p>

                      {error && (
                        <div
                          style={{
                            color: '#f87171',
                            fontSize: '12px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            marginBottom: '14px',
                          }}
                        >
                          {error}
                        </div>
                      )}

                      <form onSubmit={handleVerifyEmailSubmit}>
                        <div className="login-field-unit">
                          <label className="login-field-tag">Confirmation Code</label>
                          <div className="login-field-bar">
                            <i className="fa-solid fa-shield-check login-field-prefix-ico"></i>
                            <input
                              type="text"
                              value={verificationCode}
                              onChange={(e) => setVerificationCode(e.target.value)}
                              className="login-field-input"
                              placeholder="e.g. 123456"
                              required
                            />
                          </div>
                        </div>

                        <button type="submit" className="login-btn-action-primary" disabled={loading}>
                          {loading ? 'Verifying...' : 'Verify & Enter Workspace →'}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </main>

        {/* Footer Bar */}
        <footer className="login-base-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="login-base-line-ornament"></div>
            <span>IDEAS TODAY &nbsp;•&nbsp; A BRIGHTER TOMORROW</span>
          </div>
          <div>LEXINOAI.IN</div>
        </footer>
      </div>

      {/* Notification Toast Container */}
      <div className={`login-toast-banner ${toastMessage ? 'login-toast-visible' : ''}`} id="login-toast-system">
        <i className="fa-solid fa-circle-check" style={{ color: '#06b6d4', fontSize: '17px' }}></i>
        <span id="login-toast-content">{toastMessage || 'Ready for action'}</span>
      </div>
    </div>
  );
}
