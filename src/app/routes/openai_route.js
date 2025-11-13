import { Router } from "express";
export const openaiRouter = Router();

openaiRouter.post("/openai-api", async (req, res) => {
  try {
    const { address, zoning, basePrompt } = req.body || {};
    const key = process.env.OPENAI_API_KEY;
    if (!key) return res.status(400).json({ error: "Missing OPENAI_API_KEY" });

    const finalPrompt = `Address: ${address}\nZone Class: ${zoning || "unknown"}\n\n${basePrompt || ""}`;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL,
        messages: [{ role: "user", content: finalPrompt }],
      }),
    });

    const raw = await r.text();
    let data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      return res.status(502).json({ error: "OpenAI returned non-JSON", raw });
    }
    const reply = data?.choices?.[0]?.message?.content ?? "";

    console.log("OpenAI response data:", reply);
    if (!r.ok) return res.status(r.status).json({ error: data || "OpenAI API error" });
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});