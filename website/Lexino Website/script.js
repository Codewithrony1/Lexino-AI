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

window.addEventListener('DOMContentLoaded', () => {
    // 1. Load Saved Theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
    }
    
    // 2. Initialize Audio in Muted/Ready state without fetching large buffers
    const savedMuted = localStorage.getItem('musicMuted');
    if (savedMuted === 'false') {
        // User had previously unmuted, but we leave it silent until first gesture to prevent autoplay blocks
        isMuted = true;
        if (musicToggle) musicToggle.textContent = '🔇';
    } else {
        isMuted = true;
        if (musicToggle) musicToggle.textContent = '🔇';
    }
});

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

        // 2. Open Razorpay Checkout modal
        const options = {
            key: orderData.keyId,
            amount: orderData.amount,
            currency: orderData.currency || 'INR',
            name: 'Lexino AI',
            description: `${orderData.planName} Plan Access`,
            image: '/lexino-website/Lexino_AI_Logo-removebg-preview.png',
            order_id: orderData.orderId,
            prefill: {
                name: orderData.userName || '',
                email: orderData.userEmail || '',
            },
            theme: {
                color: '#00f0ff',
            },
            modal: {
                ondismiss: function () {
                    showPaymentFailure('Payment was cancelled before completion. You can retry whenever you are ready.');
                },
            },
            handler: async function (response) {
                // 3. Verify signature on server
                try {
                    const verifyRes = await fetch('/api/razorpay/verify', {
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
                    if (verifyRes.ok && verifyData.success) {
                        showPaymentSuccess(orderData.planName);
                    } else {
                        showPaymentFailure(verifyData.message || 'Payment signature verification failed.');
                    }
                } catch (verifyErr) {
                    showPaymentFailure('Network error verifying transaction. Please contact support if amount was deducted.');
                }
            },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
            showPaymentFailure(response.error?.description || 'Transaction was declined by bank/gateway.');
        });
        rzp.open();

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

function showPaymentSuccess(planName) {
    const modal = document.getElementById('paymentSuccessModal');
    const text = document.getElementById('successPlanText');
    if (text) text.textContent = `Your Lexino AI ${planName} Plan is now active.`;
    if (modal) modal.style.display = 'flex';
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


//    <!-- Lexino ERA Section Start -->
function initWave(canvasId, hueStart, hueEnd, direction) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  let w, h, dpr;

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.width = canvas.offsetWidth * dpr;
    h = canvas.height = canvas.offsetHeight * dpr;
  }
  resize();
  window.addEventListener('resize', resize);

  const strandCount = 22;
  const perStrand = 46;
  const strands = [];

  for (let s = 0; s < strandCount; s++) {
    const sNorm = s / (strandCount - 1);
    const particles = [];
    for (let p = 0; p < perStrand; p++) {
      particles.push({
        t0: p / perStrand,
        jitter: (Math.random() - 0.5) * 0.035,
        sizeJ: Math.random()
      });
    }
    strands.push({
      sNorm,
      lift: 0.06 + sNorm * 0.9,
      freq: 2.4 + sNorm * 1.6,
      phase: sNorm * 8.4,
      amp: 0.05 + (1 - sNorm) * 0.05,
      speed: 0.00002 + sNorm * 0.00003,
      particles
    });
  }

  function draw(time) {
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';

    for (const strand of strands) {
      const flowOffset = (time * strand.speed) % 1;

      for (const pt of strand.particles) {
        let t = (pt.t0 + flowOffset) % 1;

        const reach = 0.18 + strand.sNorm * 0.95;
        if (t > reach) continue;

        const tn = t / reach;

        const nx = direction === 'left' ? tn : 1 - tn;
        const baseY = 1 - strand.lift * tn;

        const wave = Math.sin(tn * strand.freq * Math.PI * 2 + strand.phase + time * 0.0004) * strand.amp * tn;
        const ny = baseY + wave + pt.jitter * tn;

        const px = nx * w;
        const py = ny * h;
        if (py < -10 || py > h + 10) continue;

        const fadeIn = Math.min(tn / 0.08, 1);
        const fadeOut = 1 - Math.pow(tn, 2.2);
        const strandFade = 0.35 + (1 - strand.sNorm) * 0.65;
        const alpha = Math.max(0, fadeIn * fadeOut * strandFade * 0.85);
        if (alpha <= 0.015) continue;

        const size = (0.5 + pt.sizeJ * 1.3 + (1 - tn) * 0.6) * dpr;
        const hue = hueStart + (hueEnd - hueStart) * tn;
        const light = 60 + tn * 18;

        ctx.beginPath();
        ctx.fillStyle = `hsla(${hue}, 90%, ${light}%, ${alpha})`;
        ctx.shadowBlur = 3.5 * dpr;
        ctx.shadowColor = `hsla(${hue}, 95%, 65%, ${Math.min(alpha * 1.4, 0.9)})`;
        ctx.arc(direction === 'left' ? px : w - px, py, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

// initWave('wave-left', 285, 245, 'left');
// initWave('wave-right', 195, 235, 'right');

//    <!-- Lexino ERA Section -->
