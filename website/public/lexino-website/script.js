// Theme Toggle
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

// --- Music and Preference Logic ---
const bgMusic = document.getElementById('bgMusic');
const musicToggle = document.getElementById('musicToggle');
let isMuted = false;

function toggleMusic() {
    if (!bgMusic || !musicToggle) return;
    if (isMuted) {
        bgMusic.muted = false;
        musicToggle.textContent = '🔊';
        isMuted = false;
        if (bgMusic.paused) {
            bgMusic.play().catch(e => console.log('Error playing music on unmute:', e));
        }
    } else {
        bgMusic.muted = true;
        musicToggle.textContent = '🔇';
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
    // 2. Set Volume & Mute Preferences
    if (bgMusic && musicToggle) {
        bgMusic.volume = 0.1;
        const savedMuted = localStorage.getItem('musicMuted');
        if (savedMuted === 'true') {
            isMuted = true;
            bgMusic.muted = true;
            musicToggle.textContent = '🔇';
        } else {
            isMuted = false;
            bgMusic.muted = false;
            musicToggle.textContent = '🔊';
            bgMusic.play().catch(error => {
                console.log('Autoplay was prevented by browser.');
                musicToggle.textContent = '🔇';
            });
        }
    }
    // 3. Initialize Particles
    createParticles();
});

// Page Navigation
function navigateToTry() {
    window.location.href = '/login?redirect_url=/chat';
}

function navigateToHome() {
    hideAllPages();
    const homePage = document.getElementById('home-page');
    if (homePage) homePage.style.display = 'block';
    window.scrollTo(0, 0);
}

function hideAllPages() {
    const homePage = document.getElementById('home-page');
    if (homePage) homePage.style.display = 'none';
    const tryPage = document.getElementById('try-page');
    if (tryPage) tryPage.style.display = 'none';
}

// Handle browser back/forward buttons
window.addEventListener('popstate', (event) => {
    navigateToHome();
});

// Newsletter subscription
function subscribeNewsletter(event) {
    event.preventDefault();
    const emailInput = document.getElementById('newsletter-email');
    const message = document.getElementById('newsletter-message');
    if (!emailInput || !message) return;
    
    const email = emailInput.value.trim();
    if (!email || !email.includes('@')) {
        message.textContent = '⚠️ Please enter a valid email address';
        message.className = 'newsletter-message error show';
        return;
    }
    
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
    if (!container) return;
    const particleCount = 40;
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
        if (href === '#' || this.onclick) {
            return;
        }
        
        e.preventDefault();
        const homePage = document.getElementById('home-page');
        if (homePage && homePage.style.display === 'none') {
            navigateToHome();
            setTimeout(() => {
                const target = document.querySelector(href);
                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } else {
            const target = document.querySelector(href);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// Intersection Observer for scrolling card animations
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

window.addEventListener('load', () => {
    document.querySelectorAll('.card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'all 0.6s ease';
        observer.observe(card);
    });
});
