        // ==========================================
        // LEXINO AI UNIFIED GLOBAL STATE MANAGER
        // Single Source of Truth & Inter-Tab Event Bus
        // ==========================================
        (function() {
            const listeners = {};
            const broadcast = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('lexino_global_state_channel') : null;
            let prefSyncTimeout = null;

            window.LexinoState = {
                data: {
                    user: { id: '', name: 'User', email: '', imageUrl: '', bio: '' },
                    subscription: { tier: 'FREE', status: 'inactive', expiresAt: null },
                    limits: { limit: 50, countToday: 0, cooldownUntil: null },
                    preferences: {
                        wallpaper: 'none',
                        theme: 'dark',
                        accentColor: 'cyan',
                        fontSize: 'medium',
                        density: 'default',
                        sidebarBehavior: 'fixed',
                        chatWidth: 'default',
                        messageStyle: 'bubble',
                        animationIntensity: 'normal',
                        selectedModel: 'llama-3.1-8b-instant'
                    }
                },

                get(path) {
                    if (!path) return this.data;
                    return path.split('.').reduce((acc, part) => acc && acc[part], this.data);
                },

                set(path, value, options = { broadcast: true }) {
                    const parts = path.split('.');
                    let current = this.data;
                    for (let i = 0; i < parts.length - 1; i++) {
                        if (!current[parts[i]]) current[parts[i]] = {};
                        current = current[parts[i]];
                    }
                    const oldVal = current[parts[parts.length - 1]];
                    current[parts[parts.length - 1]] = value;

                    this.notify(path, value, oldVal);

                    if (options.broadcast && broadcast) {
                        try {
                            broadcast.postMessage({ type: 'STATE_CHANGE', path, value });
                        } catch (_) {}
                    }
                },

                subscribe(path, callback) {
                    if (!listeners[path]) listeners[path] = [];
                    listeners[path].push(callback);
                    try { callback(this.get(path)); } catch (_) {}
                    return () => {
                        listeners[path] = (listeners[path] || []).filter(cb => cb !== callback);
                    };
                },

                notify(path, newVal, oldVal) {
                    if (listeners[path]) {
                        listeners[path].forEach(cb => {
                            try { cb(newVal, oldVal); } catch (e) { console.error('Subscriber error:', e); }
                        });
                    }
                    const rootKey = path.split('.')[0];
                    if (rootKey !== path && listeners[rootKey]) {
                        listeners[rootKey].forEach(cb => {
                            try { cb(this.get(rootKey)); } catch (e) { console.error('Subscriber error:', e); }
                        });
                    }
                },

                queueSavePreferences(prefs) {
                    clearTimeout(prefSyncTimeout);
                    prefSyncTimeout = setTimeout(() => {
                        fetch('/api/user/preferences', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ preferences: prefs }),
                        }).catch(() => {});
                    }, 1000);
                }
            };

            if (broadcast) {
                broadcast.onmessage = (event) => {
                    if (event.data?.type === 'STATE_CHANGE') {
                        window.LexinoState.set(event.data.path, event.data.value, { broadcast: false });
                    }
                };
            }

            // Also listen to storage events for cross-tab legacy fallback
            window.addEventListener('storage', (e) => {
                if (e.key === 'lexino_state_broadcast' && e.newValue) {
                    try {
                        const parsed = JSON.parse(e.newValue);
                        if (parsed?.type === 'SUBSCRIPTION_UPGRADED' && parsed.tier) {
                            window.LexinoState.set('subscription.tier', parsed.tier, { broadcast: false });
                            window.lexinoUserTier = parsed.tier;
                            if (typeof updateModelLocksUI === 'function') updateModelLocksUI(parsed.tier);
                            if (typeof syncProfileUI === 'function') syncProfileUI();
                        }
                    } catch (_) {}
                }
            });
        })();

        let isRecording = false;
        let uploadedFiles = [];

        function openExternal(url) {
            if (window.__TAURI__) {
                window.__TAURI__.core.invoke('open_in_browser', { url: url });
            } else {
                window.open(url, '_blank');
            }
        }
        window.openExternal = openExternal;
        window.currentAssistant = "default";
        let recognition = null;
        let recognitionActive = false;
        let voiceInitialText = "";
        let isTempMode = false;
        const CHAT_STORAGE_KEY = "lexino_chat_state_v1";
        const CHAT_SESSIONS_STORAGE_KEY = "lexino_chat_sessions_v2";
        const PROFILE_STORAGE_KEY = "lexino_profile_v1";
        const WALLPAPER_STORAGE_KEY = "lexino_wallpaper";
        const SIDEBAR_BRAND_IMAGE_KEY = "lexino_sidebar_brand_image_v1";
        const allowedWallpapers = ["none", "aurora", "neon", "mesh", "starfall", "particlefield", "sunset", "universe", "fallingstarfield", "nebulastars", "minimalspace", "galaxydrift", "interstellar"];
        const defaultProfile = {
            name: "User",
            email: "",
            bio: ""
        };
        let currentProfile = { ...defaultProfile };
        let currentWallpaper = "none";
        let chatSessions = [];
        let activeChatId = null;
        let previousNormalChatId = null;
        let chatSearchQuery = "";
        let currentConversation = [];
        let contextMenuChatId = null;
        let pendingDeleteChatId = null;
        let shareChatId = null;
        let mobileViewportFrame = null;
        let mobileComposerResizeObserver = null;
        let autoResizeFrame = null;
        let pendingAutoResizeTextarea = null;
        let chatScrollFrame = null;
        let searchRenderFrame = null;
        let readAloudUtterance = null;
        let readAloudSource = null;
        let readAloudMenuSource = null;
        let readAloudMenuButton = null;
        let lastMobileInputHeight = 0;
        let chatOptionsTouchTimer = null;
        const DEFAULT_SIDEBAR_BRAND_IMAGE = "/lexino-logo.png";
        const composerModels = {
            "llama-3.1-8b-instant": "Fast",
            "llama-3.3-70b-versatile": "Pro",
            "gpt-4o": "ChatGPT",
            "claude-3-5-sonnet": "Claude",
            "timetable-ai": "Timetable AI"
        };
        const composerThemeProfiles = {
            none: {
                accent: [16, 163, 127],
                accentStrong: [52, 211, 153],
                surface: [11, 11, 13],
                surfaceAlpha: 0.86,
                focusAlpha: 0.91,
                glowAlpha: 0.16,
                shadowAlpha: 0.52,
                blur: 22
            },
            aurora: {
                accent: [45, 212, 191],
                accentStrong: [125, 211, 252],
                surface: [5, 18, 24],
                surfaceAlpha: 0.72,
                focusAlpha: 0.82,
                glowAlpha: 0.24,
                shadowAlpha: 0.5,
                blur: 24
            },
            neon: {
                accent: [34, 211, 238],
                accentStrong: [14, 165, 233],
                surface: [2, 10, 20],
                surfaceAlpha: 0.66,
                focusAlpha: 0.78,
                glowAlpha: 0.3,
                shadowAlpha: 0.48,
                blur: 26
            },
            mesh: {
                accent: [56, 189, 248],
                accentStrong: [45, 212, 191],
                surface: [3, 11, 22],
                surfaceAlpha: 0.7,
                focusAlpha: 0.82,
                glowAlpha: 0.22,
                shadowAlpha: 0.5,
                blur: 24
            },
            starfall: {
                accent: [147, 197, 253],
                accentStrong: [254, 240, 138],
                surface: [5, 8, 18],
                surfaceAlpha: 0.68,
                focusAlpha: 0.8,
                glowAlpha: 0.18,
                shadowAlpha: 0.54,
                blur: 22
            },
            particlefield: {
                accent: [125, 211, 252],
                accentStrong: [45, 212, 191],
                surface: [2, 8, 18],
                surfaceAlpha: 0.64,
                focusAlpha: 0.76,
                glowAlpha: 0.28,
                shadowAlpha: 0.48,
                blur: 27
            },
            sunset: {
                accent: [251, 146, 60],
                accentStrong: [244, 114, 182],
                bubbleAccent: [248, 113, 113],
                bubbleAccentStrong: [244, 63, 94],
                surface: [22, 10, 12],
                surfaceAlpha: 0.72,
                focusAlpha: 0.84,
                glowAlpha: 0.24,
                shadowAlpha: 0.52,
                blur: 23
            },
            universe: {
                accent: [168, 85, 247],
                accentStrong: [96, 165, 250],
                surface: [9, 7, 24],
                surfaceAlpha: 0.7,
                focusAlpha: 0.82,
                glowAlpha: 0.26,
                shadowAlpha: 0.52,
                blur: 25
            }
        };
        

        async function getResponse(content, history = []) {
            if (!window.LexinoApi || typeof window.LexinoApi.getResponse !== "function") {
                throw new Error("API layer not loaded.");
            }
            return window.LexinoApi.getResponse(content, history);
        }

        const AIMessageRenderer = (function () {
            // Strict XSS Sanitizer for AI Message Content
            function sanitizeHtml(dirtyHtml) {
                if (typeof dirtyHtml !== 'string') return '';
                if (window.DOMPurify && typeof window.DOMPurify.sanitize === 'function') {
                    return window.DOMPurify.sanitize(dirtyHtml, {
                        ADD_ATTR: ['target', 'align'],
                        FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
                        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur']
                    });
                }
                
                try {
                    const doc = new DOMParser().parseFromString(dirtyHtml, 'text/html');
                    doc.querySelectorAll('script, style, iframe, object, embed, form').forEach(el => el.remove());
                    const allEls = doc.querySelectorAll('*');
                    for (let i = 0; i < allEls.length; i++) {
                        const el = allEls[i];
                        const attrs = Array.from(el.attributes);
                        for (let j = 0; j < attrs.length; j++) {
                            const attr = attrs[j];
                            if (attr.name.toLowerCase().startsWith('on') || String(attr.value).toLowerCase().includes('javascript:')) {
                                el.removeAttribute(attr.name);
                            }
                        }
                    }
                    return doc.body.innerHTML;
                } catch (e) {
                    return dirtyHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
                }
            }

            let customRenderer = null;
            function getRenderer() {
                if (customRenderer) return customRenderer;
                if (typeof marked === 'undefined') return null;

                const renderer = new marked.Renderer();
                const proto = Object.getPrototypeOf(renderer);

                // 1. Table Wrapper Renderer (Horizontally Scrollable & Styled)
                renderer.table = function (tokenOrHeader, body) {
                    let html = '';
                    if (typeof tokenOrHeader === 'object' && tokenOrHeader !== null && proto && proto.table) {
                        html = proto.table.call(this, tokenOrHeader);
                    } else {
                        html = '<table><thead>' + (tokenOrHeader || '') + '</thead><tbody>' + (body || '') + '</tbody></table>';
                    }
                    if (!html.includes('class="lexino-table"')) {
                        html = html.replace('<table', '<table class="lexino-table"');
                    }
                    return '<div class="table-wrapper lexino-table-wrapper">' + html + '</div>';
                };

                // 2. Table Cell Renderer (Alignment + Empty Cell Preservation)
                renderer.tablecell = function (tokenOrContent, flags) {
                    if (typeof tokenOrContent === 'object' && tokenOrContent !== null && proto && proto.tablecell) {
                        const cellHtml = proto.tablecell.call(this, tokenOrContent);
                        return cellHtml.replace(/>\s*</g, '>&nbsp;<');
                    }
                    const content = tokenOrContent;
                    const type = (flags && flags.header) ? 'th' : 'td';
                    const align = (flags && flags.align) ? ' align="' + flags.align + '" style="text-align: ' + flags.align + ';"' : '';
                    const safeContent = (!content || content.trim() === '') ? '&nbsp;' : content;
                    return '<' + type + align + '>' + safeContent + '</' + type + '>';
                };

                // 3. Fenced Code Block Renderer (Header + Language + Copy Button)
                renderer.code = function (tokenOrCode, infostring) {
                    let text = '';
                    let lang = 'text';
                    if (typeof tokenOrCode === 'object' && tokenOrCode !== null) {
                        text = tokenOrCode.text || '';
                        lang = (tokenOrCode.lang || '').match(/\S*/)[0] || 'text';
                    } else {
                        text = typeof tokenOrCode === 'string' ? tokenOrCode : '';
                        lang = (infostring || '').match(/\S*/)[0] || 'text';
                    }
                    const safeLang = (lang || 'code').toLowerCase();
                    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

                    return '<div class="code-block-wrapper">' +
                        '<div class="code-block-header">' +
                            '<span class="code-lang">' + safeLang + '</span>' +
                            '<button type="button" class="copy-code-btn" onclick="AIMessageRenderer.copyCode(this)">Copy</button>' +
                        '</div>' +
                        '<pre><code class="language-' + safeLang + '">' + escaped + '</code></pre>' +
                    '</div>';
                };

                customRenderer = renderer;
                return customRenderer;
            }

            function render(markdownText) {
                if (!markdownText || typeof markdownText !== 'string') return '';

                try {
                    if (typeof marked !== 'undefined') {
                        const renderer = getRenderer();
                        if (typeof marked.setOptions === 'function') {
                            marked.setOptions({
                                renderer: renderer || new marked.Renderer(),
                                gfm: true,
                                breaks: true,
                                pedantic: false,
                                headerIds: false,
                                mangle: false
                            });
                        }
                        const parsed = marked.parse(markdownText, { renderer: renderer });
                        return sanitizeHtml(parsed);
                    }
                } catch (err) {
                    console.warn('AIMessageRenderer parse warning (streaming mid-chunk):', err);
                }

                // Fallback escaping
                const tempDiv = document.createElement('div');
                tempDiv.textContent = markdownText;
                return tempDiv.innerHTML;
            }

            function copyCode(btn) {
                try {
                    const wrapper = btn.closest('.code-block-wrapper');
                    const codeEl = wrapper ? wrapper.querySelector('pre code') : null;
                    const text = codeEl ? codeEl.textContent : '';
                    if (!text) return;

                    navigator.clipboard.writeText(text).then(() => {
                        const orig = btn.textContent;
                        btn.textContent = 'Copied!';
                        btn.style.color = '#34d399';
                        setTimeout(() => {
                            btn.textContent = orig;
                            btn.style.color = '';
                        }, 2000);
                    }).catch(() => {
                        const ta = document.createElement('textarea');
                        ta.value = text;
                        ta.style.position = 'fixed';
                        ta.style.opacity = '0';
                        document.body.appendChild(ta);
                        ta.select();
                        document.execCommand('copy');
                        ta.remove();
                        btn.textContent = 'Copied!';
                        setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
                    });
                } catch (e) {
                    console.error('Copy error:', e);
                }
            }

            return {
                render: render,
                copyCode: copyCode,
                sanitize: sanitizeHtml
            };
        })();
        window.AIMessageRenderer = AIMessageRenderer;

        function renderMarkdown(text) {
            return AIMessageRenderer.render(text);
        }

        function applyAutoResize(textarea) {
            if (!textarea) return;
            const mobileMax = Math.min(window.innerHeight * 0.26, 120);
            const maxHeight = isMobileViewport() ? mobileMax : 180;
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
            scheduleMobileViewportSync();
        }

        function autoResize(textarea) {
            pendingAutoResizeTextarea = textarea;
            if (autoResizeFrame) return;

            autoResizeFrame = requestAnimationFrame(() => {
                autoResizeFrame = null;
                applyAutoResize(pendingAutoResizeTextarea);
                pendingAutoResizeTextarea = null;
            });
        }

        function isMobileViewport() {
            return window.matchMedia("(max-width: 768px)").matches;
        }

        function syncMobileInputHeight() {
            const inputArea = document.querySelector(".input-area");
            if (!inputArea) return;

            const height = Math.ceil(inputArea.getBoundingClientRect().height);
            if (height > 0 && height !== lastMobileInputHeight) {
                lastMobileInputHeight = height;
                document.documentElement.style.setProperty("--mobile-input-height", `${height}px`);
            }
        }

        function isMessagesNearBottom(messagesDiv, threshold = 140) {
            if (!messagesDiv) return true;
            const distance = messagesDiv.scrollHeight - messagesDiv.scrollTop - messagesDiv.clientHeight;
            return distance <= threshold;
        }

        function scrollMessagesToLatest(options = {}) {
            const { smooth = false, force = false, onlyIfNearBottom = false } = options;
            if (chatScrollFrame) return;

            chatScrollFrame = requestAnimationFrame(() => {
                chatScrollFrame = null;
                const messagesDiv = document.getElementById("chatMessages");
                if (!messagesDiv) return;
                if (onlyIfNearBottom && !force && !isMessagesNearBottom(messagesDiv)) return;

                const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                const behavior = smooth && !prefersReducedMotion ? "smooth" : "auto";
                messagesDiv.scrollTo({
                    top: messagesDiv.scrollHeight,
                    behavior
                });
            });
        }

        function syncMobileViewport() {
            const root = document.documentElement;
            const isMobile = isMobileViewport();
            document.body.classList.toggle("mobile-app-shell", isMobile);

            if (!isMobile) {
                root.style.setProperty("--app-height", "100dvh");
                root.style.setProperty("--mobile-bottom-offset", "0px");
                return;
            }

            const viewport = window.visualViewport;
            const height = viewport ? viewport.height : window.innerHeight;
            root.style.setProperty("--app-height", `${Math.round(height)}px`);
            root.style.setProperty("--mobile-bottom-offset", "0px");
            syncMobileInputHeight();
        }

        function scheduleMobileViewportSync() {
            if (mobileViewportFrame) {
                cancelAnimationFrame(mobileViewportFrame);
            }

            mobileViewportFrame = requestAnimationFrame(() => {
                mobileViewportFrame = null;
                syncMobileViewport();
            });
        }

        function initMobileAppShell() {
            syncMobileViewport();

            window.addEventListener("resize", scheduleMobileViewportSync, { passive: true });
            window.addEventListener("orientationchange", () => {
                setTimeout(scheduleMobileViewportSync, 120);
            }, { passive: true });

            if (window.visualViewport) {
                window.visualViewport.addEventListener("resize", scheduleMobileViewportSync, { passive: true });
                window.visualViewport.addEventListener("scroll", scheduleMobileViewportSync, { passive: true });
            }

            const inputArea = document.querySelector(".input-area");
            if (inputArea && "ResizeObserver" in window) {
                mobileComposerResizeObserver = new ResizeObserver(scheduleMobileViewportSync);
                mobileComposerResizeObserver.observe(inputArea);
            }

            const input = document.getElementById("messageInput");
            if (input) {
                input.addEventListener("focus", () => {
                    setTimeout(() => {
                        scheduleMobileViewportSync();
                        scrollMessagesToLatest({ smooth: true });
                    }, 80);
                });
                input.addEventListener("blur", () => {
                    setTimeout(scheduleMobileViewportSync, 80);
                });
            }
        }

        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            if (!sidebar) return;

            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('hidden');
            } else {
                sidebar.classList.toggle('collapsed');
            }
            updateSidebarUI();
        }

        function updateSidebarUI() {
            const sidebar = document.getElementById('sidebar');
            if (!sidebar) return;

            const collapsed = sidebar.classList.contains('collapsed') || sidebar.classList.contains('hidden');
            document.body.classList.toggle('sidebar-collapsed', collapsed);
        }

        function openSettings() {
            document.getElementById('settingsModal').classList.add('active');
            updateWallpaperOptions();
        }

        function closeSettings() {
            document.getElementById('settingsModal').classList.remove('active');
        }

        function applyWallpaper(name) {
            const wallpaperLayer = document.getElementById("animatedWallpaper");
            if (!wallpaperLayer) return;

            const safe = allowedWallpapers.includes(name) ? name : "none";
            wallpaperLayer.className = `animated-wallpaper wallpaper-${safe}`;
            document.body.classList.toggle("wallpaper-enabled", safe !== "none");
            currentWallpaper = safe;
            applyComposerTheme(safe);
        }

        function rgbaValue(rgb, alpha) {
            return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
        }

        function rgbTriplet(rgb) {
            return `${rgb[0]}, ${rgb[1]}, ${rgb[2]}`;
        }

        function mixRgb(from, to, amount) {
            return from.map((value, index) => Math.round(value + (to[index] - value) * amount));
        }

        function getLuminance(rgb) {
            const [r, g, b] = rgb.map((value) => {
                const channel = value / 255;
                return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
            });
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        }

        function getSaturationScore(rgb) {
            const max = Math.max(...rgb);
            const min = Math.min(...rgb);
            return max === 0 ? 0 : (max - min) / max;
        }

        function extractAccentFromPreview(name) {
            const preview = document.querySelector(`.preview-${name}`);
            if (!preview) return null;

            const background = getComputedStyle(preview).backgroundImage || "";
            const matches = [...background.matchAll(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/g)]
                .map((match) => [Number(match[1]), Number(match[2]), Number(match[3])]);

            if (!matches.length) return null;

            return matches.reduce((best, current) => {
                const currentScore = getSaturationScore(current) + getLuminance(current);
                const bestScore = getSaturationScore(best) + getLuminance(best);
                return currentScore > bestScore ? current : best;
            }, matches[0]);
        }

        function applyComposerTheme(name) {
            const base = composerThemeProfiles.none;
            const configured = composerThemeProfiles[name] || {};
            const extractedAccent = configured.accent || extractAccentFromPreview(name) || base.accent;
            const accentStrong = configured.accentStrong || extractedAccent;
            const surface = configured.surface || base.surface;
            const surfaceAlpha = configured.surfaceAlpha ?? base.surfaceAlpha;
            const focusAlpha = configured.focusAlpha ?? Math.min(surfaceAlpha + 0.1, 0.94);
            const glowAlpha = configured.glowAlpha ?? base.glowAlpha;
            const shadowAlpha = configured.shadowAlpha ?? base.shadowAlpha;
            const accentBrightness = getLuminance(extractedAccent);
            const blur = Math.min((configured.blur ?? base.blur) + (accentBrightness > 0.42 ? 1.5 : 0), 30);
            const lightSurface = getLuminance(surface) > 0.58;
            const bubbleAccent = configured.bubbleAccent || extractedAccent;
            const bubbleAccentStrong = configured.bubbleAccentStrong || accentStrong;
            const bubbleSurface = configured.bubbleSurface || mixRgb(surface, [255, 255, 255], lightSurface ? 0.05 : 0.1);
            const bubbleSurfaceAlpha = configured.bubbleSurfaceAlpha ?? (lightSurface ? 0.58 : Math.max(0.52, Math.min(0.76, surfaceAlpha - 0.07)));
            const bubbleTintAlpha = configured.bubbleTintAlpha ?? (lightSurface ? 0.08 : Math.min(0.2, 0.11 + glowAlpha * 0.26));
            const bubbleTintStrongAlpha = configured.bubbleTintStrongAlpha ?? Math.max(0.06, bubbleTintAlpha * 0.68);
            const bubbleFrostAlpha = configured.bubbleFrostAlpha ?? (lightSurface ? 0.54 : 0.075);
            const bubbleBorderAlpha = configured.bubbleBorderAlpha ?? (lightSurface ? 0.36 : 0.28);
            const bubbleBorderHoverAlpha = Math.min(0.58, bubbleBorderAlpha + 0.12);
            const bubbleGlowAlpha = configured.bubbleGlowAlpha ?? (lightSurface ? 0.12 : Math.min(0.32, 0.14 + glowAlpha * 0.42));
            const bubbleGlowHoverAlpha = Math.min(0.42, bubbleGlowAlpha + 0.08);
            const bubbleInnerAlpha = configured.bubbleInnerAlpha ?? (lightSurface ? 0.035 : 0.07);
            const bubbleInnerHoverAlpha = Math.min(0.14, bubbleInnerAlpha + 0.025);
            const bubbleBlur = Math.max(14, Math.round(blur * 0.72));
            const root = document.documentElement;

            root.style.setProperty("--composer-accent-rgb", rgbTriplet(extractedAccent));
            root.style.setProperty("--composer-accent-strong-rgb", rgbTriplet(accentStrong));
            root.style.setProperty("--composer-surface", rgbaValue(surface, surfaceAlpha));
            root.style.setProperty("--composer-surface-focus", rgbaValue(surface, focusAlpha));
            root.style.setProperty("--composer-border", rgbaValue(accentStrong, lightSurface ? 0.26 : 0.16));
            root.style.setProperty("--composer-border-focus", rgbaValue(accentStrong, lightSurface ? 0.52 : 0.42));
            root.style.setProperty("--composer-glow-alpha", String(glowAlpha));
            root.style.setProperty("--composer-shadow-alpha", String(shadowAlpha));
            root.style.setProperty("--composer-blur", `${blur}px`);
            root.style.setProperty("--composer-inner-alpha", String(lightSurface ? 0.025 : 0.05));
            root.style.setProperty("--composer-text", lightSurface ? "rgba(8, 11, 18, 0.94)" : "rgba(255, 255, 255, 0.94)");
            root.style.setProperty("--composer-placeholder", lightSurface ? "rgba(8, 11, 18, 0.48)" : "rgba(245, 245, 247, 0.46)");
            root.style.setProperty("--composer-icon", lightSurface ? "rgba(8, 11, 18, 0.66)" : rgbaValue(accentStrong, 0.78));
            root.style.setProperty("--composer-icon-hover", lightSurface ? "rgba(8, 11, 18, 0.94)" : "rgba(255, 255, 255, 0.96)");
            root.style.setProperty("--composer-muted-bg", lightSurface ? "rgba(255, 255, 255, 0.42)" : rgbaValue(extractedAccent, 0.07));
            root.style.setProperty("--composer-muted-hover", lightSurface ? "rgba(255, 255, 255, 0.64)" : rgbaValue(extractedAccent, 0.13));
            root.style.setProperty("--user-bubble-surface-rgb", rgbTriplet(bubbleSurface));
            root.style.setProperty("--user-bubble-surface-alpha", String(bubbleSurfaceAlpha));
            root.style.setProperty("--user-bubble-accent-rgb", rgbTriplet(bubbleAccent));
            root.style.setProperty("--user-bubble-accent-strong-rgb", rgbTriplet(bubbleAccentStrong));
            root.style.setProperty("--user-bubble-tint-alpha", String(bubbleTintAlpha));
            root.style.setProperty("--user-bubble-tint-strong-alpha", String(bubbleTintStrongAlpha));
            root.style.setProperty("--user-bubble-frost-alpha", String(bubbleFrostAlpha));
            root.style.setProperty("--user-bubble-border-alpha", String(bubbleBorderAlpha));
            root.style.setProperty("--user-bubble-border-hover-alpha", String(bubbleBorderHoverAlpha));
            root.style.setProperty("--user-bubble-glow-alpha", String(bubbleGlowAlpha));
            root.style.setProperty("--user-bubble-glow-hover-alpha", String(bubbleGlowHoverAlpha));
            root.style.setProperty("--user-bubble-inner-alpha", String(bubbleInnerAlpha));
            root.style.setProperty("--user-bubble-inner-hover-alpha", String(bubbleInnerHoverAlpha));
            root.style.setProperty("--user-bubble-blur", `${bubbleBlur}px`);
            root.style.setProperty("--user-bubble-text", lightSurface ? "rgba(8, 11, 18, 0.92)" : "rgba(248, 252, 255, 0.96)");

            // Dynamically synchronize the general application theme variables with the selected wallpaper
            if (name === "none") {
                root.style.setProperty("--bg-primary", "#0d0d0d");
                root.style.setProperty("--bg-secondary", "#1a1a1a");
                root.style.setProperty("--bg-secondary-solid", "#1a1a1a");
                root.style.setProperty("--bg-tertiary", "#262626");
                root.style.setProperty("--border-color", "#333333");
                root.style.setProperty("--accent-primary", "#10a37f");
                root.style.setProperty("--accent-hover", "#0d8c6d");
            } else {
                root.style.setProperty("--bg-primary", rgbaValue(surface, 0.92));
                root.style.setProperty("--bg-secondary", rgbaValue(surface, 0.65));
                const solidSecondary = rgbaValue(surface, 1);
                root.style.setProperty("--bg-secondary-solid", solidSecondary);
                root.style.setProperty("--bg-tertiary", rgbaValue(surface, 0.82));
                root.style.setProperty("--border-color", rgbaValue(accentStrong, 0.22));
                root.style.setProperty("--accent-primary", rgbaValue(extractedAccent, 1));
                root.style.setProperty("--accent-hover", rgbaValue(accentStrong, 1));
            }
        }

        function updateWallpaperOptions() {
            const currentTier = window.lexinoUserTier || "FREE";
            document.querySelectorAll(".wallpaper-option").forEach((option) => {
                const wallpaperName = option.dataset.wallpaper;
                if (wallpaperName) {
                    option.classList.toggle("active", wallpaperName === currentWallpaper);
                    const allowed = isWallpaperAllowedForTier(wallpaperName, currentTier);
                    option.classList.toggle("locked", !allowed);
                }
            });
        }

        let cooldownIntervalId = null;
        
        function isWallpaperAllowedForTier(name, tier) {
            if (!tier) tier = "FREE";
            if (tier === "PRO" || tier === "STUDENT") return true;
            
            const freeAllowed = ["none", "starfall", "minimalspace", "sunset", "fallingstarfield", "mesh"];
            return freeAllowed.includes(name);
        }

        function triggerCooldownTimer(cooldownDate) {
            const cooldownContainer = document.getElementById("cooldownContainer");
            const inputWrapper = document.getElementById("inputWrapper");
            const cooldownTimer = document.getElementById("cooldownTimer");
            const cooldownProgressFill = document.getElementById("cooldownProgressFill");
            
            if (!cooldownContainer || !inputWrapper || !cooldownTimer) return;
            
            const targetTime = new Date(cooldownDate).getTime();
            const totalDuration = 60 * 60 * 1000; // 1 hour max standard
            
            if (cooldownIntervalId) clearInterval(cooldownIntervalId);
            
            cooldownContainer.style.display = "flex";
            inputWrapper.style.display = "none";
            
            const micBtn = document.getElementById("micBtn");
            if (micBtn) micBtn.disabled = true;
            
            cooldownIntervalId = setInterval(() => {
                const now = Date.now();
                const timeLeft = targetTime - now;
                
                if (timeLeft <= 0) {
                    clearInterval(cooldownIntervalId);
                    cooldownIntervalId = null;
                    cooldownContainer.style.display = "none";
                    inputWrapper.style.display = "block";
                    window.lexinoCooldownUntil = null;
                    
                    localStorage.removeItem("lexino_local_cooldown_until");
                    localStorage.setItem("lexino_local_msg_count", "0");
                    
                    const micBtn = document.getElementById("micBtn");
                    if (micBtn) micBtn.disabled = false;
                    return;
                }
                
                const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
                
                cooldownTimer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                
                const elapsedPercent = Math.max(0, Math.min(100, (timeLeft / totalDuration) * 100));
                if (cooldownProgressFill) {
                    cooldownProgressFill.style.transform = `scaleX(${elapsedPercent / 100})`;
                }
            }, 1000);
        }

        function checkClientSideRateLimit() {
            if (window.lexinoCooldownUntil && new Date(window.lexinoCooldownUntil) > new Date()) {
                triggerCooldownTimer(new Date(window.lexinoCooldownUntil));
                return true;
            }
            
            const localCooldown = localStorage.getItem("lexino_local_cooldown_until");
            if (localCooldown && new Date(localCooldown) > new Date()) {
                triggerCooldownTimer(new Date(localCooldown));
                return true;
            }
            
            const currentTier = window.lexinoUserTier || "FREE";
            if (currentTier === "PRO") return false;
            
            const limit = currentTier === "STUDENT" ? 300 : 50;
            
            const now = new Date();
            const rawLastMsgAt = localStorage.getItem("lexino_local_last_msg_at");
            const countStr = localStorage.getItem("lexino_local_msg_count") || "0";
            let msgCount = parseInt(countStr, 10);
            
            if (rawLastMsgAt) {
                const lastMsgAt = new Date(rawLastMsgAt);
                const isDifferentDay = lastMsgAt.getUTCFullYear() !== now.getUTCFullYear() ||
                                       lastMsgAt.getUTCMonth() !== now.getUTCMonth() ||
                                       lastMsgAt.getUTCDate() !== now.getUTCDate();
                if (isDifferentDay) {
                    msgCount = 0;
                    localStorage.setItem("lexino_local_msg_count", "0");
                }
            }
            
            if (msgCount >= limit) {
                const duration = currentTier === "STUDENT" ? 30 * 60 * 1000 : 60 * 60 * 1000;
                const cooldownEnd = new Date(Date.now() + duration);
                localStorage.setItem("lexino_local_cooldown_until", cooldownEnd.toISOString());
                triggerCooldownTimer(cooldownEnd);
                return true;
            }
            
            return false;
        }

        function incrementClientSideMsgCount() {
            const countStr = localStorage.getItem("lexino_local_msg_count") || "0";
            const msgCount = parseInt(countStr, 10) + 1;
            localStorage.setItem("lexino_local_msg_count", msgCount.toString());
            localStorage.setItem("lexino_local_last_msg_at", new Date().toISOString());
        }

        function setWallpaper(name) {
            const currentTier = window.lexinoUserTier || "FREE";
            if (!isWallpaperAllowedForTier(name, currentTier)) {
                window.showPremiumLockModal('theme-' + name);
                return;
            }
            const safe = allowedWallpapers.includes(name) ? name : "none";
            applyWallpaper(safe);
            localStorage.setItem(WALLPAPER_STORAGE_KEY, safe);
            if (window.LexinoState) {
                window.LexinoState.set('preferences.wallpaper', safe);
                window.LexinoState.queueSavePreferences({ wallpaper: safe });
            }
            updateWallpaperOptions();
        }

        function loadWallpaper() {
            const saved = localStorage.getItem(WALLPAPER_STORAGE_KEY) || "none";
            const currentTier = window.lexinoUserTier || "FREE";
            const validated = isWallpaperAllowedForTier(saved, currentTier) ? saved : "none";
            applyWallpaper(validated);
            updateWallpaperOptions();
        }

        window.changeTheme = function(themeName) {
            document.documentElement.setAttribute('data-theme', themeName);
            document.body.setAttribute('data-theme', themeName);
            localStorage.setItem('theme', themeName);
            
            const darkBtn = document.getElementById('themeBtnDark');
            const lightBtn = document.getElementById('themeBtnLight');
            if (darkBtn && lightBtn) {
                darkBtn.classList.toggle('active', themeName === 'dark');
                darkBtn.style.borderColor = themeName === 'dark' ? 'rgba(0, 240, 255, 0.4)' : 'rgba(255, 255, 255, 0.08)';
                darkBtn.style.color = themeName === 'dark' ? '#00f0ff' : 'white';
                
                lightBtn.classList.toggle('active', themeName === 'light');
                lightBtn.style.borderColor = themeName === 'light' ? 'rgba(0, 240, 255, 0.4)' : 'rgba(255, 255, 255, 0.08)';
                lightBtn.style.color = themeName === 'light' ? '#00f0ff' : 'white';
            }
        };

        window.initTheme = function() {
            const savedTheme = localStorage.getItem('theme') || 'dark';
            window.changeTheme(savedTheme);
        };

        // Tab switching in Personalization Hub
        window.switchHubTab = function(tabId) {
            document.querySelectorAll('.hub-nav-btn').forEach(btn => {
                btn.classList.toggle('active', btn.id === 'hub-tab-' + tabId);
            });
            document.querySelectorAll('.hub-tab-panel').forEach(panel => {
                panel.classList.toggle('active', panel.id === 'hub-panel-' + tabId);
            });
        };

        // Theme Search & Filter Logic
        let currentThemeFilter = 'all';
        window.setThemeFilter = function(filter) {
            currentThemeFilter = filter;
            document.querySelectorAll('.theme-filter-btn').forEach(btn => {
                btn.classList.toggle('active', btn.id === 'filter-btn-' + filter);
            });
            filterThemes();
        };

        window.filterThemes = function() {
            const searchVal = (document.getElementById('themeSearchInput')?.value || '').toLowerCase().trim();
            const currentTier = window.lexinoUserTier || "FREE";
            
            let visibleFree = 0;
            let visiblePremium = 0;

            document.querySelectorAll('.wallpaper-option').forEach(card => {
                if (card.classList.contains('coming-soon')) return;
                
                const wName = (card.querySelector('.wallpaper-name')?.textContent || '').toLowerCase();
                const wDesc = (card.querySelector('.wallpaper-desc')?.textContent || '').toLowerCase();
                const category = card.dataset.category || 'free';
                const wallpaperName = card.dataset.wallpaper;
                
                const matchesSearch = wName.includes(searchVal) || wDesc.includes(searchVal);
                
                let matchesFilter = true;
                if (currentThemeFilter === 'free') {
                    matchesFilter = isWallpaperAllowedForTier(wallpaperName, currentTier);
                } else if (currentThemeFilter === 'premium') {
                    matchesFilter = !isWallpaperAllowedForTier(wallpaperName, currentTier);
                }
                
                const visible = matchesSearch && matchesFilter;
                card.style.display = visible ? 'flex' : 'none';
                
                if (visible) {
                    if (category === 'free') visibleFree++;
                    else visiblePremium++;
                }
            });

            const freeHeader = document.getElementById('free-themes-header');
            const premiumHeader = document.getElementById('premium-themes-header');
            if (freeHeader) freeHeader.style.display = (visibleFree > 0) ? 'block' : 'none';
            if (premiumHeader) premiumHeader.style.display = (visiblePremium > 0) ? 'block' : 'none';
        };

        // Preference Selectors: Accent, Density, Font Size, Sidebar, Chat Width, Message Style
        window.setAccentColor = function(color) {
            document.documentElement.setAttribute('data-accent', color);
            localStorage.setItem('lexino_accent_color', color);
            
            document.querySelectorAll('.accent-color-option').forEach(opt => {
                opt.classList.toggle('active', opt.dataset.accent === color);
            });
        };

        window.setDensity = function(density) {
            document.documentElement.setAttribute('data-density', density);
            localStorage.setItem('lexino_density', density);
            
            document.querySelectorAll('[id^="density-"]').forEach(opt => {
                opt.classList.toggle('active', opt.id === 'density-' + density);
            });
        };

        window.setFontSize = function(size) {
            document.documentElement.setAttribute('data-font-size', size);
            localStorage.setItem('lexino_font_size', size);
            
            document.querySelectorAll('[id^="font-"]').forEach(opt => {
                opt.classList.toggle('active', opt.id === 'font-' + size);
            });
        };

        window.setSidebarBehavior = function(behavior) {
            document.documentElement.setAttribute('data-sidebar-behavior', behavior);
            localStorage.setItem('lexino_sidebar_behavior', behavior);
            
            document.querySelectorAll('[id^="sidebar-"]').forEach(opt => {
                opt.classList.toggle('active', opt.id === 'sidebar-' + behavior);
            });
            
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                if (behavior === 'collapsed') {
                    sidebar.classList.add('collapsed');
                } else {
                    sidebar.classList.remove('collapsed');
                }
                updateSidebarUI();
            }
        };

        window.setChatWidth = function(width) {
            document.documentElement.setAttribute('data-chat-width', width);
            localStorage.setItem('lexino_chat_width', width);
            
            document.querySelectorAll('[id^="width-"]').forEach(opt => {
                opt.classList.toggle('active', opt.id === 'width-' + width);
            });
        };

        window.setMessageStyle = function(style) {
            document.documentElement.setAttribute('data-message-style', style);
            localStorage.setItem('lexino_message_style', style);
            
            document.querySelectorAll('[id^="msg-style-"]').forEach(opt => {
                opt.classList.toggle('active', opt.id === 'msg-style-' + style);
            });
        };

        window.setAnimationIntensity = function(intensity) {
            document.documentElement.setAttribute('data-animation-intensity', intensity);
            localStorage.setItem('lexino_animation_intensity', intensity);
            
            document.querySelectorAll('[id^="anim-"]').forEach(opt => {
                opt.classList.toggle('active', opt.id === 'anim-' + intensity);
            });
        };

        window.toggleBackgroundEffect = function(effect) {
            const checkbox = document.getElementById('toggle-' + effect);
            if (!checkbox) return;
            
            const value = checkbox.checked ? 'enabled' : 'disabled';
            document.documentElement.setAttribute('data-' + effect, value);
            localStorage.setItem('lexino_effect_' + effect.replace('-', '_'), value);
        };

        window.toggleAccessibilitySetting = function(setting) {
            const checkbox = document.getElementById('toggle-' + setting);
            if (!checkbox) return;
            
            const value = checkbox.checked ? 'enabled' : 'disabled';
            document.documentElement.setAttribute('data-' + setting, value);
            localStorage.setItem('lexino_access_' + setting.replace('-', '_'), value);
        };

        // Load all Preferences from LexinoState / localStorage
        window.loadHubPreferences = function() {
            const serverPrefs = window.LexinoState ? window.LexinoState.get('preferences') : {};

            const savedAccent = serverPrefs?.accentColor || localStorage.getItem('lexino_accent_color') || 'cyan';
            window.setAccentColor(savedAccent);
            
            const savedDensity = serverPrefs?.density || localStorage.getItem('lexino_density') || 'default';
            window.setDensity(savedDensity);
            
            const savedFontSize = serverPrefs?.fontSize || localStorage.getItem('lexino_font_size') || 'medium';
            window.setFontSize(savedFontSize);
            
            const savedSidebar = serverPrefs?.sidebarBehavior || localStorage.getItem('lexino_sidebar_behavior') || 'fixed';
            window.setSidebarBehavior(savedSidebar);
            
            const savedWidth = serverPrefs?.chatWidth || localStorage.getItem('lexino_chat_width') || 'default';
            window.setChatWidth(savedWidth);
            
            const savedMsgStyle = serverPrefs?.messageStyle || localStorage.getItem('lexino_message_style') || 'bubble';
            window.setMessageStyle(savedMsgStyle);
            
            const savedAnim = serverPrefs?.animationIntensity || localStorage.getItem('lexino_animation_intensity') || 'normal';
            window.setAnimationIntensity(savedAnim);
            
            const savedGlowOrbs = serverPrefs?.glowOrbs || localStorage.getItem('lexino_effect_glow_orbs') || 'enabled';
            const glowBox = document.getElementById('toggle-glow-orbs');
            if (glowBox) {
                glowBox.checked = (savedGlowOrbs === 'enabled');
                document.documentElement.setAttribute('data-glow-orbs', savedGlowOrbs);
            }
            
            const savedGrid = serverPrefs?.gridOverlay || localStorage.getItem('lexino_effect_grid_overlay') || 'enabled';
            const gridBox = document.getElementById('toggle-grid-overlay');
            if (gridBox) {
                gridBox.checked = (savedGrid === 'enabled');
                document.documentElement.setAttribute('data-grid-overlay', savedGrid);
            }
            
            const savedHC = serverPrefs?.highContrast || localStorage.getItem('lexino_access_high_contrast') || 'disabled';
            const hcBox = document.getElementById('toggle-high-contrast');
            if (hcBox) {
                hcBox.checked = (savedHC === 'enabled');
                document.documentElement.setAttribute('data-high-contrast', savedHC);
            }
            
            const savedDys = serverPrefs?.dyslexicFont || localStorage.getItem('lexino_access_dyslexic_font') || 'disabled';
            const dysBox = document.getElementById('toggle-dyslexic-font');
            if (dysBox) {
                dysBox.checked = (savedDys === 'enabled');
                document.documentElement.setAttribute('data-dyslexic-font', savedDys);
            }
            
            const savedRM = serverPrefs?.reducedMotion || localStorage.getItem('lexino_access_reduced_motion') || 'disabled';
            const rmBox = document.getElementById('toggle-reduced-motion');
            if (rmBox) {
                rmBox.checked = (savedRM === 'enabled');
                document.documentElement.setAttribute('data-reduced-motion', savedRM);
            }
        };

        function updateSidebarBrandImage(src) {
            const img = document.getElementById("sidebarBrandImage");
            const placeholder = document.getElementById("sidebarBrandPlaceholder");
            if (!img || !placeholder) return;

            if (src && src.trim()) {
                img.src = src;
                img.style.display = "block";
                placeholder.style.display = "none";
            } else {
                img.removeAttribute("src");
                img.style.display = "none";
                placeholder.style.display = "inline";
            }
        }

        function loadSidebarBrandImage() {
            localStorage.setItem(SIDEBAR_BRAND_IMAGE_KEY, DEFAULT_SIDEBAR_BRAND_IMAGE);
            updateSidebarBrandImage(DEFAULT_SIDEBAR_BRAND_IMAGE);
        }

        function triggerSidebarBrandImage() {
            const input = document.getElementById("sidebarBrandInput");
            if (input) {
                input.click();
            }
        }

        function handleSidebarBrandUpload(event) {
            const file = event?.target?.files?.[0];
            if (!file) return;

            if (!file.type.startsWith("image/")) {
                alert("Please select an image file.");
                event.target.value = "";
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = String(reader.result || "");
                localStorage.setItem(SIDEBAR_BRAND_IMAGE_KEY, dataUrl);
                updateSidebarBrandImage(dataUrl);
            };
            reader.readAsDataURL(file);
            event.target.value = "";
        }

        function getUserInitial() {
            const name = (currentProfile.name || "").trim();
            return name ? name.charAt(0).toUpperCase() : "U";
        }

        function getUserAvatarMarkup() {
            if (currentProfile.imageUrl) {
                return `<img src="${currentProfile.imageUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" />`;
            }
            return getUserInitial();
        }

        function syncProfileUI() {
            const nameEl = document.getElementById("headerProfileName");
            const avatarEl = document.querySelector(".header-avatar");
            const railInitial = document.getElementById("railProfileInitial");
            const sidebarAccountName = document.getElementById("sidebarAccountName");
            const sidebarAccountHandle = document.getElementById("sidebarAccountHandle");
            const sidebarAccountInitial = document.getElementById("sidebarAccountInitial");
            const safeName = (currentProfile.name || defaultProfile.name).trim() || defaultProfile.name;
            const initial = safeName.charAt(0).toUpperCase();

            if (nameEl) {
                nameEl.textContent = safeName;
                nameEl.title = safeName;
            }

            if (avatarEl) {
                if (currentProfile.imageUrl) {
                    avatarEl.innerHTML = `<img src="${currentProfile.imageUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" alt="${safeName}" />`;
                } else {
                    avatarEl.textContent = initial;
                }
                avatarEl.title = safeName;
            }

            if (railInitial) {
                if (currentProfile.imageUrl) {
                    railInitial.innerHTML = `<img src="${currentProfile.imageUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" alt="${safeName}" />`;
                } else {
                    const letters = safeName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("");
                    railInitial.textContent = letters || initial;
                }
            }

            if (sidebarAccountInitial) {
                if (currentProfile.imageUrl) {
                    sidebarAccountInitial.innerHTML = `<img src="${currentProfile.imageUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" alt="${safeName}" />`;
                } else {
                    sidebarAccountInitial.textContent = initial;
                }
            }

            if (sidebarAccountName) {
                sidebarAccountName.textContent = safeName;
                sidebarAccountName.title = safeName;
            }

            if (sidebarAccountHandle) {
                const tier = (window.lexinoUserTier || "FREE").toUpperCase();
                let planName = "Free Plan";
                if (tier === "PRO") {
                    planName = "Pro Plan";
                } else if (tier === "STUDENT") {
                    planName = "Student Plan";
                }
                sidebarAccountHandle.textContent = planName;
                sidebarAccountHandle.title = planName;
            }
            updateModelLocksUI(window.lexinoUserTier || "FREE");
        }

        function updateModelLocksUI(tier) {
            const options = document.querySelectorAll('.model-option');
            options.forEach((option) => {
                const onclickAttr = option.getAttribute('onclick') || '';
                
                let spanEl = option.querySelector('.lock-label');
                if (spanEl) spanEl.remove();

                let isLocked = false;
                if (onclickAttr.includes('gpt-4o') && tier === 'FREE') {
                    isLocked = true;
                } else if (onclickAttr.includes('claude-3-5-sonnet') && (tier === 'FREE' || tier === 'STUDENT')) {
                    isLocked = true;
                }

                if (isLocked) {
                    option.classList.add('premium-locked-option');
                    option.style.position = 'relative';
                    option.style.paddingRight = '32px';
                    const lockLabel = document.createElement('span');
                    lockLabel.className = 'lock-label';
                    lockLabel.innerHTML = '🔒';
                    lockLabel.style.position = 'absolute';
                    lockLabel.style.right = '12px';
                    lockLabel.style.top = '50%';
                    lockLabel.style.transform = 'translateY(-50%)';
                    lockLabel.style.fontSize = '12px';
                    lockLabel.style.opacity = '0.65';
                    option.appendChild(lockLabel);
                } else {
                    option.classList.remove('premium-locked-option');
                    option.style.position = '';
                    option.style.paddingRight = '';
                }
            });
        }

        function loadProfile() {
            let clerkEl = document.getElementById("clerk-user-data") || document.getElementById("nextjs-user-data");
            if (clerkEl) {
                try {
                    let data = null;
                    if (clerkEl.tagName === "SCRIPT") {
                        data = JSON.parse(clerkEl.textContent || "{}");
                    } else if (clerkEl.hasAttribute("data-user")) {
                        data = JSON.parse(clerkEl.getAttribute("data-user") || "{}");
                    }
                    if (data && (data.name || data.email || data.id)) {
                        const safeName = (data.name || "").trim() || "User";
                        currentProfile = {
                            id: data.id || "",
                            name: safeName,
                            email: data.email || "",
                            bio: "",
                            imageUrl: data.imageUrl || ""
                        };
                        window.lexinoUserTier = data.tier || "FREE";
                        window.lexinoCooldownUntil = data.cooldownUntil || null;
                        window.lexinoSubscriptionExpiresAt = data.subscriptionExpiresAt || null;
                        
                        // Seed global state store
                        if (window.LexinoState) {
                            window.LexinoState.set('user', currentProfile, { broadcast: false });
                            window.LexinoState.set('subscription', {
                                tier: window.lexinoUserTier,
                                status: data.subscriptionStatus || 'inactive',
                                expiresAt: window.lexinoSubscriptionExpiresAt
                            }, { broadcast: false });
                            window.LexinoState.set('limits', {
                                limit: data.limit || (window.lexinoUserTier === 'PRO' ? 1500 : (window.lexinoUserTier === 'STUDENT' ? 300 : 50)),
                                countToday: data.messageCountToday || 0,
                                cooldownUntil: data.cooldownUntil || null
                            }, { broadcast: false });
                            if (data.preferences) {
                                window.LexinoState.set('preferences', data.preferences, { broadcast: false });
                            }
                        }

                        // If subscription is expired, auto-downgrade client state to FREE
                        if (window.lexinoSubscriptionExpiresAt && new Date(window.lexinoSubscriptionExpiresAt) <= new Date()) {
                            window.lexinoUserTier = "FREE";
                            if (window.LexinoState) {
                                window.LexinoState.set('subscription.tier', 'FREE', { broadcast: false });
                                window.LexinoState.set('subscription.status', 'expired', { broadcast: false });
                            }
                        }
                        
                        try {
                            localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(currentProfile));
                        } catch (_) {}
                        
                        if (window.lexinoCooldownUntil && new Date(window.lexinoCooldownUntil) > new Date()) {
                            triggerCooldownTimer(new Date(window.lexinoCooldownUntil));
                        } else {
                            checkClientSideRateLimit();
                        }
                        
                        syncProfileUI();

                        // Asynchronously verify authoritative state from database in background
                        fetch('/api/auth/sync', { method: 'POST' })
                            .then(r => r.json())
                            .then(syncRes => {
                                if (syncRes?.user) {
                                    const freshUser = syncRes.user;
                                    const freshTier = (freshUser.tier || "FREE").toUpperCase();
                                    const freshExpiresAt = freshUser.subscriptionExpiresAt || null;
                                    
                                    window.lexinoSubscriptionExpiresAt = freshExpiresAt;
                                    window.lexinoUserTier = freshTier;
                                    window.lexinoCooldownUntil = freshUser.cooldownUntil || null;

                                    if (window.LexinoState) {
                                        window.LexinoState.set('subscription.tier', freshTier, { broadcast: false });
                                        window.LexinoState.set('subscription.status', freshUser.subscriptionStatus || 'inactive', { broadcast: false });
                                        window.LexinoState.set('subscription.expiresAt', freshExpiresAt, { broadcast: false });
                                        window.LexinoState.set('limits', {
                                            limit: freshUser.limit || (freshTier === 'PRO' ? 1500 : (freshTier === 'STUDENT' ? 300 : 50)),
                                            countToday: freshUser.messageCountToday || 0,
                                            cooldownUntil: freshUser.cooldownUntil || null
                                        }, { broadcast: false });
                                        
                                        if (freshUser.preferences && Object.keys(freshUser.preferences).length > 0) {
                                            // Apply cloud-saved wallpaper or theme if not already customized locally
                                            if (freshUser.preferences.wallpaper && typeof applyWallpaper === 'function') {
                                                applyWallpaper(freshUser.preferences.wallpaper);
                                            }
                                        }
                                    }

                                    updateModelLocksUI(freshTier);
                                    syncProfileUI();
                                }
                            })
                            .catch(() => {});

                        return;
                    }
                } catch (e) {
                    console.error("Failed to load user profile details:", e);
                }
            }
            
            // Check client rate limit as a local fallback
            checkClientSideRateLimit();

            const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
            if (!raw) {
                currentProfile = { ...defaultProfile };
                syncProfileUI();
                return;
            }

            try {
                const parsed = JSON.parse(raw);
                currentProfile = {
                    name: (parsed.name || defaultProfile.name).toString().trim() || defaultProfile.name,
                    email: (parsed.email || "").toString().trim(),
                    bio: (parsed.bio || "").toString().trim(),
                    imageUrl: (parsed.imageUrl || "").toString().trim()
                };
            } catch (error) {
                console.error("Failed to load profile:", error);
                currentProfile = { ...defaultProfile };
            }

            syncProfileUI();
        }

        function openProfileModal() {
            window.location.href = '/account';
        }

        function closeProfileModal() {
            const modal = document.getElementById("profileModal");
            if (modal) {
                modal.classList.remove("active");
            }
        }

        function saveProfile() {
            const nameInput = document.getElementById("profileNameInput");
            const emailInput = document.getElementById("profileEmailInput");
            const bioInput = document.getElementById("profileBioInput");

            const name = (nameInput?.value || "").trim() || defaultProfile.name;
            const email = (emailInput?.value || "").trim();
            const bio = (bioInput?.value || "").trim();

            currentProfile = { name, email, bio };
            localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(currentProfile));
            syncProfileUI();
            closeProfileModal();
        }

        function getEmptyStateMarkup() {
            if (window.currentAssistant === "timetable-lai") {
                return `
                    <div class="empty-state timetable-lai-empty" id="emptyState">
                        <div class="lai-badge" style="background: rgba(251, 191, 36, 0.1); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.3); padding: 6px 14px; border-radius: 20px; font-size: 0.78rem; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; margin-bottom: 18px; letter-spacing: 0.5px; text-transform: uppercase;">
                            <img src="/assets/logos/timetable-lai-logo.svg" alt="Timetable LAI" width="16" height="16" style="width: 16px; height: 16px; object-fit: contain; vertical-align: middle; border-radius: 4px;" /> Specialized Mentor Mode
                        </div>
                        <div style="display: flex; justify-content: center; align-items: center; gap: 14px; margin-bottom: 12px;">
                            <img src="/assets/logos/timetable-lai-logo.svg" alt="Timetable LAI logo" width="56" height="56" style="width: 56px; height: 56px; object-fit: contain; border-radius: 14px; filter: drop-shadow(0 0 18px rgba(251, 191, 36, 0.4)); flex-shrink: 0;" />
                            <h2 style="color: #fbbf24; text-shadow: 0 0 15px rgba(251, 191, 36, 0.35); font-family: 'Orbitron', sans-serif; font-size: 2.2rem; font-weight: 800; letter-spacing: 1px; margin: 0;">Timetable LAI</h2>
                        </div>
                        <p style="color: #94a3b8; font-size: 1rem; max-width: 500px; margin: 0 auto 25px; line-height: 1.5; font-weight: 500;">Your AI Academic Strategist & Disciplined Life Architect. Powered by Llama 3.3 (70B) with 45+ years of strategic mentoring experience.</p>
                        <div class="suggestion-chips">
                            <div class="chip" onclick="useSuggestion('Build SSC CGL strategy')" style="border: 1px solid rgba(251, 191, 36, 0.2); background: rgba(251, 191, 36, 0.03); color: #f8fafc;">
                                Build SSC CGL strategy
                            </div>
                            <div class="chip" onclick="useSuggestion('Create a 16-hour discipline plan')" style="border: 1px solid rgba(251, 191, 36, 0.2); background: rgba(251, 191, 36, 0.03); color: #f8fafc;">
                                Create a 16-hour discipline plan
                            </div>
                            <div class="chip" onclick="useSuggestion('Fix inconsistent study habits')" style="border: 1px solid rgba(251, 191, 36, 0.2); background: rgba(251, 191, 36, 0.03); color: #f8fafc;">
                                Fix inconsistent study habits
                            </div>
                            <div class="chip" onclick="useSuggestion('Optimize revision cycles')" style="border: 1px solid rgba(251, 191, 36, 0.2); background: rgba(251, 191, 36, 0.03); color: #f8fafc;">
                                Optimize revision cycles
                            </div>
                            <div class="chip" onclick="useSuggestion('Build a realistic UPSC roadmap')" style="border: 1px solid rgba(251, 191, 36, 0.2); background: rgba(251, 191, 36, 0.03); color: #f8fafc;">
                                Build a realistic UPSC roadmap
                            </div>
                        </div>
                    </div>
                `;
            }

            const subtitle = isTempMode
                ? 'Temporary chat is active. This conversation will not be saved.'
                : 'How can I help you today?';

            return `
                <div class="empty-state" id="emptyState">
                    <h2>LE<span class="logo-x">X</span>INO<sup class="logo-sup">AI</sup></h2>
                    <p>${subtitle}</p>
                    <div class="suggestion-chips">
                        <div class="chip" onclick="useSuggestion('Explain quantum computing')">
                            Explain quantum computing
                        </div>
                        <div class="chip" onclick="useSuggestion('Write a business proposal')">
                            Write a business proposal
                        </div>
                        <div class="chip" onclick="useSuggestion('Brainstorm startup ideas')">
                            Brainstorm startup ideas
                        </div>
                        <div class="chip" onclick="useSuggestion('Review this code')">
                            Review this code
                        </div>
                    </div>
                </div>
            `;
        }

        function normalizeSession(session) {
            if (!session || typeof session !== "object") return null;
            const id = typeof session.id === "string" && session.id.trim() ? session.id : `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const html = typeof session.html === "string" ? session.html : getEmptyStateMarkup();
            const title = typeof session.title === "string" && session.title.trim() ? session.title.trim() : "New chat";
            const updatedAt = typeof session.updatedAt === "number" ? session.updatedAt : Date.now();
            const pinned = session.pinned === true;
            const thread = Array.isArray(session.thread)
                ? session.thread.filter((m) =>
                    m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
                ).map((m) => ({ role: m.role, content: m.content }))
                : [];
            return { id, html, title, updatedAt, pinned, thread };
        }

        function createSessionId() {
            return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        }

        function getMessagesDiv() {
            return document.getElementById("chatMessages");
        }

        function getHistoryContainer() {
            return document.getElementById("chatHistory");
        }

        function getSessionTitleFromHtml(html) {
            const fallback = "New chat";
            if (!html || typeof html !== "string") return fallback;
            const wrapper = document.createElement("div");
            wrapper.innerHTML = html;
            const userText = wrapper.querySelector(".message.user .message-content")?.textContent?.trim();
            const source = userText || wrapper.textContent?.trim() || fallback;
            return source.replace(/\s+/g, " ").slice(0, 46) || fallback;
        }

        function saveAllSessions() {
            localStorage.setItem(CHAT_SESSIONS_STORAGE_KEY, JSON.stringify(chatSessions));
        }

        function getOrderedChatSessions() {
            return [...chatSessions].sort((a, b) => {
                if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
                return (b.updatedAt || 0) - (a.updatedAt || 0);
            });
        }

        function renderChatHistory() {
            const history = getHistoryContainer();
            if (!history) return;

            const sessions = getOrderedChatSessions();

            history.innerHTML = "";
            if (sessions.length === 0) {
                const empty = document.createElement("div");
                empty.className = "chat-history-empty";
                empty.textContent = "No saved chats yet.";
                history.appendChild(empty);
                return;
            }

            const groups = {};
            sessions.forEach((session) => {
                const ageMs = Date.now() - session.updatedAt;
                let label = "Older";
                if (session.pinned) label = "Pinned";
                else if (ageMs < 24 * 60 * 60 * 1000) label = "Today";
                else if (ageMs < 2 * 24 * 60 * 60 * 1000) label = "Yesterday";
                else if (ageMs < 7 * 24 * 60 * 60 * 1000) label = "Previous 7 Days";

                if (!groups[label]) groups[label] = [];
                groups[label].push(session);
            });

            ["Pinned", "Today", "Yesterday", "Previous 7 Days", "Older"].forEach((label) => {
                if (!groups[label] || groups[label].length === 0) return;
                const groupEl = document.createElement("div");
                groupEl.className = "chat-date-group";

                const titleEl = document.createElement("div");
                titleEl.className = "chat-date-label";
                titleEl.textContent = label;
                groupEl.appendChild(titleEl);

                groups[label].forEach((session) => {
                    const item = document.createElement("div");
                    item.className = `chat-item${session.id === activeChatId ? " active" : ""}${session.pinned ? " pinned" : ""}`;
                    item.dataset.chatId = session.id;
                    item.innerHTML = `
                        <span class="chat-item-title">${escapeHtml(session.title || "New chat")}</span>
                        <span class="chat-item-meta">
                            ${session.pinned ? '<span class="chat-pin-indicator" aria-label="Pinned">&#9733;</span>' : ''}
                            <button class="chat-item-options" onclick="openChatOptionsFromButton(event)" aria-label="Chat options">...</button>
                        </span>
                    `;
                    item.title = session.title || "New chat";
                    item.onclick = () => openChatSession(session.id);
                    item.oncontextmenu = (event) => openChatContextMenu(event, session.id);
                    item.ontouchstart = primeChatOptionsForTouch;
                    groupEl.appendChild(item);
                });

                history.appendChild(groupEl);
            });
        }

        function formatChatDate(ts) {
            const d = new Date(ts);
            return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
        }

        function getSearchableText(session) {
            const wrapper = document.createElement("div");
            wrapper.innerHTML = session.html || "";
            const full = wrapper.textContent || "";
            return `${session.title || ""} ${full}`.toLowerCase();
        }

        function renderSearchResults() {
            const container = document.getElementById("searchResults");
            if (!container) return;
            const query = chatSearchQuery.trim().toLowerCase();

            container.innerHTML = "";
            if (!query) {
                const empty = document.createElement("div");
                empty.className = "chat-history-empty";
                empty.textContent = "Type to search saved chats.";
                container.appendChild(empty);
                return;
            }

            const matched = getOrderedChatSessions().filter((session) => getSearchableText(session).includes(query));
            if (matched.length === 0) {
                const empty = document.createElement("div");
                empty.className = "chat-history-empty";
                empty.textContent = "No matching chats found.";
                container.appendChild(empty);
                return;
            }

            matched.forEach((session) => {
                const item = document.createElement("div");
                item.className = "search-result-item";
                item.innerHTML = `
                    <div class="search-result-title">${escapeHtml(session.title || "New chat")}</div>
                    <div class="search-result-meta">${formatChatDate(session.updatedAt)}</div>
                `;
                item.onclick = () => {
                    openChatSession(session.id);
                    closeSearchPanel();
                };
                container.appendChild(item);
            });
        }

        function scheduleSearchResultsRender() {
            if (searchRenderFrame) return;

            searchRenderFrame = requestAnimationFrame(() => {
                searchRenderFrame = null;
                renderSearchResults();
            });
        }

        function openSearchPanel() {
            const panel = document.getElementById("searchPanel");
            if (!panel) return;
            closeChatContextMenu();
            panel.classList.add("active");
            const input = document.getElementById("searchInput");
            if (input) {
                input.value = chatSearchQuery;
                setTimeout(() => input.focus(), 0);
            }
            renderSearchResults();
        }

        function closeSearchPanel() {
            const panel = document.getElementById("searchPanel");
            if (!panel) return;
            panel.classList.remove("active");
        }

        function closeSidebar() {
            const sidebar = document.getElementById('sidebar');
            if (!sidebar) return;
            if (window.innerWidth <= 768) {
                sidebar.classList.add('hidden');
            } else {
                sidebar.classList.add('collapsed');
            }
            updateSidebarUI();
        }

        function toggleRailQuickMenu(event) {
            if (event) {
                event.stopPropagation();
            }
            const menu = document.getElementById("railQuickMenu");
            if (!menu) return;
            const sidebar = document.getElementById("sidebar");
            const isOpen = menu.classList.toggle("active");
            closeSidebarAccountMenu();
            document.getElementById("railAvatarBtn")?.setAttribute("aria-expanded", String(isOpen));
            if (sidebar) sidebar.classList.toggle("account-menu-open", isOpen);
            document.body.classList.toggle("profile-menu-open", isOpen);
        }

        function closeRailQuickMenu() {
            const menu = document.getElementById("railQuickMenu");
            if (!menu) return;
            menu.classList.remove("active");
            const sidebar = document.getElementById("sidebar");
            if (sidebar && !document.getElementById("sidebarAccountMenu")?.classList.contains("active")) {
                sidebar.classList.remove("account-menu-open");
                document.body.classList.remove("profile-menu-open");
            }
            document.getElementById("railAvatarBtn")?.setAttribute("aria-expanded", "false");
        }

        function toggleSidebarAccountMenu(event) {
            if (event) {
                event.stopPropagation();
            }
            closeDownloadMenu();
            const menu = document.getElementById("sidebarAccountMenu");
            if (!menu) return;
            const sidebar = document.getElementById("sidebar");
            const isOpen = menu.classList.toggle("active");
            closeRailQuickMenu();
            document.getElementById("sidebarAccountBtn")?.setAttribute("aria-expanded", String(isOpen));
            if (sidebar) sidebar.classList.toggle("account-menu-open", isOpen);
            document.body.classList.toggle("profile-menu-open", isOpen);
        }

        function closeSidebarAccountMenu() {
            const menu = document.getElementById("sidebarAccountMenu");
            if (!menu) return;
            menu.classList.remove("active");
            
            const submenu = document.getElementById("sidebarHelpSubmenu");
            if (submenu) submenu.classList.remove("active");
            const helpBtn = document.getElementById("helpMenuBtn");
            if (helpBtn) {
                const arrow = helpBtn.querySelector(".arrow-right");
                if (arrow) arrow.style.transform = "rotate(0deg)";
            }

            const sidebar = document.getElementById("sidebar");
            if (sidebar && !document.getElementById("railQuickMenu")?.classList.contains("active")) {
                sidebar.classList.remove("account-menu-open");
                document.body.classList.remove("profile-menu-open");
            }
            document.getElementById("sidebarAccountBtn")?.setAttribute("aria-expanded", "false");
        }

        function toggleDownloadMenu(event) {
            if (event) {
                event.stopPropagation();
            }
            closeSidebarAccountMenu();
            const menu = document.getElementById("downloadMenu");
            if (!menu) return;
            const sidebar = document.getElementById("sidebar");
            const isOpen = menu.classList.toggle("active");
            if (sidebar) sidebar.classList.toggle("account-menu-open", isOpen);
            document.getElementById("sidebarStoreBtn")?.setAttribute("aria-expanded", String(isOpen));
        }

        function closeDownloadMenu() {
            const menu = document.getElementById("downloadMenu");
            if (!menu) return;
            menu.classList.remove("active");
            const sidebar = document.getElementById("sidebar");
            if (sidebar) sidebar.classList.remove("account-menu-open");
            document.getElementById("sidebarStoreBtn")?.setAttribute("aria-expanded", "false");
        }

        // Expose to window context
        window.toggleDownloadMenu = toggleDownloadMenu;
        window.closeDownloadMenu = closeDownloadMenu;

        function logoutAccount() {
            const modal = document.getElementById("logoutConfirmModal");
            if (modal) {
                modal.classList.add("active");
            } else {
                confirmLogout();
            }
        }

        window.closeLogoutConfirmModal = function() {
            const modal = document.getElementById("logoutConfirmModal");
            if (modal) modal.classList.remove("active");
        }

        window.confirmLogout = function() {
            if (window.clerkSignOut) {
                window.clerkSignOut();
            } else if (window.Clerk) {
                window.Clerk.signOut(() => {
                    window.location.href = "/login";
                });
            } else {
                window.location.href = "/login";
            }
        }

        window.closePremiumLockModal = function() {
            const modal = document.getElementById("premiumLockModal");
            if (modal) modal.classList.remove("active");
        }

        window.navigateToPricingFromLock = function() {
            window.closePremiumLockModal();
            if (window.__TAURI__) {
                openExternal("https://lexinoai.in/pricing");
            } else {
                window.location.href = "/pricing";
            }
        }

        window.showPremiumLockModal = function(mode) {
            const modal = document.getElementById("premiumLockModal");
            if (!modal) return;

            const iconEl = document.getElementById("lockModalIcon");
            const titleEl = document.getElementById("lockModalTitle");
            const subtitleEl = document.getElementById("lockModalSubtitle");
            const featuresEl = document.getElementById("lockModalFeatures");

            if (mode.startsWith('theme-') || mode === 'premium-theme') {
                const themeNameRaw = mode.replace('theme-', '');
                const themeMap = {
                    aurora: "Aurora Flow",
                    neon: "Digital Grid",
                    particlefield: "Dynamic Particles",
                    nebulastars: "Cosmic Nebula",
                    universe: "Quantum Space",
                    galaxydrift: "Eclipse Glow",
                    interstellar: "Stellar Transit"
                };
                const themeName = themeMap[themeNameRaw] || "Premium Theme";
                if (iconEl) iconEl.textContent = "🎨";
                if (titleEl) titleEl.textContent = themeName;
                if (subtitleEl) subtitleEl.textContent = "Professional Workspace Atmosphere";
                if (featuresEl) {
                    featuresEl.innerHTML = `
                        <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.9rem; color: #e2e8f0; font-weight: 500;">
                            <div style="display: flex; align-items: center; gap: 8px;"><span style="color: #00f0ff; font-weight: bold;">✔</span> Ambient Fluid Animations</div>
                            <div style="display: flex; align-items: center; gap: 8px;"><span style="color: #00f0ff; font-weight: bold;">✔</span> Reduced Motion Adaptive Core</div>
                            <div style="display: flex; align-items: center; gap: 8px;"><span style="color: #00f0ff; font-weight: bold;">✔</span> Accent Colors Palette Match</div>
                            <div style="display: flex; align-items: center; gap: 8px;"><span style="color: #00f0ff; font-weight: bold;">✔</span> Included with Lexino Pro</div>
                        </div>
                    `;
                }
            } else if (mode === 'timetable-lai') {
                if (iconEl) iconEl.textContent = "📅";
                if (titleEl) titleEl.textContent = "Timetable LAI";
                if (subtitleEl) subtitleEl.textContent = "Your AI Academic Strategist";
                if (featuresEl) {
                    featuresEl.innerHTML = `
                        <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.9rem; color: #e2e8f0; font-weight: 500;">
                            <div style="display: flex; align-items: center; gap: 8px;"><span style="color: #fbbf24; font-weight: bold;">✔</span> Deep Goal Analysis</div>
                            <div style="display: flex; align-items: center; gap: 8px;"><span style="color: #fbbf24; font-weight: bold;">✔</span> Burnout Prevention</div>
                            <div style="display: flex; align-items: center; gap: 8px;"><span style="color: #fbbf24; font-weight: bold;">✔</span> Strategic Planning</div>
                            <div style="display: flex; align-items: center; gap: 8px;"><span style="color: #fbbf24; font-weight: bold;">✔</span> 45+ Years Mentor Intelligence</div>
                        </div>
                    `;
                }
            } else if (mode === 'predict-lai') {
                if (iconEl) iconEl.textContent = "🔮";
                if (titleEl) titleEl.textContent = "Predict LAI";
                if (subtitleEl) subtitleEl.textContent = "Your AI Prediction Engine";
                if (featuresEl) {
                    featuresEl.innerHTML = `
                        <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.9rem; color: #e2e8f0; font-weight: 500;">
                            <div style="display: flex; align-items: center; gap: 8px;"><span style="color: #a855f7; font-weight: bold;">✔</span> Advanced Trend Forecasting</div>
                            <div style="display: flex; align-items: center; gap: 8px;"><span style="color: #a855f7; font-weight: bold;">✔</span> Academic Outcome Simulation</div>
                            <div style="display: flex; align-items: center; gap: 8px;"><span style="color: #a855f7; font-weight: bold;">✔</span> Pattern Analytics & Insights</div>
                            <div style="display: flex; align-items: center; gap: 8px;"><span style="color: #a855f7; font-weight: bold;">✔</span> Real-Time Statistical Projections</div>
                        </div>
                    `;
                }
            } else if (mode === 'gpt-4o') {
                if (iconEl) iconEl.textContent = "💬";
                if (titleEl) titleEl.textContent = "ChatGPT (GPT-4o)";
                if (subtitleEl) subtitleEl.textContent = "Balanced & Creative AI Partner";
                if (featuresEl) {
                    featuresEl.innerHTML = `
                        <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.9rem; color: #e2e8f0; font-weight: 500;">
                            <div style="display: flex; align-items: center; gap: 8px;"><span style="color: #10a37f; font-weight: bold;">✔</span> Fast & Balanced Reasoning</div>
                            <div style="display: flex; align-items: center; gap: 8px;"><span style="color: #10a37f; font-weight: bold;">✔</span> Advanced Creative Generation</div>
                            <div style="display: flex; align-items: center; gap: 8px;"><span style="color: #10a37f; font-weight: bold;">✔</span> High-Accuracy Student Queries</div>
                            <div style="display: flex; align-items: center; gap: 8px;"><span style="color: #10a37f; font-weight: bold;">✔</span> Included in Student+ Tier</div>
                        </div>
                    `;
                }
            } else if (mode === 'claude-3-5-sonnet') {
                if (iconEl) iconEl.textContent = "✍️";
                if (titleEl) titleEl.textContent = "Claude 3.5 Sonnet";
                if (subtitleEl) subtitleEl.textContent = "Nuanced & Deep Reasoning Engine";
                if (featuresEl) {
                    featuresEl.innerHTML = `
                        <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.9rem; color: #e2e8f0; font-weight: 500;">
                            <div style="display: flex; align-items: center; gap: 8px;"><span style="color: #d97757; font-weight: bold;">✔</span> Elite Coding & Analytical Skills</div>
                            <div style="display: flex; align-items: center; gap: 8px;"><span style="color: #d97757; font-weight: bold;">✔</span> Long-Form Composition & Writing</div>
                            <div style="display: flex; align-items: center; gap: 8px;"><span style="color: #d97757; font-weight: bold;">✔</span> Nuanced Logic & Problem Solving</div>
                            <div style="display: flex; align-items: center; gap: 8px;"><span style="color: #d97757; font-weight: bold;">✔</span> Exclusive to Pro (Unlimited) Tier</div>
                        </div>
                    `;
                }
            } else {
                if (iconEl) iconEl.textContent = "🧭";
                if (titleEl) titleEl.textContent = "Explore LAIs";
                if (subtitleEl) subtitleEl.textContent = "Explore Specialized AI Models";
                if (featuresEl) {
                    featuresEl.innerHTML = `
                        <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.9rem; color: #e2e8f0; font-weight: 500;">
                            <div style="display: flex; align-items: center; gap: 8px;"><span style="color: #3b82f6; font-weight: bold;">✔</span> Instant Access to Premium Agents</div>
                            <div style="display: flex; align-items: center; gap: 8px;"><span style="color: #3b82f6; font-weight: bold;">✔</span> Curated Domain-Specific Strategic AIs</div>
                            <div style="display: flex; align-items: center; gap: 8px;"><span style="color: #3b82f6; font-weight: bold;">✔</span> High-Performance Reasoning Engines</div>
                            <div style="display: flex; align-items: center; gap: 8px;"><span style="color: #3b82f6; font-weight: bold;">✔</span> Personalized Learning Ecosystem</div>
                        </div>
                    `;
                }
            }

            modal.classList.add("active");
        }

        window.setAssistantMode = function(mode) {
            window.currentAssistant = mode;

            const headerLogo = document.getElementById("headerLogo");
            const headerSubtitle = document.getElementById("headerSubtitle");
            const textarea = document.getElementById("messageInput");

            if (mode === 'timetable-lai') {
                if (headerLogo) {
                    headerLogo.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 8px;"><img src="/assets/logos/timetable-lai-logo.svg" alt="Timetable LAI logo" width="24" height="24" style="width: 24px; height: 24px; object-fit: contain; vertical-align: middle; border-radius: 6px; flex-shrink: 0;" /><span style="background: linear-gradient(110deg, #fbbf24 0%, #f59e0b 28%, #fef3c7 43%, #ffffff 50%, #fde047 57%, #fbbf24 78%, #d97706 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-family: 'Orbitron', sans-serif; font-weight: 800; font-size: inherit;">Timetable LAI</span></span>`;
                    headerLogo.style.background = "none";
                    headerLogo.style.webkitTextFillColor = "initial";
                    headerLogo.style.filter = "drop-shadow(0 0 14px rgba(251, 191, 36, 0.25))";
                }
                if (headerSubtitle) {
                    headerSubtitle.style.display = "block";
                    headerSubtitle.textContent = "Your AI Academic Strategist";
                    headerSubtitle.style.color = "#fbbf24";
                }
                if (textarea) {
                    textarea.placeholder = "Tell me your goal, weaknesses, schedule, and study capacity...";
                }
                applyModelAccent("timetable-ai");
            } else {
                if (headerLogo) {
                    headerLogo.innerHTML = 'LE<span class="logo-x">X</span>INO<sup class="logo-sup">AI</sup>';
                    headerLogo.style.background = "linear-gradient(110deg, #10a37f 0%, #34d399 28%, #d1fae5 43%, #ffffff 50%, #86efac 57%, #10a37f 78%, #0d8c6d 100%)";
                    headerLogo.style.backgroundSize = "260% 100%";
                    headerLogo.style.webkitBackgroundClip = "text";
                    headerLogo.style.webkitTextFillColor = "transparent";
                    headerLogo.style.filter = "drop-shadow(0 0 14px rgba(16, 163, 127, 0.18))";
                }
                if (headerSubtitle) {
                    headerSubtitle.style.display = "none";
                }
                if (textarea) {
                    textarea.placeholder = "Ask anything...";
                }
                const modelSelect = document.getElementById('modelSelect');
                const savedModel = modelSelect ? modelSelect.value : 'llama-3.1-8b-instant';
                applyModelAccent(savedModel);
            }

            const messagesDiv = document.getElementById('chatMessages');
            if (messagesDiv && (messagesDiv.querySelector(".empty-state") || messagesDiv.innerHTML.trim() === "" || currentConversation.length === 0)) {
                messagesDiv.style.transition = "opacity 0.15s ease-in-out";
                messagesDiv.style.opacity = "0";
                setTimeout(() => {
                    messagesDiv.innerHTML = getEmptyStateMarkup();
                    messagesDiv.style.opacity = "1";
                }, 150);
            }
        }

        window.laiConfig = {
            "timetable-lai": true,
            "predict-lai": false,
            "explore-lais": true
        };

        function updateLaiMenuUI() {
            const predictBtn = document.getElementById("predictMenuBtn");
            const timetableBtn = document.getElementById("timetableMenuBtn");
            const exploreBtn = document.getElementById("exploreMenuBtn");

            if (predictBtn) {
                const active = window.laiConfig["predict-lai"] !== false;
                predictBtn.style.opacity = active ? "1" : "0.45";
                predictBtn.style.pointerEvents = active ? "auto" : "none";
                predictBtn.title = active ? "" : "Predict LAI (Deactivated)";
            }

            if (timetableBtn) {
                const active = window.laiConfig["timetable-lai"] !== false;
                timetableBtn.style.opacity = active ? "1" : "0.45";
                timetableBtn.title = active ? "" : "Timetable LAI (Deactivated)";
            }

            if (exploreBtn) {
                const active = window.laiConfig["explore-lais"] !== false;
                exploreBtn.style.opacity = active ? "1" : "0.45";
                timetableBtn.title = active ? "" : "Explore LAIs (Deactivated)";
            }
        }

        async function fetchLaiConfig() {
            try {
                const res = await fetch('/api/config');
                if (res.ok) {
                    window.laiConfig = await res.json();
                    updateLaiMenuUI();
                }
            } catch (e) {
                console.warn('Failed to load LAI config:', e);
            }
        }

        window.triggerLAIMode = function(mode) {
            // Admin toggle override check
            if (mode !== 'default' && window.laiConfig && window.laiConfig[mode] === false) {
                alert(`The ${mode === 'predict-lai' ? 'Predict LAI' : (mode === 'timetable-lai' ? 'Timetable LAI' : 'Explore LAIs')} agent is currently deactivated by the administrator for system maintenance.`);
                return;
            }

            const tier = window.lexinoUserTier || "FREE";
            
            if (mode === 'default') {
                window.setAssistantMode('default');
                startNewChat();
                return;
            }

            if (tier === "FREE") {
                window.showPremiumLockModal(mode);
            } else {
                window.setAssistantMode(mode);
                startNewChat();
            }
        }

        function openChatContextMenu(event, chatId) {
            event.preventDefault();
            const menu = document.getElementById("chatContextMenu");
            if (!menu || !chatId) return;

            contextMenuChatId = chatId;
            updateChatContextMenuLabels(chatId);
            const margin = 10;
            const menuWidth = 182;
            const menuHeight = 148;
            let x = event.clientX;
            let y = event.clientY;

            if (x + menuWidth + margin > window.innerWidth) {
                x = Math.max(margin, window.innerWidth - menuWidth - margin);
            }
            if (y + menuHeight + margin > window.innerHeight) {
                y = Math.max(margin, window.innerHeight - menuHeight - margin);
            }

            menu.style.left = `${x}px`;
            menu.style.top = `${y}px`;
            menu.classList.add("active");
        }

        function openChatOptionsFromButton(event) {
            event.preventDefault();
            event.stopPropagation();
            const chatId = event.currentTarget.closest(".chat-item")?.dataset.chatId;
            if (!chatId) return;
            openChatContextMenu(event, chatId);
        }

        function clearChatOptionsTouchState() {
            if (chatOptionsTouchTimer) {
                clearTimeout(chatOptionsTouchTimer);
                chatOptionsTouchTimer = null;
            }
            document.querySelectorAll(".chat-item.touch-options-visible").forEach((item) => {
                item.classList.remove("touch-options-visible");
            });
        }

        function primeChatOptionsForTouch(event) {
            const item = event.currentTarget;
            clearChatOptionsTouchState();
            item.classList.add("touch-options-visible");
            chatOptionsTouchTimer = setTimeout(() => {
                item.classList.remove("touch-options-visible");
                chatOptionsTouchTimer = null;
            }, 1800);
        }

        function updateChatContextMenuLabels(chatId) {
            const target = chatSessions.find((session) => session.id === chatId);
            const pinAction = document.getElementById("pinChatContextAction");
            if (pinAction && target) {
                pinAction.textContent = target.pinned ? "Unpin Chat" : "Pin Chat";
            }
        }

        function closeChatContextMenu() {
            const menu = document.getElementById("chatContextMenu");
            if (!menu) return;
            menu.classList.remove("active");
            contextMenuChatId = null;
        }

        function openDeleteConfirmModal(chatId) {
            if (!chatId) return;
            const target = chatSessions.find((s) => s.id === chatId);
            if (!target) return;

            pendingDeleteChatId = chatId;
            const modal = document.getElementById("deleteConfirmModal");
            const titleEl = document.getElementById("deleteConfirmTitle");
            if (titleEl) {
                titleEl.textContent = target.title || "New chat";
            }
            if (modal) {
                modal.classList.add("active");
            }
        }

        function closeDeleteConfirmModal() {
            const modal = document.getElementById("deleteConfirmModal");
            if (modal) {
                modal.classList.remove("active");
            }
            pendingDeleteChatId = null;
        }

        function confirmDeleteFromModal() {
            const chatId = pendingDeleteChatId;
            closeDeleteConfirmModal();
            if (!chatId) return;
            deleteChatById(chatId);
        }

        function deleteChatById(chatId, options = {}) {
            if (!chatId) return;
            const target = chatSessions.find((s) => s.id === chatId);
            if (!target) return;

            const item = Array.from(document.querySelectorAll(".chat-item")).find((chatItem) => chatItem.dataset.chatId === chatId);
            const animate = options.animate !== false && item && !item.classList.contains("deleting");
            if (animate) {
                item.classList.add("deleting");
                setTimeout(() => deleteChatById(chatId, { animate: false }), 180);
                return;
            }

            const wasActive = activeChatId === chatId;
            chatSessions = chatSessions.filter((s) => s.id !== chatId);
            if (shareChatId === chatId) {
                closeShareChatModal();
            }

            if (previousNormalChatId === chatId) {
                previousNormalChatId = chatSessions[0]?.id || null;
            }

            if (wasActive && !isTempMode) {
                if (chatSessions.length > 0) {
                    openChatSession(chatSessions[0].id);
                } else {
                    const messagesDiv = getMessagesDiv();
                    if (messagesDiv) {
                        messagesDiv.innerHTML = getEmptyStateMarkup();
                    }
                    const fresh = {
                        id: createSessionId(),
                        html: getEmptyStateMarkup(),
                        title: "New chat",
                        updatedAt: Date.now(),
                        thread: []
                    };
                    chatSessions = [fresh];
                    activeChatId = fresh.id;
                    previousNormalChatId = fresh.id;
                    currentConversation = [];
                }
            }

            saveAllSessions();
            renderChatHistory();
            renderSearchResults();
        }

        function deleteChatFromContextMenu() {
            const chatId = contextMenuChatId;
            closeChatContextMenu();
            openDeleteConfirmModal(chatId);
        }

        function shareChatFromContextMenu() {
            const chatId = contextMenuChatId;
            closeChatContextMenu();
            openShareChatModal(chatId);
        }

        function togglePinChatFromContextMenu() {
            const chatId = contextMenuChatId;
            closeChatContextMenu();
            togglePinChatById(chatId);
        }

        function togglePinChatById(chatId) {
            const session = chatSessions.find((item) => item.id === chatId);
            if (!session) return;

            session.pinned = !session.pinned;
            if (session.pinned) {
                chatSessions = [
                    session,
                    ...chatSessions.filter((item) => item.id !== session.id)
                ];
            }
            saveAllSessions();
            renderChatHistory();
            renderSearchResults();
            updateMobileHeaderMenuLabels();
        }

        function getChatShareUrl(session) {
            const url = new URL(window.location.href);
            const payload = {
                title: session?.title || "Lexino AI Chat",
                thread: Array.isArray(session?.thread) ? session.thread : []
            };
            url.hash = `share=${encodeURIComponent(JSON.stringify(payload))}`;
            return url.toString();
        }

        function getChatShareText(session) {
            if (!session) return "";
            const threadText = Array.isArray(session.thread)
                ? session.thread.map((message) => `${message.role === "assistant" ? "Lexino AI" : "You"}: ${message.content}`).join("\n\n")
                : "";
            return `${session.title || "Lexino AI Chat"}${threadText ? `\n\n${threadText}` : ""}`.trim();
        }

        function openShareChatModal(chatId) {
            const session = chatSessions.find((item) => item.id === chatId);
            if (!session) return;

            shareChatId = session.id;
            const modal = document.getElementById("shareChatModal");
            const title = document.getElementById("shareChatTitle");
            const link = document.getElementById("shareChatLink");
            if (title) title.textContent = session.title || "New chat";
            if (link) link.value = getChatShareUrl(session);
            if (modal) modal.classList.add("active");
        }

        function closeShareChatModal() {
            const modal = document.getElementById("shareChatModal");
            if (modal) modal.classList.remove("active");
            shareChatId = null;
        }

        function copyTextToClipboard(text) {
            if (!text) return Promise.resolve(false);
            if (navigator.clipboard?.writeText) {
                return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
            }
            const textarea = document.createElement("textarea");
            textarea.value = text;
            textarea.setAttribute("readonly", "");
            textarea.style.position = "fixed";
            textarea.style.opacity = "0";
            document.body.appendChild(textarea);
            textarea.select();
            const copied = document.execCommand("copy");
            textarea.remove();
            return Promise.resolve(copied);
        }

        async function copyShareChatLink() {
            const link = document.getElementById("shareChatLink")?.value || "";
            if (!link) return;
            if (await copyTextToClipboard(link)) {
                alert("Share link copied.");
            }
        }

        async function copyShareChatText() {
            const session = shareChatId ? chatSessions.find((item) => item.id === shareChatId) : null;
            const text = getChatShareText(session);
            if (!text) return;
            if (await copyTextToClipboard(text)) {
                alert("Chat copied.");
            }
        }

        async function nativeShareCurrentChat() {
            const session = shareChatId ? chatSessions.find((item) => item.id === shareChatId) : null;
            if (!session) return;

            const shareData = {
                title: session.title || "Lexino AI Chat",
                text: getChatShareText(session),
                url: getChatShareUrl(session)
            };

            if (navigator.share) {
                try {
                    await navigator.share(shareData);
                    closeShareChatModal();
                    return;
                } catch (error) {
                    if (error?.name === "AbortError") return;
                }
            }

            await copyShareChatLink();
        }

        function handleSearchInput(value) {
            chatSearchQuery = (value || "").trim();
            scheduleSearchResultsRender();
        }

        function openChatSession(chatId) {
            const target = chatSessions.find((s) => s.id === chatId);
            if (!target) return;
            if (isTempMode) {
                setTempMode(false);
            }
            activeChatId = target.id;
            previousNormalChatId = target.id;

            const messagesDiv = getMessagesDiv();
            if (messagesDiv) {
                messagesDiv.innerHTML = target.html || getEmptyStateMarkup();
                ensureMessageMoreMenus(messagesDiv);
            }
            currentConversation = Array.isArray(target.thread)
                ? target.thread.map((m) => ({ role: m.role, content: m.content }))
                : [];
            renderChatHistory();
            scheduleMobileViewportSync();
            scrollMessagesToLatest();
        }

        function saveChatState() {
            if (isTempMode) return;

            const messagesDiv = getMessagesDiv();
            if (!messagesDiv) return;
            ensureMessageMoreMenus(messagesDiv);

            if (!activeChatId) {
                const newSession = {
                    id: createSessionId(),
                    html: getSavableChatHtml(messagesDiv),
                    title: "New chat",
                    updatedAt: Date.now(),
                    thread: []
                };
                chatSessions.unshift(newSession);
                activeChatId = newSession.id;
                previousNormalChatId = newSession.id;
            }

            const target = chatSessions.find((s) => s.id === activeChatId);
            if (!target) return;

            target.html = getSavableChatHtml(messagesDiv);
            target.thread = currentConversation.map((m) => ({ role: m.role, content: m.content }));
            if ((target.title === "New chat" || !target.title) && currentConversation.length > 0) {
                const firstUser = currentConversation.find((m) => m.role === "user" && m.content.trim());
                if (firstUser) {
                    target.title = firstUser.content.replace(/\s+/g, " ").slice(0, 46) || "New chat";
                }
            }
            target.updatedAt = Date.now();
            saveAllSessions();
            renderChatHistory();
            renderSearchResults();
        }

        function migrateLegacyChatIfNeeded() {
            if (chatSessions.length > 0) return;
            const legacy = localStorage.getItem(CHAT_STORAGE_KEY);
            if (!legacy) return;

            try {
                const parsed = JSON.parse(legacy);
                const html = typeof parsed?.html === "string" && parsed.html.trim()
                    ? parsed.html
                    : getEmptyStateMarkup();
                const legacySession = {
                    id: createSessionId(),
                    html,
                    title: getSessionTitleFromHtml(html),
                    updatedAt: Date.now(),
                    thread: []
                };
                chatSessions = [legacySession];
                activeChatId = legacySession.id;
                previousNormalChatId = legacySession.id;
                saveAllSessions();
                localStorage.removeItem(CHAT_STORAGE_KEY);
            } catch (error) {
                console.error("Failed to migrate legacy chat:", error);
            }
        }

        function importSharedChatFromHash() {
            const match = window.location.hash.match(/share=([^&]+)/);
            if (!match) return null;

            try {
                const payload = JSON.parse(decodeURIComponent(match[1]));
                const thread = Array.isArray(payload.thread)
                    ? payload.thread.filter((message) =>
                        message &&
                        (message.role === "user" || message.role === "assistant") &&
                        typeof message.content === "string"
                    ).map((message) => ({ role: message.role, content: message.content }))
                    : [];
                if (thread.length === 0) return null;

                const html = `
                    <div class="messages-wrapper">
                        ${thread.map((message) => {
                            const isAssistant = message.role === "assistant";
                            return `
                                <div class="message ${isAssistant ? "ai" : "user"}">
                                    <div class="message-avatar">${isAssistant ? "AI" : getUserAvatarMarkup()}</div>
                                    <div class="message-content">${isAssistant ? `<div>${escapeHtml(message.content)}</div>` : escapeHtml(message.content)}</div>
                                </div>
                            `;
                        }).join("")}
                    </div>
                `;
                const imported = normalizeSession({
                    id: createSessionId(),
                    html,
                    title: typeof payload.title === "string" && payload.title.trim() ? payload.title.trim() : "Shared chat",
                    updatedAt: Date.now(),
                    thread
                });
                if (!imported) return null;

                chatSessions = [
                    imported,
                    ...chatSessions.filter((session) => session.id !== imported.id)
                ];
                saveAllSessions();
                window.history.replaceState(null, "", `#chat=${encodeURIComponent(imported.id)}`);
                return imported.id;
            } catch (error) {
                console.error("Failed to import shared chat:", error);
                return null;
            }
        }

        function loadChatState() {
            const messagesDiv = getMessagesDiv();
            if (!messagesDiv) return false;

            try {
                const raw = localStorage.getItem(CHAT_SESSIONS_STORAGE_KEY);
                const parsed = raw ? JSON.parse(raw) : [];
                chatSessions = Array.isArray(parsed)
                    ? parsed.map(normalizeSession).filter(Boolean)
                    : [];
            } catch (error) {
                console.error("Failed to load chat sessions:", error);
                chatSessions = [];
            }

            migrateLegacyChatIfNeeded();
            const importedChatId = importSharedChatFromHash();
            renderChatHistory();

            if (chatSessions.length === 0) {
                const first = {
                    id: createSessionId(),
                    html: getEmptyStateMarkup(),
                    title: "New chat",
                    updatedAt: Date.now(),
                    thread: []
                };
                chatSessions = [first];
                activeChatId = first.id;
                previousNormalChatId = first.id;
                currentConversation = [];
                messagesDiv.innerHTML = first.html;
                saveAllSessions();
                renderChatHistory();
                scheduleMobileViewportSync();
                return true;
            }

            const hashChatId = (() => {
                const match = window.location.hash.match(/chat=([^&]+)/);
                return match ? decodeURIComponent(match[1]) : "";
            })();
            const mostRecent = chatSessions.find((session) => session.id === (importedChatId || hashChatId)) || getOrderedChatSessions()[0];
            activeChatId = mostRecent.id;
            previousNormalChatId = mostRecent.id;
            currentConversation = Array.isArray(mostRecent.thread)
                ? mostRecent.thread.map((m) => ({ role: m.role, content: m.content }))
                : [];
            messagesDiv.innerHTML = mostRecent.html || getEmptyStateMarkup();
            ensureMessageMoreMenus(messagesDiv);
            renderChatHistory();
            scheduleMobileViewportSync();
            scrollMessagesToLatest();
            return true;
        }

        function updateTempModeUI() {
            const tempBtn = document.getElementById('tempChatBtn');
            const tempBadge = document.getElementById('tempModeBadge');

            if (tempBtn) {
                tempBtn.classList.toggle('active', isTempMode);
                tempBtn.title = isTempMode ? 'Temporary Chat (On)' : 'Temporary Chat';
            }

            if (tempBadge) {
                tempBadge.style.display = isTempMode ? 'inline-flex' : 'none';
            }
        }

        function setTempMode(enabled) {
            isTempMode = enabled;
            updateTempModeUI();
        }

        function startNewChat() {
            const messagesDiv = document.getElementById('chatMessages');
            messagesDiv.innerHTML = getEmptyStateMarkup();
            uploadedFiles = [];
            displayUploaded();

            if (!isTempMode) {
                const newSession = {
                    id: createSessionId(),
                    html: messagesDiv.innerHTML,
                    title: "New chat",
                    updatedAt: Date.now(),
                    thread: []
                };
                chatSessions.unshift(newSession);
                activeChatId = newSession.id;
                previousNormalChatId = newSession.id;
                currentConversation = [];
                saveAllSessions();
            } else {
                activeChatId = null;
                currentConversation = [];
            }

            renderChatHistory();
        }

        function searchChats() {
            const sidebar = document.getElementById('sidebar');
            if (sidebar && (sidebar.classList.contains('hidden') || sidebar.classList.contains('collapsed'))) {
                sidebar.classList.remove('hidden');
                sidebar.classList.remove('collapsed');
                updateSidebarUI();
            }
            const panel = document.getElementById("searchPanel");
            if (panel && panel.classList.contains("active")) {
                closeSearchPanel();
            } else {
                openSearchPanel();
            }
        }

        window.openFeedbackModal = function() {
            const modal = document.getElementById("feedbackModal");
            if (modal) {
                modal.classList.add("active");
                window.resetFeedbackForm();
            }
        };

        window.closeFeedbackModal = function() {
            const modal = document.getElementById("feedbackModal");
            if (modal) modal.classList.remove("active");
        };

        window.toggleHelpSubmenu = function(event) {
            event.stopPropagation();
            const submenu = document.getElementById("sidebarHelpSubmenu");
            const btn = document.getElementById("helpMenuBtn");
            if (submenu && btn) {
                const isActive = submenu.classList.toggle("active");
                const arrow = btn.querySelector(".arrow-right");
                if (arrow) {
                    arrow.style.transform = isActive ? "rotate(90deg)" : "rotate(0deg)";
                }
            }
        };

        window.handleFeedbackSubmit = function(event) {
            event.preventDefault();
            const name = document.getElementById("feedbackName").value;
            const email = document.getElementById("feedbackEmail").value;
            const rating = document.getElementById("feedbackRating") ? document.getElementById("feedbackRating").value : 5;
            const msg = document.getElementById("feedbackMessage").value;
            
            if (!name || !email || !msg) return;
            
            const btn = document.getElementById("feedbackSubmitBtn");
            btn.disabled = true;
            btn.innerHTML = `<span class="spinner"></span> Sending...`;
            
            fetch('/api/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, msg, rating })
            })
            .then(res => res.json())
            .then(data => {
                const container = document.getElementById("feedbackFormContainer");
                container.innerHTML = `
                    <div class="success-animation" style="text-align: center; padding: 2rem 0;">
                        <div class="success-checkmark" style="width: 80px; height: 80px; margin: 0 auto; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: rgba(0, 240, 255, 0.1); border: 2px solid var(--color-accent); font-size: 2rem; color: var(--color-accent); text-shadow: 0 0 10px var(--color-accent); animation: pulse 1.5s infinite alternate;">✓</div>
                        <h3 style="color: var(--color-accent); font-family: 'Orbitron', sans-serif; text-align: center; margin-top: 1rem;">Feedback Received!</h3>
                        <p style="text-align: center; opacity: 0.8; font-size: 0.9rem;">Thank you for helping us shape Lexino AI.</p>
                        <button class="profile-btn primary" style="margin: 1.5rem auto 0; display: block;" onclick="resetFeedbackForm()">Send Another</button>
                    </div>
                `;
            })
            .catch(err => {
                console.error('Error submitting feedback:', err);
                btn.disabled = false;
                btn.textContent = 'Submit Feedback';
            });
        };

        window.handleSupportSubmit = function(event) {
            event.preventDefault();
            const email = document.getElementById("supportEmail").value;
            const topic = document.getElementById("supportTopic").value;
            const msg = document.getElementById("supportMessage").value;
            
            if (!email || !msg) return;
            
            const btn = document.getElementById("supportSubmitBtn");
            btn.disabled = true;
            btn.innerHTML = `<span class="spinner"></span> Processing...`;
            
            setTimeout(() => {
                const container = document.getElementById("supportFormContainer");
                container.innerHTML = `
                    <div class="success-animation" style="text-align: center; padding: 2rem 0;">
                        <div class="success-checkmark" style="width: 80px; height: 80px; margin: 0 auto; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: rgba(0, 240, 255, 0.1); border: 2px solid var(--color-accent); font-size: 2rem; color: var(--color-accent); text-shadow: 0 0 10px var(--color-accent); animation: pulse 1.5s infinite alternate;">✓</div>
                        <h3 style="color: var(--color-accent); font-family: 'Orbitron', sans-serif; text-align: center; margin-top: 1rem;">Ticket Logged!</h3>
                        <p style="text-align: center; opacity: 0.8; font-size: 0.9rem;">Our neural support matrix will contact you shortly.</p>
                        <button class="profile-btn primary" style="margin: 1.5rem auto 0; display: block;" onclick="resetSupportForm()">New Ticket</button>
                    </div>
                `;
            }, 1000);
        };

        window.resetFeedbackForm = function() {
            const container = document.getElementById("feedbackFormContainer");
            if (container) {
                container.innerHTML = `
                    <form id="feedbackForm" onsubmit="handleFeedbackSubmit(event)">
                        <div class="setting-item">
                            <label>Name</label>
                            <input type="text" id="feedbackName" placeholder="Your name" required>
                        </div>
                        <div class="setting-item">
                            <label>Email</label>
                            <input type="email" id="feedbackEmail" placeholder="yourname@domain.com" required>
                        </div>
                        <div class="setting-item">
                            <label>Feedback Message</label>
                            <textarea id="feedbackMessage" rows="4" placeholder="Share your thoughts with Lexino AI..." required></textarea>
                        </div>
                        <button type="submit" id="feedbackSubmitBtn" class="profile-btn primary" style="width: 100%; margin-top: 1rem;">Submit Feedback</button>
                    </form>
                `;
            }
        };

        window.resetSupportForm = function() {
            const container = document.getElementById("supportFormContainer");
            if (container) {
                container.innerHTML = `
                    <form id="supportForm" onsubmit="handleSupportSubmit(event)">
                        <div class="setting-item">
                            <label>Email Address</label>
                            <input type="email" id="supportEmail" placeholder="yourname@domain.com" required>
                        </div>
                        <div class="setting-item">
                            <label>Category</label>
                            <select id="supportTopic" style="background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.15); padding: 0.8rem; border-radius: 8px; width: 100%; outline: none; margin-bottom: 1rem;">
                                <option value="general" style="background: #0d0d0d;">General Query</option>
                                <option value="bug" style="background: #0d0d0d;">Report a Problem / Bug</option>
                                <option value="billing" style="background: #0d0d0d;">Billing & Account</option>
                                <option value="abuse" style="background: #0d0d0d;">Report Abuse</option>
                            </select>
                        </div>
                        <div class="setting-item">
                            <label>Description</label>
                            <textarea id="supportMessage" rows="4" placeholder="Describe your query or issue..." required></textarea>
                        </div>
                        <button type="submit" id="supportSubmitBtn" class="profile-btn primary" style="width: 100%; margin-top: 1rem;">Submit Ticket</button>
                    </form>
                `;
            }
        };

        function upgradePlan() {
            if (window.__TAURI__) {
                openExternal("https://lexinoai.in/pricing");
            } else {
                window.location.href = "/pricing";
            }
        }

        function startTempChat() {
            const enableTempMode = !isTempMode;
            setTempMode(enableTempMode);

            if (isTempMode) {
                previousNormalChatId = activeChatId;
                startNewChat();
                return;
            }
            if (previousNormalChatId && chatSessions.some((s) => s.id === previousNormalChatId)) {
                openChatSession(previousNormalChatId);
                return;
            }
            loadChatState();
        }

        function toggleAccountMenu() {
            openProfileModal();
        }

        function toggleMobileHeaderMenu(event) {
            event.stopPropagation();
            const menu = document.getElementById("mobileHeaderMenu");
            const button = document.getElementById("mobileMoreBtn");
            if (!menu) return;

            const isOpen = !menu.classList.contains("active");
            if (isOpen) updateMobileHeaderMenuLabels();
            menu.classList.toggle("active", isOpen);
            if (button) button.setAttribute("aria-expanded", String(isOpen));
        }

        function closeMobileHeaderMenu() {
            const menu = document.getElementById("mobileHeaderMenu");
            const button = document.getElementById("mobileMoreBtn");
            if (menu) menu.classList.remove("active");
            if (button) button.setAttribute("aria-expanded", "false");
        }

        function getActiveChatSession() {
            return activeChatId ? chatSessions.find((session) => session.id === activeChatId) : null;
        }

        function deleteCurrentChatFromHeader() {
            const session = getActiveChatSession();
            closeMobileHeaderMenu();
            if (session) {
                openDeleteConfirmModal(session.id);
            }
        }

        function shareCurrentChatFromHeader() {
            const session = getActiveChatSession();
            closeMobileHeaderMenu();
            if (session) openShareChatModal(session.id);
        }

        function togglePinCurrentChatFromHeader() {
            const session = getActiveChatSession();
            closeMobileHeaderMenu();
            if (session) togglePinChatById(session.id);
        }

        function updateMobileHeaderMenuLabels() {
            const session = getActiveChatSession();
            const pinLabel = document.getElementById("mobilePinLabel");
            if (pinLabel) {
                pinLabel.textContent = session?.pinned ? "Unpin Chat" : "Pin Chat";
            }
        }

        function useSuggestion(text) {
            document.getElementById('messageInput').value = text;
            updateComposerState();
            sendMessage();
        }

        function triggerFileUpload() {
            document.getElementById('fileInput').click();
        }

        function handleFileUpload(event) {
            const files = Array.from(event.target.files);
            
            if (files.length + uploadedFiles.length > 50) {
                alert('Maximum 50 files allowed');
                return;
            }
            
            files.forEach(file => {
                if (file.size > 104857600) {
                    alert(`File "${file.name}" exceeds 100MB limit`);
                    return;
                }
                
                uploadedFiles.push({file: file, name: file.name});
            });
            
            displayUploaded();
            event.target.value = '';
        }

        function displayUploaded() {
            const div = document.getElementById('uploadedFiles');
            div.innerHTML = '';
            uploadedFiles.forEach((uf, index) => {
                const fileEl = document.createElement('div');
                fileEl.className = 'uploaded-file';
                fileEl.innerHTML = `
                    ${uf.name}
                    <button class="remove-file" onclick="removeFile(${index})" title="Remove">&times;</button>
                `;
                div.appendChild(fileEl);
            });
            updateComposerState();
            scheduleMobileViewportSync();
        }

        function removeFile(index) {
            uploadedFiles.splice(index, 1);
            displayUploaded();
        }

        function toggleVoiceInput() {
            const micBtn = document.getElementById('micBtn');
            
            if (!('webkitSpeechRecognition' in window)) {
                alert('Voice input is not supported in your browser. Please use Chrome.');
                return;
            }

            if (!isRecording) {
                const input = document.getElementById('messageInput');
                voiceInitialText = input ? input.value : '';
                if (voiceInitialText && !voiceInitialText.endsWith(' ')) {
                    voiceInitialText += ' ';
                }

                recognition = new webkitSpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognitionActive = true;
                
                recognition.onstart = function() {
                    isRecording = true;
                    micBtn.classList.add('recording');
                    micBtn.setAttribute('aria-label', 'Stop voice input');
                    micBtn.title = 'Stop voice input';
                };
                
                recognition.onresult = function(event) {
                    let finalSessionText = '';
                    let interimSessionText = '';
                    for (let i = 0; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalSessionText += event.results[i][0].transcript + ' ';
                        } else {
                            interimSessionText += event.results[i][0].transcript;
                        }
                    }
                    
                    finalSessionText = finalSessionText.replace(/\s+/g, ' ');
                    
                    const inputEl = document.getElementById('messageInput');
                    if (inputEl) {
                        let combined = voiceInitialText + finalSessionText + interimSessionText;
                        inputEl.value = combined.trim();
                        autoResize(inputEl);
                        updateComposerState();
                    }
                };
                
                recognition.onerror = function(event) {
                    console.error('Speech recognition error', event.error);
                    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                        recognitionActive = false;
                        isRecording = false;
                        micBtn.classList.remove('recording');
                        micBtn.setAttribute('aria-label', 'Start voice input');
                        micBtn.title = 'Voice input';
                    }
                };

                recognition.onend = function() {
                    if (recognitionActive) {
                        const inputEl = document.getElementById('messageInput');
                        if (inputEl) {
                            voiceInitialText = inputEl.value;
                            if (voiceInitialText && !voiceInitialText.endsWith(' ')) {
                                voiceInitialText += ' ';
                            }
                        }
                        setTimeout(() => {
                            if (recognitionActive) {
                                try {
                                    recognition.start();
                                } catch (e) {
                                    console.error('Failed to restart recognition:', e);
                                }
                            }
                        }, 300);
                    }
                };
                
                recognition.start();
            } else {
                recognitionActive = false;
                recognition.stop();
                isRecording = false;
                micBtn.classList.remove('recording');
                micBtn.setAttribute('aria-label', 'Start voice input');
                micBtn.title = 'Voice input';
            }
        }

        function updateComposerState() {
            const input = document.getElementById('messageInput');
            const sendBtn = document.getElementById('sendBtn');
            if (!input || !sendBtn) return;

            const hasMessage = input.value.trim().length > 0;
            const hasFiles = uploadedFiles.length > 0;
            sendBtn.disabled = !hasMessage && !hasFiles;
            syncMobileInputHeight();
        }

        function closeModelMenu() {
            const selector = document.querySelector('.model-selector');
            const button = document.getElementById('modelSelectorBtn');
            if (!selector || !button) return;

            selector.classList.remove('open');
            button.setAttribute('aria-expanded', 'false');
        }

        function toggleModelMenu(event) {
            if (event) event.stopPropagation();

            const selector = document.querySelector('.model-selector');
            const button = document.getElementById('modelSelectorBtn');
            if (!selector || !button) return;

            const isOpen = selector.classList.toggle('open');
            button.setAttribute('aria-expanded', String(isOpen));
        }

        function applyModelAccent(model) {
            const root = document.documentElement;
            let accentRgb = "16, 163, 127";
            let accentStrongRgb = "52, 211, 153";
            let hexAccent = "#10a37f";
            let hexHover = "#0d8c6d";

            if (model === "llama-3.1-8b-instant") {
                accentRgb = "6, 182, 212";
                accentStrongRgb = "34, 211, 238";
                hexAccent = "#06b6d4";
                hexHover = "#0891b2";
            } else if (model === "llama-3.3-70b-versatile") {
                accentRgb = "139, 92, 246";
                accentStrongRgb = "168, 85, 247";
                hexAccent = "#8b5cf6";
                hexHover = "#7c3aed";
            } else if (model === "gpt-4o") {
                accentRgb = "16, 163, 127";
                accentStrongRgb = "52, 211, 153";
                hexAccent = "#10a37f";
                hexHover = "#0d8c6d";
            } else if (model === "claude-3-5-sonnet") {
                accentRgb = "217, 119, 87";
                accentStrongRgb = "244, 164, 96";
                hexAccent = "#d97757";
                hexHover = "#cc6c4c";
            } else if (model === "timetable-ai") {
                accentRgb = "251, 191, 36";
                accentStrongRgb = "245, 158, 11";
                hexAccent = "#fbbf24";
                hexHover = "#d97706";
            }

            root.style.setProperty("--composer-accent-rgb", accentRgb);
            root.style.setProperty("--composer-accent-strong-rgb", accentStrongRgb);
            root.style.setProperty("--user-bubble-accent-rgb", accentRgb);
            root.style.setProperty("--user-bubble-accent-strong-rgb", accentStrongRgb);
            root.style.setProperty("--accent-primary", hexAccent);
            root.style.setProperty("--accent-hover", hexHover);
            root.style.setProperty("--composer-border-focus", `rgba(${accentStrongRgb}, 0.42)`);
        }

        function selectComposerModel(label, value, isInitialSync = false) {
            const tier = window.lexinoUserTier || "FREE";
            
            // Check tier permissions
            if (value === 'gpt-4o' && tier === 'FREE') {
                if (isInitialSync) {
                    selectComposerModel('Fast', 'llama-3.1-8b-instant', false);
                } else {
                    window.showPremiumLockModal('gpt-4o');
                }
                return;
            }
            if (value === 'claude-3-5-sonnet' && (tier === 'FREE' || tier === 'STUDENT')) {
                if (isInitialSync) {
                    selectComposerModel('Fast', 'llama-3.1-8b-instant', false);
                } else {
                    window.showPremiumLockModal('claude-3-5-sonnet');
                }
                return;
            }

            const modelSelect = document.getElementById('modelSelect');
            const modelLabel = document.getElementById('modelSelectorLabel');

            if (modelSelect && value) {
                modelSelect.value = value;
            }
            if (modelLabel) {
                modelLabel.textContent = label;
            }

            document.querySelectorAll('.model-option').forEach((option) => {
                const isActive = option.textContent.trim().startsWith(label);
                option.classList.toggle('active', isActive);
                option.setAttribute('aria-selected', String(isActive));
            });

            applyModelAccent(value);
            localStorage.setItem("lexino_selected_model", value);
            closeModelMenu();
        }

        function syncComposerModelFromSelect() {
            const modelSelect = document.getElementById('modelSelect');
            const selectedValue = modelSelect ? modelSelect.value : 'llama-3.1-8b-instant';
            selectComposerModel(composerModels[selectedValue] || 'Fast', selectedValue, true);
        }

        async function sendMessage() {
            if (checkClientSideRateLimit()) return;
            const input = document.getElementById('messageInput');
            const message = input.value.trim();
            
            if (!message && uploadedFiles.length === 0) return;

            const currentFiles = [...uploadedFiles];

            const emptyState = document.getElementById('emptyState');
            if (emptyState) {
                emptyState.remove();
            }

            const messagesDiv = document.getElementById('chatMessages');
            const wrapper = messagesDiv.querySelector('.messages-wrapper') || createMessagesWrapper(messagesDiv);
            const shouldFollowNewMessages = isMessagesNearBottom(messagesDiv);
            
            let displayMsg = message;
            if (currentFiles.length > 0) {
                const fileNames = currentFiles.map(uf => uf.name).join(', ');
                displayMsg += (message ? '\n\n' : '') + `Attached: ${fileNames}`;
            }
            
            const userMsg = document.createElement('div');
            userMsg.className = 'message user';
            userMsg.innerHTML = `
                <div class="message-avatar">${getUserAvatarMarkup()}</div>
                <div class="message-content">${escapeHtml(displayMsg)}</div>
            `;
            wrapper.appendChild(userMsg);

            input.value = '';
            input.style.height = 'auto';
            updateComposerState();

            // Build content
            let content = [];
            if (message) {
                content.push({type: "text", text: message});
            }

            const contentPromises = [];
            currentFiles.forEach(uf => {
                if (uf.file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    const promise = new Promise((resolve) => {
                        reader.onload = (e) => {
                            content.push({
                                type: "image_url",
                                image_url: {
                                    url: reader.result
                                }
                            });
                            resolve();
                        };
                        reader.onerror = () => resolve();
                        reader.readAsDataURL(uf.file);
                    });
                    contentPromises.push(promise);
                } else {
                    // Non-image: append filename to text
                    let textEntry = content.find(c => c.type === 'text');
                    if (!textEntry) {
                        textEntry = {type: "text", text: ''};
                        content.push(textEntry);
                    }
                    textEntry.text += `\n\nFile: ${uf.name}`;
                }
            });

            await Promise.all(contentPromises);

            if (content.length === 0 || !content.some(c => c.type === 'text')) {
                if (content.length > 0) {
                    // Only images
                    content.unshift({type: "text", text: "What is in this image?"});
                } else {
                    content.push({type: "text", text: message || "Hello"});
                }
            }

            const memoryUserText = (() => {
                const imageCount = currentFiles.filter((uf) => uf.file.type.startsWith('image/')).length;
                const nonImageNames = currentFiles
                    .filter((uf) => !uf.file.type.startsWith('image/'))
                    .map((uf) => uf.name);
                let text = message || "Hello";
                if (nonImageNames.length > 0) {
                    text += `\n\nFiles: ${nonImageNames.join(", ")}`;
                }
                if (imageCount > 0) {
                    text += `\n\nImages attached: ${imageCount}`;
                }
                return text;
            })();
            const historyForApi = currentConversation.slice(-8).map((m) => ({
                role: m.role,
                content: String(m.content || "").slice(0, 1000)
            }));
            currentConversation.push({ role: "user", content: memoryUserText });
            saveChatState();

            // Clear files after building content
            uploadedFiles = [];
            displayUploaded();

            const typingMsg = document.createElement('div');
            typingMsg.className = 'message ai';
            typingMsg.innerHTML = `
                <div class="message-avatar">AI</div>
                <div class="message-content typing-indicator active">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            `;
            wrapper.appendChild(typingMsg);
            scrollMessagesToLatest({ smooth: true, force: shouldFollowNewMessages });

            try {
                const modelSelect = document.getElementById('modelSelect');
                const maxTokensSelect = document.getElementById('maxTokens');
                let selectedModelValue = modelSelect ? modelSelect.value : 'llama-3.1-8b-instant';
                if (window.currentAssistant === 'timetable-lai') {
                    selectedModelValue = 'timetable-ai';
                }
                const selectedMaxTokens = maxTokensSelect ? parseInt(maxTokensSelect.value, 10) : 512;

                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        selectedModel: selectedModelValue,
                        maxTokens: selectedMaxTokens,
                        content: memoryUserText,
                        history: historyForApi,
                        sessionId: activeChatId
                    })
                });

                typingMsg.remove();

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    if (response.status === 429 && errData.cooldownUntil) {
                        window.lexinoCooldownUntil = errData.cooldownUntil;
                        triggerCooldownTimer(errData.cooldownUntil);
                    }
                    throw new Error(errData?.error || `Server error (${response.status})`);
                }

                incrementClientSideMsgCount();

                const aiMsg = document.createElement('div');
                aiMsg.className = 'message ai';
                aiMsg.innerHTML = `
                    <div class="message-avatar">AI</div>
                    <div class="message-content">
                        <div class="streaming-text-container"></div>
                        <div class="message-actions" style="display: none;">
                            <button class="action-btn" onclick="copyMessage(this)" title="Copy">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                            </button>
                            <button class="action-btn" onclick="likeMessage(this)" title="Like">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                                </svg>
                            </button>
                            <button class="action-btn" onclick="dislikeMessage(this)" title="Dislike">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
                                </svg>
                            </button>
                            <button class="action-btn" onclick="shareMessage(this)" title="Share">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                                    <polyline points="16 6 12 2 8 6"></polyline>
                                    <line x1="12" y1="2" x2="12" y2="15"></line>
                                </svg>
                            </button>
                            <button class="action-btn" onclick="regenerateMessage(this)" title="Regenerate">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="23 4 23 10 17 10"></polyline>
                                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                                </svg>
                            </button>
                            <button class="action-btn read-aloud-toggle" onclick="toggleReadAloudDirect(this)" title="Read aloud" aria-label="Read aloud" aria-pressed="false">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                `;
                wrapper.appendChild(aiMsg);
                const textContainer = aiMsg.querySelector('.streaming-text-container');
                const actionsContainer = aiMsg.querySelector('.message-actions');

                if (!response.body) {
                    throw new Error("No readable response stream found.");
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let accumulatedReply = '';
                let streamBuffer = '';

                let renderPending = false;
                const scheduleStreamRender = () => {
                    if (renderPending) return;
                    renderPending = true;
                    requestAnimationFrame(() => {
                        renderPending = false;
                        textContainer.innerHTML = `<div>${renderMarkdown(accumulatedReply)}</div>`;
                        scrollMessagesToLatest({ smooth: true, force: shouldFollowNewMessages, onlyIfNearBottom: true });
                    });
                };

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    streamBuffer += decoder.decode(value, { stream: true });
                    const lines = streamBuffer.split('\n');
                    streamBuffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (trimmed.startsWith('data: ')) {
                            try {
                                const parsed = JSON.parse(trimmed.slice(6));
                                if (parsed.text) {
                                    accumulatedReply += parsed.text;
                                    scheduleStreamRender();
                                }
                            } catch (e) {}
                        }
                    }
                }

                // Final immediate flush
                textContainer.innerHTML = `<div>${renderMarkdown(accumulatedReply)}</div>`;

                if (actionsContainer) {
                    actionsContainer.style.display = 'flex';
                }
                ensureMessageMoreMenus(aiMsg);
                scrollMessagesToLatest({ smooth: true, force: shouldFollowNewMessages, onlyIfNearBottom: true });
                currentConversation.push({ role: "assistant", content: accumulatedReply });
                saveChatState();
            } catch (err) {
                typingMsg.remove();
                
                const friendlyError = formatChatError(err);
                const errorMsg = document.createElement('div');
                errorMsg.className = 'message ai';
                errorMsg.innerHTML = `
                    <div class="message-avatar">AI</div>
                    <div class="message-content">
                        <div style="color: #ef4444;">${friendlyError}</div>
                    </div>
                `;
                wrapper.appendChild(errorMsg);
                scrollMessagesToLatest({ smooth: true, force: shouldFollowNewMessages, onlyIfNearBottom: true });
                saveChatState();
            }
        }

        function formatChatError(err) {
            const raw = (err && err.message ? String(err.message) : "Something went wrong").trim();
            const lower = raw.toLowerCase();

            if (lower.includes("token limit") || lower.includes("rate limit") || lower.includes("tpm") || lower.includes("too many")) {
                return "Token limit reached. Please wait about 1 minute.";
            }

            if (lower.includes("failed to fetch") || lower.includes("network error") || lower.includes("backend unreachable") || lower.includes("connection issue")) {
                return "Connection issue detected. Please retry.";
            }

            if (
                lower.includes("groq_api_key") ||
                lower.includes("hf_token") ||
                lower.includes("unauthorized") ||
                lower.includes("forbidden") ||
                lower.includes("token") ||
                lower.includes("invalid api") ||
                lower.includes("api key") ||
                lower.includes("organization") ||
                lower.includes("billing") ||
                lower.includes("server is busy")
            ) {
                return "Server is busy right now. Please try again shortly.";
            }

            return "Something went wrong. Please try again.";
        }

        function createMessagesWrapper(parent) {
            const wrapper = document.createElement('div');
            wrapper.className = 'messages-wrapper';
            parent.appendChild(wrapper);
            return wrapper;
        }

        function handleKeyPress(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function copyMessage(btn) {
            const messageContent = btn.closest('.message-content');
            const textToCopy = messageContent.querySelector('div').textContent;
            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalText = btn.innerHTML;
                btn.innerHTML = '✓';
                setTimeout(() => {
                    btn.innerHTML = originalText;
                }, 1500);
            });
        }

        function likeMessage(btn) {
            btn.style.color = 'var(--accent-primary)';
            btn.disabled = true;
        }

        function dislikeMessage(btn) {
            btn.style.color = '#ef4444';
            btn.disabled = true;
        }

        function shareMessage(btn) {
            alert('Share functionality - coming soon!');
        }

        function ensureMessageMoreMenus(root = document) {
            root.querySelectorAll('.message.ai .message-actions .action-btn[title="More options"]').forEach((btn) => {
                btn.classList.add("read-aloud-toggle");
                btn.setAttribute("onclick", "toggleReadAloudDirect(this)");
                btn.setAttribute("title", "Read aloud");
                btn.setAttribute("aria-label", "Read aloud");
                btn.setAttribute("aria-pressed", "false");
                btn.removeAttribute("aria-expanded");
                btn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                    </svg>
                `;

                if (!btn.parentElement?.classList.contains("message-more-wrap")) {
                    const wrap = document.createElement("span");
                    wrap.className = "message-more-wrap";
                    btn.insertAdjacentElement("beforebegin", wrap);
                    wrap.appendChild(btn);
                }

                btn.parentElement.querySelectorAll(".message-more-menu").forEach((menu) => menu.remove());
            });
            root.querySelectorAll(".message.ai .message-actions .read-aloud-toggle").forEach((btn) => {
                btn.setAttribute("onclick", "toggleReadAloudDirect(this)");
                btn.setAttribute("title", "Read aloud");
                btn.setAttribute("aria-label", "Read aloud");
                btn.setAttribute("aria-pressed", btn.getAttribute("aria-pressed") || "false");
                btn.removeAttribute("aria-expanded");
            });
            syncReadAloudMenuLabels();
        }

        function closeMessageMoreMenus(exceptMenu = null) {
            document.querySelectorAll(".message-more-menu.active").forEach((menu) => {
                if (menu === exceptMenu) return;
                menu.classList.remove("active");
                menu.style.left = "";
                menu.style.top = "";
            });
            if (!exceptMenu && readAloudMenuButton) {
                readAloudMenuButton.setAttribute("aria-expanded", "false");
                readAloudMenuButton = null;
                readAloudMenuSource = null;
            }
        }

        function getSavableChatHtml(messagesDiv) {
            const clone = messagesDiv.cloneNode(true);
            clone.querySelectorAll(".message-more-menu.active").forEach((menu) => {
                menu.classList.remove("active");
            });
            clone.querySelectorAll(".message-actions .action-btn[title='More options']").forEach((button) => {
                button.setAttribute("aria-expanded", "false");
            });
            clone.querySelectorAll(".message-actions .read-aloud-toggle").forEach((button) => {
                button.classList.remove("active");
                button.setAttribute("aria-pressed", "false");
            });
            return clone.innerHTML || getEmptyStateMarkup();
        }

        function toggleMessageMoreMenu(event, btn) {
            if (event) event.stopPropagation();
            const button = event?.currentTarget || btn;
            if (!button) return;

            const menu = getReadAloudFloatingMenu();
            const isOpen = !(menu.classList.contains("active") && readAloudMenuButton === button);
            closeMessageMoreMenus();
            button.setAttribute("aria-expanded", String(isOpen));
            if (isOpen) {
                readAloudMenuButton = button;
                readAloudMenuSource = button.closest(".message");
                syncReadAloudMenuLabels();
                positionReadAloudMenu(button, menu);
                menu.classList.add("active");
            } else {
                readAloudMenuButton = null;
                readAloudMenuSource = null;
            }
        }

        function getReadAloudFloatingMenu() {
            let menu = document.getElementById("readAloudFloatingMenu");
            if (menu) {
                if (menu.parentElement !== document.body) {
                    document.body.appendChild(menu);
                }
                return menu;
            }

            menu = document.createElement("div");
            menu.id = "readAloudFloatingMenu";
            menu.className = "message-more-menu read-aloud-floating-menu";
            menu.setAttribute("role", "menu");
            menu.setAttribute("aria-label", "Read aloud options");
            menu.innerHTML = `<button class="message-more-item" onclick="toggleReadAloudFromMenu(this)" role="menuitem">Read aloud</button>`;
            document.body.appendChild(menu);
            return menu;
        }

        function positionReadAloudMenu(button, popup) {
            const rect = button.getBoundingClientRect();
            const popupX = rect.left + (rect.width / 2) - (popup.offsetWidth / 2);
            const popupY = rect.top - popup.offsetHeight - 4;

            popup.style.left = `${popupX}px`;
            popup.style.top = `${popupY}px`;
        }

        function handleMessageMoreOutsidePointer(event) {
            const menu = event.target.closest(".message-more-menu");
            const btn = event.target.closest(".message-actions .action-btn[title='More options']");
            if (!menu && !btn) closeMessageMoreMenus();
        }

        function isReadAloudActive() {
            return Boolean("speechSynthesis" in window && (window.speechSynthesis.speaking || window.speechSynthesis.paused));
        }

        function syncReadAloudMenuLabels() {
            const active = isReadAloudActive();
            document.querySelectorAll(".message-more-menu .message-more-item").forEach((item) => {
                item.textContent = active ? "Stop" : "Read aloud";
                item.setAttribute("aria-label", active ? "Stop read aloud" : "Read aloud");
            });
            document.querySelectorAll(".message-actions .read-aloud-toggle").forEach((button) => {
                const isSource = active && readAloudSource && button.closest(".message") === readAloudSource;
                button.classList.toggle("active", Boolean(isSource));
                button.setAttribute("aria-pressed", String(Boolean(isSource)));
                button.setAttribute("title", isSource ? "Stop" : "Read aloud");
                button.setAttribute("aria-label", isSource ? "Stop read aloud" : "Read aloud");
            });
        }

        function getReadableMessageText(source) {
            const message = source?.closest?.(".message") || readAloudMenuSource;
            const content = message?.querySelector(".message-content > div:first-child");
            return (content?.innerText || content?.textContent || "").replace(/\s+/g, " ").trim();
        }

        function getPreferredSpeechVoice() {
            const voices = window.speechSynthesis?.getVoices?.() || [];
            return voices.find((voice) => /natural|online|neural/i.test(voice.name) && /^en/i.test(voice.lang))
                || voices.find((voice) => /^en/i.test(voice.lang))
                || voices[0]
                || null;
        }

        function readMessageAloud(btn) {
            closeMessageMoreMenus();

            if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
                alert("Read Aloud is not supported in this browser.");
                return;
            }

            const text = getReadableMessageText(btn);
            if (!text) return;

            stopReadAloud(false);
            readAloudSource = btn.closest(".message");
            readAloudUtterance = new SpeechSynthesisUtterance(text);
            readAloudUtterance.voice = getPreferredSpeechVoice();
            readAloudUtterance.rate = 0.96;
            readAloudUtterance.pitch = 1;
            readAloudUtterance.volume = 1;
            readAloudUtterance.onend = () => {
                readAloudUtterance = null;
                readAloudSource = null;
                syncReadAloudMenuLabels();
            };
            readAloudUtterance.onerror = () => {
                readAloudUtterance = null;
                readAloudSource = null;
                syncReadAloudMenuLabels();
            };

            window.speechSynthesis.speak(readAloudUtterance);
            syncReadAloudMenuLabels();
        }

        function toggleReadAloudDirect(btn) {
            const message = btn?.closest?.(".message");
            if (!message) return;

            if (isReadAloudActive() && readAloudSource === message) {
                stopReadAloud();
                return;
            }

            readMessageAloud(btn);
        }

        function toggleReadAloudFromMenu(btn) {
            if (isReadAloudActive()) {
                stopReadAloud();
                return;
            }

            readMessageAloud(readAloudMenuSource || btn);
        }

        function pauseReadAloud() {
            closeMessageMoreMenus();
            if ("speechSynthesis" in window && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
                window.speechSynthesis.pause();
            }
        }

        function resumeReadAloud() {
            closeMessageMoreMenus();
            if ("speechSynthesis" in window && window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            }
        }

        function stopReadAloud(closeMenus = true) {
            if (closeMenus) closeMessageMoreMenus();
            if ("speechSynthesis" in window) {
                window.speechSynthesis.cancel();
            }
            readAloudUtterance = null;
            readAloudSource = null;
            syncReadAloudMenuLabels();
        }

        async function regenerateMessage(btn) {
            const messageDiv = btn.closest('.message');
            const messagesWrapper = messageDiv.parentElement;
            const originalUserMessage = messageDiv.previousElementSibling ? messageDiv.previousElementSibling.querySelector('.message-content').textContent : '';
            
            if (!originalUserMessage) return;

            const typingMsg = document.createElement('div');
            typingMsg.className = 'message ai';
            typingMsg.innerHTML = `
                <div class="message-avatar">AI</div>
                <div class="message-content typing-indicator active">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            `;
            
            messageDiv.style.opacity = '0.5';
            messagesWrapper.appendChild(typingMsg);
            scrollMessagesToLatest({ smooth: true });
            
            try {
                let latestUserText = String(originalUserMessage || "").slice(0, 6000);
                let historyForApi = [];
                if (currentConversation.length >= 2) {
                    const maybeUser = currentConversation[currentConversation.length - 2];
                    if (maybeUser && maybeUser.role === "user") {
                        latestUserText = String(maybeUser.content || "").slice(0, 6000);
                        historyForApi = currentConversation.slice(-10, -2).map((m) => ({
                            role: m.role,
                            content: String(m.content || "").slice(0, 1000)
                        }));
                    }
                }

                const newResponse = await getResponse([{type: "text", text: latestUserText}], historyForApi);
                typingMsg.remove();
                messageDiv.style.opacity = '1';
                messageDiv.querySelector('.message-content div').innerHTML = renderMarkdown(newResponse);
                scrollMessagesToLatest({ smooth: true });
                if (currentConversation.length > 0 && currentConversation[currentConversation.length - 1].role === "assistant") {
                    currentConversation[currentConversation.length - 1].content = String(newResponse || "");
                }
                saveChatState();
            } catch (err) {
                typingMsg.remove();
                messageDiv.style.opacity = '1';
                messageDiv.querySelector('.message-content div').textContent = `Regeneration failed: ${err.message}`;
                saveChatState();
            }
        }

        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('sidebar');
            const menuToggle = document.querySelector('.menu-toggle');
            const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
            const settingsModal = document.getElementById('settingsModal');
            const profileModal = document.getElementById('profileModal');
            const deleteConfirmModal = document.getElementById('deleteConfirmModal');
            const shareChatModal = document.getElementById('shareChatModal');
            const searchPanel = document.getElementById('searchPanel');
            const searchMenu = document.getElementById('searchChatsMenu');
            const chatContextMenu = document.getElementById('chatContextMenu');
            const railQuickMenu = document.getElementById('railQuickMenu');
            const railAvatarBtn = document.getElementById('railAvatarBtn');
            const sidebarAccountMenu = document.getElementById('sidebarAccountMenu');
            const sidebarAccountBtn = document.getElementById('sidebarAccountBtn');
            const modelSelector = document.querySelector('.model-selector');
            const mobileHeaderMenu = document.getElementById('mobileHeaderMenu');
            const mobileMoreBtn = document.getElementById('mobileMoreBtn');
            const messageMoreMenu = e.target.closest(".message-more-menu");
            const messageMoreBtn = e.target.closest(".message-actions .action-btn[title='More options']");
            const touchedChatItem = e.target.closest(".chat-item");
            
            if (window.innerWidth <= 768 && 
                sidebar &&
                !sidebar.contains(e.target) && 
                (!menuToggle || !menuToggle.contains(e.target)) &&
                (!mobileMenuBtn || !mobileMenuBtn.contains(e.target)) &&
                !sidebar.classList.contains('hidden')) {
                sidebar.classList.add('hidden');
                updateSidebarUI();
            }

            if (settingsModal && e.target === settingsModal) {
                closeSettings();
            }

            if (profileModal && e.target === profileModal) {
                closeProfileModal();
            }

            if (deleteConfirmModal && e.target === deleteConfirmModal) {
                closeDeleteConfirmModal();
            }

            if (shareChatModal && e.target === shareChatModal) {
                closeShareChatModal();
            }

            if (
                searchPanel &&
                searchPanel.classList.contains("active") &&
                !searchPanel.contains(e.target) &&
                (!searchMenu || !searchMenu.contains(e.target))
            ) {
                closeSearchPanel();
            }

            if (
                chatContextMenu &&
                chatContextMenu.classList.contains("active") &&
                !chatContextMenu.contains(e.target)
            ) {
                closeChatContextMenu();
            }

            if (
                railQuickMenu &&
                railQuickMenu.classList.contains("active") &&
                !railQuickMenu.contains(e.target) &&
                (!railAvatarBtn || !railAvatarBtn.contains(e.target))
            ) {
                closeRailQuickMenu();
            }

            if (
                sidebarAccountMenu &&
                sidebarAccountMenu.classList.contains("active") &&
                !sidebarAccountMenu.contains(e.target) &&
                (!sidebarAccountBtn || !sidebarAccountBtn.contains(e.target))
            ) {
                closeSidebarAccountMenu();
            }

            const downloadMenu = document.getElementById('downloadMenu');
            const sidebarStoreBtn = document.getElementById('sidebarStoreBtn');
            if (
                downloadMenu &&
                downloadMenu.classList.contains("active") &&
                !downloadMenu.contains(e.target) &&
                (!sidebarStoreBtn || !sidebarStoreBtn.contains(e.target))
            ) {
                closeDownloadMenu();
            }

            if (
                mobileHeaderMenu &&
                mobileHeaderMenu.classList.contains("active") &&
                !mobileHeaderMenu.contains(e.target) &&
                (!mobileMoreBtn || !mobileMoreBtn.contains(e.target))
            ) {
                closeMobileHeaderMenu();
            }

            if (!messageMoreMenu && !messageMoreBtn) {
                closeMessageMoreMenus();
            }

            if (!touchedChatItem) {
                clearChatOptionsTouchState();
            }

            if (
                modelSelector &&
                modelSelector.classList.contains("open") &&
                !modelSelector.contains(e.target)
            ) {
                closeModelMenu();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            closeSettings();
            closeProfileModal();
            closeDeleteConfirmModal();
            closeShareChatModal();
            closeSearchPanel();
            closeChatContextMenu();
            closeMessageMoreMenus();
            closeRailQuickMenu();
            closeSidebarAccountMenu();
            closeMobileHeaderMenu();
            closeModelMenu();
            closeFeedbackModal();
        });

        document.addEventListener("pointerdown", handleMessageMoreOutsidePointer, true);
        window.addEventListener("resize", () => closeMessageMoreMenus());
        document.addEventListener("scroll", () => closeMessageMoreMenus(), true);

        const modelSelectControl = document.getElementById('modelSelect');
        if (modelSelectControl) {
            modelSelectControl.addEventListener('change', syncComposerModelFromSelect);
        }

        if (typeof window.initTheme === 'function') {
            window.initTheme();
        }
        if (typeof window.loadHubPreferences === 'function') {
            window.loadHubPreferences();
        }
        updateSidebarUI();
        updateTempModeUI();
        loadWallpaper();
        fetchLaiConfig();
        loadSidebarBrandImage();
        loadProfile();
        checkPaymentSuccessNotification();
        initMobileAppShell();
        
        // Restore preferred model on startup
        const savedModel = localStorage.getItem("lexino_selected_model") || "llama-3.1-8b-instant";
        const modelSelect = document.getElementById('modelSelect');
        if (modelSelect) {
            modelSelect.value = savedModel;
        }
        syncComposerModelFromSelect();
        updateComposerState();
        loadChatState();

        function checkPaymentSuccessNotification() {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('payment') === 'success') {
                    const paidTier = (urlParams.get('tier') || 'PRO').toUpperCase();
                    window.lexinoUserTier = paidTier;
                    
                    // Clear local cached cooldowns and limits
                    window.lexinoCooldownUntil = null;
                    try {
                        localStorage.removeItem('lexino_rate_limit_cooldown');
                        localStorage.removeItem('lexino_ratelimit_v1');
                    } catch (_) {}

                    if (typeof updateModelLocksUI === 'function') {
                        updateModelLocksUI(paidTier);
                    }
                    if (typeof syncProfileUI === 'function') {
                        syncProfileUI();
                    }

                    // Show success notification banner
                    setTimeout(() => {
                        const alertBox = document.createElement('div');
                        alertBox.style.position = 'fixed';
                        alertBox.style.top = '24px';
                        alertBox.style.left = '50%';
                        alertBox.style.transform = 'translateX(-50%)';
                        alertBox.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95))';
                        alertBox.style.color = '#ffffff';
                        alertBox.style.padding = '14px 28px';
                        alertBox.style.borderRadius = '50px';
                        alertBox.style.fontWeight = '700';
                        alertBox.style.fontSize = '14px';
                        alertBox.style.boxShadow = '0 10px 30px rgba(16, 185, 129, 0.4)';
                        alertBox.style.zIndex = '99999';
                        alertBox.style.display = 'flex';
                        alertBox.style.alignItems = 'center';
                        alertBox.style.gap = '10px';
                        alertBox.innerHTML = `<span>🎉</span> <span>Your Lexino AI ${paidTier === 'STUDENT' ? 'Student' : 'Pro'} Plan is now active! All features unlocked.</span>`;
                        document.body.appendChild(alertBox);

                        setTimeout(() => {
                            alertBox.style.opacity = '0';
                            alertBox.style.transition = 'opacity 0.5s ease';
                            setTimeout(() => alertBox.remove(), 500);
                        }, 5000);
                    }, 500);

                    // Clean URL parameter
                    const cleanUrl = window.location.pathname;
                    window.history.replaceState({}, document.title, cleanUrl);
                }
            } catch (e) {
                console.warn('Error handling payment success notification:', e);
            }
        }

        // Performance Optimization & Feedback Popup triggers
        initPerformanceModeDetection();
        checkIntelligentFeedbackPopup();

        function initPerformanceModeDetection() {
            try {
                const isMobile = window.innerWidth <= 768;
                const isLowHardware = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
                                      (navigator.deviceMemory && navigator.deviceMemory <= 4);
                if (isMobile || isLowHardware) {
                    document.body.classList.add("performance-mode");
                }
            } catch (e) {
                console.warn("Performance mode detection error:", e);
            }
        }

        function checkIntelligentFeedbackPopup() {
            try {
                let start = localStorage.getItem("lexino_usage_start");
                if (!start) {
                    localStorage.setItem("lexino_usage_start", Date.now().toString());
                    return;
                }
                if (localStorage.getItem("feedback_popup_shown") === "true") return;

                const elapsed = Date.now() - parseInt(start, 10);
                const tenMinutes = 10 * 60 * 1000;
                if (elapsed >= tenMinutes) {
                    setTimeout(() => {
                        if (typeof openFeedbackModal === 'function') {
                            openFeedbackModal();
                            localStorage.setItem("feedback_popup_shown", "true");
                        }
                    }, 4000);
                }
            } catch (e) {
                console.warn("Feedback popup check error:", e);
            }
        }

        document.addEventListener("visibilitychange", () => {
            const wallpaperLayer = document.getElementById("animatedWallpaper");
            if (!wallpaperLayer) return;
            if (document.hidden) {
                wallpaperLayer.classList.add("wallpaper-paused");
            } else {
                wallpaperLayer.classList.remove("wallpaper-paused");
            }
        });
    
