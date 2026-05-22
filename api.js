(() => {
    function getApiCandidates() {
        const sameOriginApi = "/api/chat";
        const { hostname, port } = window.location;

        const isLocal = hostname === "127.0.0.1" || hostname === "localhost";
        const localNodeApi = "http://127.0.0.1:3000/api/chat";

        if (isLocal) {
            if (port === "3000") return [sameOriginApi];
            if (port === "5500") return [localNodeApi, sameOriginApi];
            return [sameOriginApi, localNodeApi];
        }

        return [sameOriginApi];
    }

    async function parseErrorResponse(response) {
        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            const err = await response.json().catch(() => ({}));
            const message = err?.error?.message || err?.error || err?.message;
            return message || `HTTP ${response.status}`;
        }

        const raw = await response.text().catch(() => "");
        const clean = raw.replace(/\s+/g, " ").trim();
        return clean ? `${clean.slice(0, 180)} (HTTP ${response.status})` : `HTTP ${response.status}`;
    }

    async function getResponse(content, history = []) {
        const modelSelect = document.getElementById("modelSelect");
        const maxTokensSelect = document.getElementById("maxTokens");
        const selectedModelValue = modelSelect ? modelSelect.value : "llama-3.3-70b-versatile";
        const maxTokens = maxTokensSelect ? parseInt(maxTokensSelect.value, 10) : 2000;
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
                networkFailures.push(`${endpoint} -> ${message}`);
                lastError = message;
            }
        }

        if (networkFailures.length === endpoints.length) {
            throw new Error(`Backend unreachable. Details: ${networkFailures.join(" | ")}`);
        }

        throw new Error(lastError);
    }

    window.LexinoApi = {
        getResponse
    };
})();
