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
    const token = (process.env.HF_TOKEN || "").trim();
    if (!token || !token.trim()) {
      return res.status(500).json({
        error: "Server misconfigured: HF_TOKEN is missing."
      });
    }

    const parsedBody = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { InferenceClient } = await import("@huggingface/inference");
    const client = new InferenceClient(token);
    const selectedModel = typeof parsedBody.selectedModel === "string" && parsedBody.selectedModel.trim()
      ? parsedBody.selectedModel.trim()
      : "meta-llama/Meta-Llama-3-8B-Instruct";
    const maxTokens = Number(parsedBody.maxTokens);
    const safeMaxTokens = Number.isFinite(maxTokens) && maxTokens > 0 ? Math.min(Math.floor(maxTokens), 4096) : 150;
    const message = extractMessage(parsedBody);
    const history = Array.isArray(parsedBody.history)
      ? parsedBody.history
          .filter((item) => item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string")
          .slice(-20)
      : [];

    const response = await client.chatCompletion({
      model: selectedModel,
      messages: [...history, { role: "user", content: message }],
      max_tokens: safeMaxTokens
    });

    const reply = response?.choices?.[0]?.message?.content || "";
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
