        let isRecording = false;
        let uploadedFiles = [];
        let recognition = null;
        let isTempMode = false;
        const CHAT_STORAGE_KEY = "lexino_chat_state_v1";
        const CHAT_SESSIONS_STORAGE_KEY = "lexino_chat_sessions_v2";
        const PROFILE_STORAGE_KEY = "lexino_profile_v1";
        const WALLPAPER_STORAGE_KEY = "lexino_wallpaper_v1";
        const SIDEBAR_BRAND_IMAGE_KEY = "lexino_sidebar_brand_image_v1";
        const allowedWallpapers = ["none", "aurora", "neon", "mesh", "starfall", "particlefield", "sunset", "universe"];
        const defaultProfile = {
            name: "Ritik",
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
        let mobileViewportFrame = null;
        let mobileComposerResizeObserver = null;
        let autoResizeFrame = null;
        let pendingAutoResizeTextarea = null;
        let chatScrollFrame = null;
        let searchRenderFrame = null;
        let lastMobileInputHeight = 0;
        const composerModels = {
            "llama-3.1-8b-instant": "Fast",
            "llama-3.3-70b-versatile": "Pro"
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

        function renderMarkdown(text) {
            return marked.parse(text);
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

        function scrollMessagesToLatest(options = {}) {
            const { smooth = false } = options;
            if (chatScrollFrame) return;

            chatScrollFrame = requestAnimationFrame(() => {
                chatScrollFrame = null;
                const messagesDiv = document.getElementById("chatMessages");
                if (!messagesDiv) return;

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
        }

        function updateWallpaperOptions() {
            document.querySelectorAll(".wallpaper-option").forEach((option) => {
                option.classList.toggle("active", option.dataset.wallpaper === currentWallpaper);
            });
        }

        function setWallpaper(name) {
            const safe = allowedWallpapers.includes(name) ? name : "none";
            applyWallpaper(safe);
            localStorage.setItem(WALLPAPER_STORAGE_KEY, safe);
            updateWallpaperOptions();
        }

        function loadWallpaper() {
            const saved = localStorage.getItem(WALLPAPER_STORAGE_KEY) || "none";
            applyWallpaper(saved);
            updateWallpaperOptions();
        }

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
            const saved = localStorage.getItem(SIDEBAR_BRAND_IMAGE_KEY) || "";
            updateSidebarBrandImage(saved);
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
                avatarEl.textContent = initial;
                avatarEl.title = safeName;
            }

            if (railInitial) {
                const letters = safeName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("");
                railInitial.textContent = letters || initial;
            }

            if (sidebarAccountInitial) {
                sidebarAccountInitial.textContent = initial;
            }

            if (sidebarAccountName) {
                sidebarAccountName.textContent = safeName;
                sidebarAccountName.title = safeName;
            }

            if (sidebarAccountHandle) {
                const handleSource = (currentProfile.email || safeName).toLowerCase().replace(/[^a-z0-9]+/g, "");
                const handle = handleSource ? `@${handleSource.slice(0, 16)}` : "@user";
                sidebarAccountHandle.textContent = handle;
                sidebarAccountHandle.title = handle;
            }
        }

        function loadProfile() {
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
                    bio: (parsed.bio || "").toString().trim()
                };
            } catch (error) {
                console.error("Failed to load profile:", error);
                currentProfile = { ...defaultProfile };
            }

            syncProfileUI();
        }

        function openProfileModal() {
            const modal = document.getElementById("profileModal");
            if (!modal) return;

            const nameInput = document.getElementById("profileNameInput");
            const emailInput = document.getElementById("profileEmailInput");
            const bioInput = document.getElementById("profileBioInput");

            if (nameInput) nameInput.value = currentProfile.name || "";
            if (emailInput) emailInput.value = currentProfile.email || "";
            if (bioInput) bioInput.value = currentProfile.bio || "";

            modal.classList.add("active");
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
            const subtitle = isTempMode
                ? 'Temporary chat is active. This conversation will not be saved.'
                : 'How can I help you today?';

            return `
                <div class="empty-state" id="emptyState">
                    <h2>LEXINO AI</h2>
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
            const thread = Array.isArray(session.thread)
                ? session.thread.filter((m) =>
                    m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
                ).map((m) => ({ role: m.role, content: m.content }))
                : [];
            return { id, html, title, updatedAt, thread };
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

        function renderChatHistory() {
            const history = getHistoryContainer();
            if (!history) return;

            const sessions = [...chatSessions];

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
                if (ageMs < 24 * 60 * 60 * 1000) label = "Today";
                else if (ageMs < 2 * 24 * 60 * 60 * 1000) label = "Yesterday";
                else if (ageMs < 7 * 24 * 60 * 60 * 1000) label = "Previous 7 Days";

                if (!groups[label]) groups[label] = [];
                groups[label].push(session);
            });

            ["Today", "Yesterday", "Previous 7 Days", "Older"].forEach((label) => {
                if (!groups[label] || groups[label].length === 0) return;
                const groupEl = document.createElement("div");
                groupEl.className = "chat-date-group";

                const titleEl = document.createElement("div");
                titleEl.className = "chat-date-label";
                titleEl.textContent = label;
                groupEl.appendChild(titleEl);

                groups[label].forEach((session) => {
                    const item = document.createElement("div");
                    item.className = `chat-item${session.id === activeChatId ? " active" : ""}`;
                    item.textContent = session.title || "New chat";
                    item.title = session.title || "New chat";
                    item.onclick = () => openChatSession(session.id);
                    item.oncontextmenu = (event) => openChatContextMenu(event, session.id);
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

            const matched = chatSessions.filter((session) => getSearchableText(session).includes(query));
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
            menu.classList.toggle("active");
        }

        function closeRailQuickMenu() {
            const menu = document.getElementById("railQuickMenu");
            if (!menu) return;
            menu.classList.remove("active");
        }

        function toggleSidebarAccountMenu(event) {
            if (event) {
                event.stopPropagation();
            }
            const menu = document.getElementById("sidebarAccountMenu");
            if (!menu) return;
            menu.classList.toggle("active");
        }

        function closeSidebarAccountMenu() {
            const menu = document.getElementById("sidebarAccountMenu");
            if (!menu) return;
            menu.classList.remove("active");
        }

        function logoutAccount() {
            alert("Logout action can be connected to auth later.");
        }

        function openChatContextMenu(event, chatId) {
            event.preventDefault();
            const menu = document.getElementById("chatContextMenu");
            if (!menu || !chatId) return;

            contextMenuChatId = chatId;
            const margin = 10;
            const menuWidth = 182;
            const menuHeight = 52;
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

        function deleteChatById(chatId) {
            if (!chatId) return;
            const target = chatSessions.find((s) => s.id === chatId);
            if (!target) return;

            const wasActive = activeChatId === chatId;
            chatSessions = chatSessions.filter((s) => s.id !== chatId);

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

            if (!activeChatId) {
                const newSession = {
                    id: createSessionId(),
                    html: messagesDiv.innerHTML || getEmptyStateMarkup(),
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

            target.html = messagesDiv.innerHTML;
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

            const mostRecent = chatSessions[0];
            activeChatId = mostRecent.id;
            previousNormalChatId = mostRecent.id;
            currentConversation = Array.isArray(mostRecent.thread)
                ? mostRecent.thread.map((m) => ({ role: m.role, content: m.content }))
                : [];
            messagesDiv.innerHTML = mostRecent.html || getEmptyStateMarkup();
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

        function openHelp() {
            alert('Help section will be available soon.');
        }

        function upgradePlan() {
            alert('Upgrade to Pro for unlimited access!');
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
                recognition = new webkitSpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                
                recognition.onstart = function() {
                    isRecording = true;
                    micBtn.classList.add('recording');
                    micBtn.setAttribute('aria-label', 'Stop voice input');
                    micBtn.title = 'Stop voice input';
                };
                
                recognition.onresult = function(event) {
                    let transcript = '';
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        transcript += event.results[i][0].transcript;
                    }
                    const input = document.getElementById('messageInput');
                    input.value = transcript;
                    autoResize(input);
                    updateComposerState();
                };
                
                recognition.onerror = function(event) {
                    console.error('Speech recognition error', event.error);
                    isRecording = false;
                    micBtn.classList.remove('recording');
                    micBtn.setAttribute('aria-label', 'Start voice input');
                    micBtn.title = 'Voice input';
                };
                
                recognition.start();
            } else {
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

        function selectComposerModel(label, value) {
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
            closeModelMenu();
        }

        function syncComposerModelFromSelect() {
            const modelSelect = document.getElementById('modelSelect');
            const selectedValue = modelSelect ? modelSelect.value : 'llama-3.1-8b-instant';
            selectComposerModel(composerModels[selectedValue] || 'Fast', selectedValue);
        }

        async function sendMessage() {
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
            
            let displayMsg = message;
            if (currentFiles.length > 0) {
                const fileNames = currentFiles.map(uf => uf.name).join(', ');
                displayMsg += (message ? '\n\n' : '') + `Attached: ${fileNames}`;
            }
            
            const userMsg = document.createElement('div');
            userMsg.className = 'message user';
            userMsg.innerHTML = `
                <div class="message-avatar">${getUserInitial()}</div>
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
            const historyForApi = currentConversation.slice(-20).map((m) => ({
                role: m.role,
                content: m.content
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
            scrollMessagesToLatest({ smooth: true });

            try {
                const aiResponse = await getResponse(content, historyForApi);
                typingMsg.remove();
                
                const aiMsg = document.createElement('div');
                aiMsg.className = 'message ai';
                aiMsg.innerHTML = `
                    <div class="message-avatar">AI</div>
                    <div class="message-content">
                        <div>${renderMarkdown(aiResponse)}</div>
                        <div class="message-actions">
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
                            <button class="action-btn" title="More options">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="1"></circle>
                                    <circle cx="12" cy="5" r="1"></circle>
                                    <circle cx="12" cy="19" r="1"></circle>
                                </svg>
                            </button>
                        </div>
                    </div>
                `;
                wrapper.appendChild(aiMsg);
                scrollMessagesToLatest({ smooth: true });
                currentConversation.push({ role: "assistant", content: String(aiResponse || "") });
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
                scrollMessagesToLatest({ smooth: true });
                saveChatState();
            }
        }

        function formatChatError(err) {
            const raw = (err && err.message ? String(err.message) : "Something went wrong").trim();
            const lower = raw.toLowerCase();

            const isNetwork =
                lower.includes("failed to fetch") ||
                lower.includes("network error") ||
                lower.includes("backend unreachable") ||
                lower.includes("start server at");

            const isAuth =
                lower.includes("groq_api_key") ||
                lower.includes("groq_api_key") ||
                lower.includes("hf_token") ||
                lower.includes("unauthorized") ||
                lower.includes("forbidden") ||
                lower.includes("token") ||
                lower.includes("invalid api") ||
                lower.includes("api key");

            if (isNetwork) {
                const isLocalHost =
                    typeof window !== "undefined" &&
                    window.location &&
                    (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost");

                if (!isLocalHost) {
                    return `Error: ${raw}. Please try again in a moment.`;
                }

                const here = (typeof window !== "undefined" && window.location && window.location.origin) ? window.location.origin : "your UI URL";
                return `Error: ${raw}. Backend not reachable — start the backend on http://127.0.0.1:3000 and keep/open the UI at ${here}`;
            }

            if (isAuth) {
                return `Error: ${raw}. Please check your Groq API key (GROQ_API_KEY) and try again.`;
            }

            return `Error: ${raw}.`;
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
                let latestUserText = originalUserMessage;
                let historyForApi = [];
                if (currentConversation.length >= 2) {
                    const maybeUser = currentConversation[currentConversation.length - 2];
                    if (maybeUser && maybeUser.role === "user") {
                        latestUserText = maybeUser.content;
                        historyForApi = currentConversation.slice(0, -2).map((m) => ({
                            role: m.role,
                            content: m.content
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
            const settingsModal = document.getElementById('settingsModal');
            const profileModal = document.getElementById('profileModal');
            const deleteConfirmModal = document.getElementById('deleteConfirmModal');
            const searchPanel = document.getElementById('searchPanel');
            const searchMenu = document.getElementById('searchChatsMenu');
            const chatContextMenu = document.getElementById('chatContextMenu');
            const railQuickMenu = document.getElementById('railQuickMenu');
            const railAvatarBtn = document.getElementById('railAvatarBtn');
            const sidebarAccountMenu = document.getElementById('sidebarAccountMenu');
            const sidebarAccountBtn = document.getElementById('sidebarAccountBtn');
            const modelSelector = document.querySelector('.model-selector');
            
            if (window.innerWidth <= 768 && 
                sidebar &&
                !sidebar.contains(e.target) && 
                (!menuToggle || !menuToggle.contains(e.target)) &&
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
            closeSearchPanel();
            closeChatContextMenu();
            closeRailQuickMenu();
            closeSidebarAccountMenu();
            closeModelMenu();
        });

        const modelSelectControl = document.getElementById('modelSelect');
        if (modelSelectControl) {
            modelSelectControl.addEventListener('change', syncComposerModelFromSelect);
        }

        updateSidebarUI();
        updateTempModeUI();
        loadWallpaper();
        loadSidebarBrandImage();
        loadProfile();
        initMobileAppShell();
        syncComposerModelFromSelect();
        updateComposerState();
        loadChatState();
    
