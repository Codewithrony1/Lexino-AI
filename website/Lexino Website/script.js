// Theme Toggle
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

// --- Music and Preference Logic (Optimized for Sub-Second Performance) ---
const bgMusic = document.getElementById('bgMusic');
const musicToggle = document.getElementById('musicToggle');
let isMuted = true; // Default muted for performance and browser autoplay policies

function toggleMusic() {
    if (!bgMusic) return;
    
    if (isMuted) {
        // UNMUTE and play on explicit user interaction
        bgMusic.muted = false;
        bgMusic.volume = 0.15;
        if (musicToggle) musicToggle.textContent = '🔊';
        isMuted = false;
        
        const playPromise = bgMusic.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => {
                console.log('Audio playback waiting for interaction:', e);
                if (musicToggle) musicToggle.textContent = '🔇';
                isMuted = true;
            });
        }
    } else {
        // MUTE
        bgMusic.muted = true;
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
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initLanding);
} else {
    initLanding();
}

// Page Navigation
function navigateToTry() {
    window.location.href = '/login?redirect_url=/chat';
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

        const orderData = await createOrderRes.json();
        if (!createOrderRes.ok || !orderData.success) {
            throw new Error(orderData.message || 'Could not initiate payment order.');
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
                        const statusData = await statusRes.json();
                        if (statusData.isPaid || statusData.status === 'paid') {
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

                    const verifyData = await verifyRes.json();
                    console.log('🔍 [Razorpay Modal] Server verification result:', verifyData);

                    if (verifyRes.ok && verifyData.success) {
                        showPaymentSuccess(orderData.planName, verifyData.tier);
                    } else {
                        showPaymentFailure(verifyData.message || 'Payment signature verification failed.');
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
window.addEventListener('load', () => {
    const cards = document.querySelectorAll('.card');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'all 0.6s ease';
        observer.observe(card);
    });
});


// Join the lexino ERA section 

function initWave(canvasId, hueStart, hueEnd, direction) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  let w, h;

  function resize() {
    w = canvas.width = canvas.offsetWidth * devicePixelRatio;
    h = canvas.height = canvas.offsetHeight * devicePixelRatio;
  }
  resize();
  window.addEventListener('resize', resize);

  const cols = 26, rows = 14;
  const pts = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      pts.push({ c, r, offset: Math.random() * Math.PI * 2 });
    }
  }

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
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

initWave('wave-left', 280, 250, 'left');
initWave('wave-right', 200, 230, 'right');