/**
 * AI rewrite engine — Grok 4.1 Fast via OpenRouter only.
 * Ports PHP rewrite_with_ai + parse_ai_response from claude-content-rewriter.php
 */

import { getLanguagePrompt } from "./prompt";

export interface RewrittenArticle {
  title: string;
  slug: string;
  metaDescription: string;
  focusKeyword: string;
  tags: string[];
  content: string;
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const GROK_MODEL = "x-ai/grok-4.1-fast";

export async function rewriteWithGrok(
  scrapedContent: string,
  originalTitle: string,
  language: string,
  apiKey: string,
  customPrompt?: string
): Promise<RewrittenArticle> {
  const resolvedKey = apiKey;
  const { system, user } = getLanguagePrompt(language, customPrompt);

  // Prepend title explicitly so AI knows what to preserve
  const fullUserPrompt =
    `SOURCE TITLE (KEEP EXACTLY AS-IS): ${originalTitle}\n\n` +
    user +
    `\n\n---\nContent:\n---\n\n` +
    scrapedContent;

  const body = {
    model: GROK_MODEL,
    max_tokens: 8192,
    temperature: 0.7,
    messages: [
      { role: "system", content: system },
      { role: "user", content: fullUserPrompt },
    ],
  };

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resolvedKey}`,
      "HTTP-Referer": "https://wp-publisher.local",
      "X-Title": "WP Multi-Site Publisher",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${errText}`);
  }

  const data = await res.json();

  if (data.error) {
    throw new Error(`Grok API error: ${JSON.stringify(data.error)}`);
  }

  const text: string = data.choices?.[0]?.message?.content ?? "";
  if (!text) {
    throw new Error("Empty response from Grok");
  }

  return parseAiResponse(text, originalTitle);
}

/**
 * Parse the structured AI response (TITLE / SLUG / META / TAGS / CONTENT format).
 * Ports PHP parse_ai_response exactly.
 */
function parseAiResponse(text: string, originalTitle: string): RewrittenArticle {
  const titleMatch = text.match(/TITLE:\s*(.+?)(?=SLUG:|META_DESCRIPTION:|TAGS:|CONTENT:|$)/s);
  const slugMatch = text.match(/SLUG:\s*(.+?)(?=META_DESCRIPTION:|TAGS:|CONTENT:|$)/s);
  const metaMatch = text.match(/META_DESCRIPTION:\s*(.+?)(?=TAGS:|CONTENT:|$)/s);
  const tagsMatch = text.match(/TAGS:\s*(.+?)(?=CONTENT:|$)/s);
  const contentMatch = text.match(/CONTENT:\s*(.+)/s);

  let content = contentMatch?.[1]?.trim() ?? "";
  if (!content) {
    // fallback: strip known labels
    content = text
      .replace(/^(TITLE|SLUG|META_DESCRIPTION|TAGS):.+?(\n|$)/gm, "")
      .trim();
  }

  content = convertMarkdownToHtml(content);

  // Title: always use the original (preserve_title is always on)
  let aiTitle = titleMatch?.[1]?.trim().replace(/\*\*/g, "").trim() ?? "";
  // Use original title always
  const title = originalTitle || aiTitle || "Rewritten Article";

  const slug = slugMatch?.[1]?.trim() ?? "";
  const metaDescription = metaMatch?.[1]?.trim() ?? "";
  const tagsStr = tagsMatch?.[1]?.trim() ?? "";
  const tags = tagsStr
    ? tagsStr.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  // Derive focus keyword from first tag or first few words of title
  const focusKeyword = tags[0] ?? title.split(" ").slice(0, 3).join(" ");

  return { title, slug, metaDescription, focusKeyword, tags, content };
}

function convertMarkdownToHtml(content: string): string {
  return content
    .replace(/\*\*(.+?)\*\*/gs, "<strong>$1</strong>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^#### (.+)$/gm, "<h4>$1</h4>");
}
