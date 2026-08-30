// Theme Toggle
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

// --- Music and Preference Logic (Optimized for Sub-Second Performance) ---
// The <audio> element is not in the served HTML: it is created on the first
// music-toggle click, so a visitor who never opts in downloads zero audio bytes
// and the page ships no media element at all.
const AMBIENCE_SOURCES = [
    { src: '/lexino-website/ambience.webm', type: 'audio/webm; codecs=opus' },
    { src: '/lexino-website/ambience.m4a', type: 'audio/mp4; codecs=mp4a.40.2' },
];

const musicToggle = document.getElementById('musicToggle');
let bgMusic = null;
let isMuted = true; // Default muted for performance and browser autoplay policies

function getBgMusic() {
    if (bgMusic) return bgMusic;

    const audio = document.createElement('audio');
    audio.id = 'bgMusic';
    audio.loop = true;
    audio.preload = 'none';
    audio.muted = true;
    audio.style.display = 'none';

    for (const source of AMBIENCE_SOURCES) {
        const el = document.createElement('source');
        el.src = source.src;
        el.type = source.type;
        audio.appendChild(el);
    }

    document.body.appendChild(audio);
    bgMusic = audio;
    return bgMusic;
}

function toggleMusic() {
    if (isMuted) {
        // UNMUTE and play on explicit user interaction
        const audio = getBgMusic();
        audio.muted = false;
        audio.volume = 0.15;
        if (musicToggle) musicToggle.textContent = '🔊';
        isMuted = false;

        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => {
                console.log('Audio playback waiting for interaction:', e);
                if (musicToggle) musicToggle.textContent = '🔇';
                isMuted = true;
            });
        }
    } else {
        // MUTE
        if (bgMusic) bgMusic.muted = true;
        if (musicToggle) musicToggle.textContent = '🔇';
        isMuted = true;
    }

    localStorage.setItem('musicMuted', isMuted.toString());
}

// Create animated particles
function createParticles() {
    const container = document.querySelector('.bg-animation');
    if (!container || container.querySelector('.particle')) return;
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
        container.appendChild(particle);
    }
}

// Hero clip: the poster (a ~35 KB WebP) is what paints — and therefore what LCP
// measures. The MP4 itself is only requested once the element is near the viewport
// and the main thread is idle, and it is paused whenever it is not on screen.
function initHeroVideo() {
    const video = document.querySelector('.demo-preview');
    if (!video) return;

    const chooseSource = () => {
        const compact = window.matchMedia('(max-width: 700px)').matches;
        return (compact && video.dataset.srcMobile) || video.dataset.srcDesktop;
    };

    const safePlay = () => {
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {});
        }
    };

    let activated = false;
    const activate = () => {
        if (activated) return;
        activated = true;
        const src = chooseSource();
        if (!src) return;
        video.src = src;
        video.load();
        safePlay();
    };

    // Deliberately waits for the load event before even queueing idle work: with only
    // requestIdleCallback's 2.5s timeout, the 630KB-1.2MB video started downloading
    // inside the LCP window and stole bandwidth from the hero poster.
    const afterLoad = (fn) => {
        if (document.readyState === 'complete') {
            fn();
        } else {
            window.addEventListener('load', fn, { once: true });
        }
    };

    const whenIdle = () => {
        afterLoad(() => {
            if (typeof requestIdleCallback === 'function') {
                requestIdleCallback(activate, { timeout: 2000 });
            } else {
                setTimeout(activate, 300);
            }
        });
    };

    if (typeof IntersectionObserver !== 'function') {
        whenIdle();
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (entry.isIntersecting) {
                if (!activated) whenIdle();
                else if (video.paused && !document.hidden) safePlay();
            } else if (activated && !video.paused) {
                video.pause();
            }
        }
    }, { rootMargin: '200px 0px' });
    observer.observe(video);

    document.addEventListener('visibilitychange', () => {
        if (!activated) return;
        if (document.hidden) video.pause();
        else if (video.dataset.onScreen === '1') safePlay();
    });

    // Track on-screen state for the visibilitychange handler above.
    const screenObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            video.dataset.onScreen = entry.isIntersecting ? '1' : '0';
        }
    });
    screenObserver.observe(video);
}

function initLanding() {
    // 1. Load Saved Theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
    }

    // 2. Initialize Audio in Muted/Ready state
    isMuted = true;
    if (musicToggle) musicToggle.textContent = '🔇';

    // 3. Create background particles
    createParticles();

    // 4. Wire up deferred media and below-the-fold animations
    initAuthCta();
    initHeroVideo();
    initCardReveal();
    initWaves();
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initLanding);
} else {
    initLanding();
}

// Page Navigation
// The landing page is statically generated, so the signed-in CTA is resolved on the
// client from Clerk's JS-readable session hint cookie instead of rendering the page
// per request. `/login?redirect_url=/chat` already forwards signed-in users to the
// chat workspace, so the click target stays correct even if the hint is unavailable.
function hasClerkSession() {
    const match = document.cookie.match(/(?:^|;\s*)__client_uat(?:_[^=;]+)?=([^;]*)/);
    if (!match) return false;
    const issuedAt = Number(decodeURIComponent(match[1]));
    return Number.isFinite(issuedAt) && issuedAt > 0;
}

function initAuthCta() {
    if (!hasClerkSession()) return;
    document.querySelectorAll('.cta-button').forEach(button => {
        if (button.textContent.trim() === 'Experience Lexino AI Now 🚀') {
            button.textContent = 'Go to Chat Dashboard 🚀';
        }
    });
}

function navigateToTry() {
    window.location.href = hasClerkSession() ? '/chat' : '/login?redirect_url=/chat';
}

function navigateToHome() {
    hideAllPages();
    const home = document.getElementById('home-page');
    if (home) home.style.display = 'block';
    window.scrollTo(0, 0);
}

function navigateToTerms() {
    window.location.href = '/terms';
}

function navigateToPrivacy() {
    window.location.href = '/privacy';
}

function hideAllPages() {
    const home = document.getElementById('home-page');
    if (home) home.style.display = 'none';
}

// ===================================================
// RAZORPAY CHECKOUT & PAYMENT INTEGRATION
// ===================================================

let lastAttemptedPlan = 'pro';
let lastStudentIdNote = '';
let isRazorpayLoading = false;

// Dynamically load Razorpay Checkout script on demand
function loadRazorpaySdk() {
    return new Promise((resolve, reject) => {
        if (window.Razorpay) {
            resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
        document.body.appendChild(script);
    });
}

function openPlanCheckout(planId) {
    if (planId === 'student') {
        const modal = document.getElementById('studentVerificationModal');
        if (modal) modal.style.display = 'flex';
    } else {
        initiateRazorpayPayment('pro', '');
    }
}

function closeStudentModal() {
    const modal = document.getElementById('studentVerificationModal');
    if (modal) modal.style.display = 'none';
}

function handleStudentVerificationSubmit(event) {
    event.preventDefault();
    const institute = (document.getElementById('studentInstitute')?.value || '').trim();
    const course = (document.getElementById('studentCourse')?.value || '').trim();
    const rollId = (document.getElementById('studentRollId')?.value || '').trim();

    if (!institute || !course || !rollId) {
        alert('Please fill in all student verification fields.');
        return;
    }

    const note = `Institute: ${institute} | Course: ${course} | Roll: ${rollId}`;
    closeStudentModal();
    initiateRazorpayPayment('student', note);
}

async function initiateRazorpayPayment(planId, studentIdNote) {
    lastAttemptedPlan = planId;
    lastStudentIdNote = studentIdNote;

    const targetBtn = planId === 'student'
        ? document.getElementById('studentCheckoutBtn')
        : document.getElementById('proCheckoutBtn');
    
    const originalBtnText = targetBtn ? targetBtn.textContent : '';
    if (targetBtn) {
        targetBtn.disabled = true;
        targetBtn.textContent = 'Preparing Gateway... ⚡';
    }

    async function safeReadJson(res) {
        try {
            const ct = res.headers ? (res.headers.get('content-type') || '') : '';
            if (ct.includes('application/json')) {
                return await res.json();
            }
            const text = await res.text();
            return { success: false, message: `Server returned non-JSON response (${res.status})` };
        } catch (e) {
            return { success: false, message: e.message || 'Failed to parse response' };
        }
    }

    try {
        await loadRazorpaySdk();

        // 1. Create order on server
        const createOrderRes = await fetch('/api/razorpay/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planId, studentIdNote }),
        });

        if (createOrderRes.status === 401) {
            // User needs to authenticate first
            window.location.href = `/login?redirect_url=/pricing`;
            return;
        }

        const orderData = await safeReadJson(createOrderRes);
        if (!createOrderRes.ok || !orderData || !orderData.success) {
            throw new Error((orderData && orderData.message) || 'Could not initiate payment order.');
        }

        // 2. Setup Real-Time Status Polling (for UPI QR Code scanning on mobile)
        let pollingInterval = null;
        let isPaymentCompleted = false;

        const stopPolling = () => {
            if (pollingInterval) {
                clearInterval(pollingInterval);
                pollingInterval = null;
            }
        };

        const startStatusPolling = (orderId, planName) => {
            stopPolling();
            const startTime = Date.now();
            const timeoutMs = 5 * 60 * 1000; // 5 minutes

            pollingInterval = setInterval(async () => {
                if (isPaymentCompleted) {
                    stopPolling();
                    return;
                }

                if (Date.now() - startTime > timeoutMs) {
                    console.log('⏱️ [UPI Polling] Polling timed out after 5 minutes.');
                    stopPolling();
                    return;
                }

                try {
                    const statusRes = await fetch(`/api/check-payment-status?order_id=${encodeURIComponent(orderId)}`, {
                        cache: 'no-store',
                    });
                    if (statusRes.ok) {
                        const statusData = await safeReadJson(statusRes);
                        if (statusData && (statusData.isPaid || statusData.status === 'paid')) {
                            console.log('🎉 [UPI QR Polling] Payment detected as paid in real-time!', statusData);
                            isPaymentCompleted = true;
                            stopPolling();
                            try {
                                if (rzp && typeof rzp.close === 'function') {
                                    rzp.close();
                                }
                            } catch (_) {}
                            showPaymentSuccess(statusData.planName || planName, statusData.tier);
                        }
                    }
                } catch (pollErr) {
                    console.warn('⚠️ [UPI Polling] Check error:', pollErr);
                }
            }, 3000);
        };

        // 3. Open Razorpay Checkout modal
        const callbackUrl = window.location.origin + '/api/razorpay/callback';
        const options = {
            key: orderData.keyId,
            amount: orderData.amount,
            currency: orderData.currency || 'INR',
            name: 'Lexino AI',
            description: `${orderData.planName} Plan Access`,
            image: '/lexino-website/Lexino_AI_Logo-removebg-preview.png',
            order_id: orderData.orderId,
            callback_url: callbackUrl,
            redirect: false,
            prefill: {
                name: orderData.userName || '',
                email: orderData.userEmail || '',
            },
            theme: {
                color: '#00f0ff',
            },
            modal: {
                ondismiss: function () {
                    console.log('ℹ️ [Razorpay Modal] Dismissed by user. Keeping polling active for 60s in case UPI app confirms.');
                    setTimeout(stopPolling, 60000);
                },
            },
            handler: async function (response) {
                console.log('⚡ [Razorpay Modal] Payment success returned from gateway:', response);
                isPaymentCompleted = true;
                stopPolling();

                // 4. Verify signature on server
                try {
                    const verifyRes = await fetch('/api/verify-payment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            planId: planId,
                        }),
                    });

                    const verifyData = await safeReadJson(verifyRes);
                    console.log('🔍 [Razorpay Modal] Server verification result:', verifyData);

                    if (verifyRes.ok && verifyData && verifyData.success) {
                        showPaymentSuccess(orderData.planName, verifyData.tier);
                    } else {
                        showPaymentFailure((verifyData && verifyData.message) || 'Payment signature verification failed.');
                    }
                } catch (verifyErr) {
                    console.error('❌ [Razorpay Modal] Verification fetch error:', verifyErr);
                    showPaymentFailure('Network error verifying transaction. Please contact support if amount was deducted.');
                }
            },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
            console.error('❌ [Razorpay Modal] Payment failed:', response);
            stopPolling();
            showPaymentFailure(response.error?.description || 'Transaction was declined by bank/gateway.');
        });
        rzp.open();

        // Start active polling for UPI QR scan completion
        startStatusPolling(orderData.orderId, orderData.planName);

    } catch (err) {
        console.error('Payment initiation error:', err);
        showPaymentFailure(err.message || 'Failed to initialize payment gateway.');
    } finally {
        if (targetBtn) {
            targetBtn.disabled = false;
            targetBtn.textContent = originalBtnText;
        }
    }
}

function showPaymentSuccess(planName, tier) {
    const targetTier = (tier || (planName?.toLowerCase().includes('student') ? 'STUDENT' : 'PRO')).toUpperCase();
    window.lexinoUserTier = targetTier;

    // Cross-tab broadcast to all open Lexino AI tabs
    try {
        if (typeof BroadcastChannel !== 'undefined') {
            const bc = new BroadcastChannel('lexino_global_state_channel');
            bc.postMessage({
                type: 'STATE_CHANGE',
                path: 'subscription.tier',
                value: targetTier,
            });
            bc.close();
        }
        localStorage.setItem('lexino_state_broadcast', JSON.stringify({
            type: 'SUBSCRIPTION_UPGRADED',
            tier: targetTier,
            timestamp: Date.now()
        }));
    } catch (_) {}

    const modal = document.getElementById('paymentSuccessModal');
    const text = document.getElementById('successPlanText');
    if (text) text.textContent = `Your Lexino AI ${planName} Plan is now active.`;
    if (modal) modal.style.display = 'flex';

    // Auto-redirect to chat workspace with query parameter
    setTimeout(() => {
        window.location.href = `/chat?payment=success&tier=${targetTier}`;
    }, 2000);
}

function closeSuccessModal() {
    const modal = document.getElementById('paymentSuccessModal');
    if (modal) modal.style.display = 'none';
}

function showPaymentFailure(reason) {
    const modal = document.getElementById('paymentFailureModal');
    const text = document.getElementById('failureReasonText');
    if (text) text.textContent = reason;
    if (modal) modal.style.display = 'flex';
}

function closeFailureModal() {
    const modal = document.getElementById('paymentFailureModal');
    if (modal) modal.style.display = 'none';
}

function retryLastPayment() {
    closeFailureModal();
    initiateRazorpayPayment(lastAttemptedPlan, lastStudentIdNote);
}

// Newsletter subscription
function subscribeNewsletter(event) {
    event.preventDefault();
    const emailInput = document.getElementById('newsletter-email');
    const message = document.getElementById('newsletter-message');
    const email = emailInput?.value.trim();
    if (!email || !email.includes('@')) {
        if (message) {
            message.textContent = '⚠️ Please enter a valid email address';
            message.className = 'newsletter-message error show';
        }
        return;
    }
    if (message) {
        message.textContent = '✓ Successfully subscribed! Welcome to the Lexino AI community.';
        message.className = 'newsletter-message success show';
    }
    if (emailInput) emailInput.value = '';
    setTimeout(() => {
        if (message) message.classList.remove('show');
    }, 5000);
}

// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#' || this.onclick) return;
        
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Observe cards for scroll animations
function initCardReveal() {
    const cards = document.querySelectorAll('.card');
    if (!cards.length) return;

    if (typeof IntersectionObserver !== 'function') return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
}


// Join the lexino ERA section
// Both canvases sit below the fold. The render loop only runs while the canvas is
// actually on screen and the tab is visible, so it costs nothing during page load.

function initWave(canvasId, hueStart, hueEnd, direction) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  let w, h;

  function resize() {
    w = canvas.width = canvas.offsetWidth * devicePixelRatio;
    h = canvas.height = canvas.offsetHeight * devicePixelRatio;
  }
  resize();

  let resizePending = false;
  window.addEventListener('resize', () => {
    if (resizePending) return;
    resizePending = true;
    requestAnimationFrame(() => {
      resizePending = false;
      resize();
    });
  }, { passive: true });

  const cols = 26, rows = 14;
  const pts = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      pts.push({ c, r, offset: Math.random() * Math.PI * 2 });
    }
  }

  let frameId = null;

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    for (const p of pts) {
      const nx = direction === 'left' ? p.c / (cols - 1) : 1 - p.c / (cols - 1);
      const ny = p.r / (rows - 1);

      const persp = 0.35 + nx * 0.65;
      const px = (direction === 'left' ? nx : 1 - nx) * w;
      const wobble = Math.sin(t * 0.0006 + p.offset + nx * 4) * 10 * devicePixelRatio * ny;
      const py = h - (ny * h * 0.9) + wobble;

      const alpha = (1 - nx) * 0.6 * (0.4 + ny * 0.6);
      if (alpha <= 0.02) continue;
      const hue = hueStart + (hueEnd - hueStart) * ny;

      ctx.beginPath();
      ctx.fillStyle = `hsla(${hue}, 85%, 66%, ${alpha})`;
      ctx.arc(px, py, (0.6 + persp * 0.9) * devicePixelRatio, 0, Math.PI * 2);
      ctx.fill();
    }
    frameId = requestAnimationFrame(draw);
  }

  let onScreen = false;

  function start() {
    if (frameId !== null) return;
    frameId = requestAnimationFrame(draw);
  }

  function stop() {
    if (frameId === null) return;
    cancelAnimationFrame(frameId);
    frameId = null;
  }

  function sync() {
    if (onScreen && !document.hidden) start();
    else stop();
  }

  if (typeof IntersectionObserver === 'function') {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) onScreen = entry.isIntersecting;
      sync();
    }, { rootMargin: '120px 0px' });
    observer.observe(canvas);
  } else {
    onScreen = true;
    sync();
  }

  document.addEventListener('visibilitychange', sync);
}

function initWaves() {
  initWave('wave-left', 280, 250, 'left');
  initWave('wave-right', 200, 230, 'right');
}