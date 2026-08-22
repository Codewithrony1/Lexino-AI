(() => {
    function getApiCandidates() {
        return ["/api/chat"];
    }

    async function parseErrorResponse(response) {
        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            const err = await response.json().catch(() => ({}));
            const message = err?.error?.message || err?.error || err?.message;
            return cleanClientError(response.status, message);
        }

        return cleanClientError(response.status, await response.text().catch(() => ""));
    }

    function cleanClientError(status, raw = "") {
        const text = String(raw || "").toLowerCase();

        if (
            status === 429 ||
            text.includes("rate limit") ||
            text.includes("tpm") ||
            text.includes("too many") ||
            text.includes("context length") ||
            (text.includes("token") && text.includes("limit"))
        ) {
            return "Token limit reached. Please wait about 1 minute.";
        }

        if (text.includes("failed to fetch") || text.includes("network") || text.includes("backend unreachable")) {
            return "Connection issue detected. Please retry.";
        }

        if (status === 401) {
            setTimeout(() => {
                window.location.href = "/login?redirect_url=/chat";
            }, 2000);
            return "Session expired. Redirecting to login...";
        }

        if (status === 403) {
            return raw || "Access denied.";
        }

        if (
            status >= 500 ||
            text.includes("api key") ||
            text.includes("groq_api_key") ||
            text.includes("organization") ||
            text.includes("billing")
        ) {
            return "Server is busy right now. Please try again shortly.";
        }

        return raw || "Something went wrong. Please try again.";
    }

    async function getResponse(content, history = []) {
        const modelSelect = document.getElementById("modelSelect");
        const maxTokensSelect = document.getElementById("maxTokens");
        const selectedModelValue = modelSelect ? modelSelect.value : "llama-3.3-70b-versatile";
        const selectedMaxTokens = maxTokensSelect ? parseInt(maxTokensSelect.value, 10) : 256;
        const maxTokens = Number.isFinite(selectedMaxTokens) ? Math.min(selectedMaxTokens, 512) : 256;
        const requestBody = JSON.stringify({
            selectedModel: selectedModelValue,
            maxTokens,
            content,
            history
        });

        const endpoints = getApiCandidates();
        let lastError = "Server Error";
        const networkFailures = [];

        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: requestBody
                });

                if (!response.ok) {
                    const message = await parseErrorResponse(response);
                    lastError = message || `Request failed for ${endpoint}`;
                    continue;
                }

                const data = await response.json().catch(() => ({}));
                return data.output || data.reply || "";
            } catch (error) {
                const message = error?.message || "Network error";
                networkFailures.push(endpoint);
                lastError = cleanClientError(0, message);
            }
        }

        if (networkFailures.length === endpoints.length) {
            throw new Error("Connection issue detected. Please retry.");
        }

        throw new Error(lastError);
    }

    window.LexinoApi = {
        getResponse
    };
})();
