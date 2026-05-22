function extractMessage(body) {
  if (typeof body?.message === "string" && body.message.trim()) {
    return body.message.trim();
  }

  if (typeof body?.content === "string" && body.content.trim()) {
    return body.content.trim();
  }

  if (Array.isArray(body?.content)) {
    const textParts = body.content
      .filter((item) => item && item.type === "text" && typeof item.text === "string")
      .map((item) => item.text.trim())
      .filter(Boolean);

    if (textParts.length) return textParts.join("\n\n");
  }

  return "Hello";
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = (process.env.GROQ_API_KEY || "").trim();
    if (!token) {
      return res.status(500).json({
        error: "Server misconfigured: GROQ_API_KEY is missing."
      });
    }

    const parsedBody = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const selectedModel = typeof parsedBody.selectedModel === "string" && parsedBody.selectedModel.trim()
      ? parsedBody.selectedModel.trim()
      : "llama-3.3-70b-versatile";
    const maxTokens = Number(parsedBody.maxTokens);
    const safeMaxTokens = Number.isFinite(maxTokens) && maxTokens > 0 ? Math.min(Math.floor(maxTokens), 32768) : 2000;
    const message = extractMessage(parsedBody);
    const history = Array.isArray(parsedBody.history)
      ? parsedBody.history
          .filter((item) => item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string")
          .slice(-20)
      : [];

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [...history, { role: "user", content: message }],
        max_tokens: safeMaxTokens
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data?.error?.message || `Groq API request failed with HTTP ${response.status}`;
      return res.status(response.status).json({ error: message });
    }

    const reply = data?.choices?.[0]?.message?.content || "";
    res.status(200).json({
      reply,
      output: reply
    });
  } catch (error) {
    console.error("api/chat failure:", error);
    const message = error instanceof Error ? error.message : "Something went wrong";
    res.status(500).json({ error: message });
  }
}
