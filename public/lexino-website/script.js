// Theme Toggle
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

// --- (Keep your other functions like toggleTheme, navigateToTry, etc. here) ---
// --- Music and Preference Logic ---
// Get elements globally
const bgMusic = document.getElementById('bgMusic');
const musicToggle = document.getElementById('musicToggle');
let isMuted = false; // This will be updated from localStorage
/**
 * Toggles the music mute state and saves the preference.
 * This function should be called from your HTML:
 * <button class="music-toggle" id="musicToggle" onclick="toggleMusic()">🔊</button>
 */
function toggleMusic() {
    if (isMuted) {
        // --- UNMUTE ---
        bgMusic.muted = false;
        musicToggle.textContent = '🔊';
        isMuted = false;
       
        // If it was paused (e.g., autoplay failed), play it now.
        if (bgMusic.paused) {
            bgMusic.play().catch(e => console.log('Error playing music on unmute:', e));
        }
    } else {
        // --- MUTE ---
        bgMusic.muted = true;
        musicToggle.textContent = '🔇';
        isMuted = true;
    }
   
    // Save the user's preference
    localStorage.setItem('musicMuted', isMuted.toString());
}
/**
 * Runs when the page content is loaded.
 * Sets up the theme and music state.
 */
window.addEventListener('DOMContentLoaded', () => {
    // 1. Load Saved Theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
    }
    // 2. Set Low Volume
    bgMusic.volume = 0.1; // Set low volume as requested
    // 3. Load Saved Mute Preference
    const savedMuted = localStorage.getItem('musicMuted');
    if (savedMuted === 'true') {
        isMuted = true;
        bgMusic.muted = true;
        musicToggle.textContent = '🔇';
    } else {
        // It's 'false' or null (never set), so we default to 'unmuted'
        isMuted = false;
        bgMusic.muted = false;
        musicToggle.textContent = '🔊';
       
        // 4. Attempt Autoplay (ONLY if user hasn't muted before)
        let playAttempt = bgMusic.play();
        if (playAttempt !== undefined) {
            playAttempt.then(() => {
                // Autoplay started! Icon is already '🔊'.
                console.log('Background music autoplay started.');
            }).catch(error => {
                // Autoplay was blocked by the browser.
                // Update the icon to 'off' so the UI is correct.
                console.log('Autoplay was prevented by browser.');
                musicToggle.textContent = '🔇';
            });
        }
    }
   
    // 5. Call your particle function (if it exists)
    // createParticles(); // Uncomment this if you have this function
});
// Page Navigation
// function navigateToTry() {
// //     hideAllPages();
// //     document.getElementById('try-page').style.display = 'block';
// //     window.scrollTo(0, 0);
// //     // Change URL path without reloading the page
// //     window.history.pushState({}, '', '/Lexino AI/index.html');
// window.location.href = './Lexino AI/index.html';
// }
function navigateToTry() {
    const isStaticPreview = window.location.port === '5500' || window.location.protocol === 'file:';
    const authBase = isStaticPreview ? 'http://localhost:3000' : '';
    window.location.href = `${authBase}/sign-in?redirect_url=/chat`;
}
 // Relative path, fast & instant



function navigateToHome() {
    hideAllPages();
    document.getElementById('home-page').style.display = 'block';
    window.scrollTo(0, 0);
}
function navigateToTerms() {
    hideAllPages();
    document.getElementById('terms-page').style.display = 'block';
    window.scrollTo(0, 0);
}
function navigateToPrivacy() {
    hideAllPages();
    document.getElementById('privacy-page').style.display = 'block';
    window.scrollTo(0, 0);
}
function hideAllPages() {
    document.getElementById('home-page').style.display = 'none';
    document.getElementById('try-page').style.display = 'none';
    document.getElementById('terms-page').style.display = 'none';
    document.getElementById('privacy-page').style.display = 'none';
}
// Handle browser back/forward buttons
window.addEventListener('popstate', (event) => {
    const path = window.location.pathname;
    if (path === '/try') {
        navigateToTry();
    } else if (path === '/terms') {
        navigateToTerms();
    } else if (path === '/privacy') {
        navigateToPrivacy();
    } else {
        navigateToHome();
    }
});
// Newsletter subscription
function subscribeNewsletter(event) {
    event.preventDefault();
    const emailInput = document.getElementById('newsletter-email');
    const message = document.getElementById('newsletter-message');
    const email = emailInput.value.trim();
    if (!email || !email.includes('@')) {
        message.textContent = '⚠️ Please enter a valid email address';
        message.className = 'newsletter-message error show';
        return;
    }
    // Simulate API call
    message.textContent = '✓ Successfully subscribed! Welcome to Lexino AI community.';
    message.className = 'newsletter-message success show';
    emailInput.value = '';
    setTimeout(() => {
        message.classList.remove('show');
    }, 5000);
}
// Create animated particles
function createParticles() {
    const container = document.querySelector('.bg-animation');
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
// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
       
        // Skip if it's a special link (terms, privacy, etc.)
        if (href === '#' || this.onclick) {
            return;
        }
       
        e.preventDefault();
       
        // First, make sure we're on the home page
        const homePage = document.getElementById('home-page');
        if (homePage.style.display === 'none') {
            navigateToHome();
            // Wait for page to show, then scroll
            setTimeout(() => {
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }, 100);
        } else {
            // Already on home page, just scroll
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
});
// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);
// Observe cards for animation
window.addEventListener('load', () => {
    document.querySelectorAll('.card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'all 0.6s ease';
        observer.observe(card);
    });
});
