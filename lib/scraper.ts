/**
 * URL scraper — ports PHP extract_content + extract_featured_image from claude-content-rewriter.php
 */

import * as cheerio from "cheerio";

export interface ScrapedArticle {
  title: string;
  content: string;
  imageUrl: string | null;
  imageAlt: string;
}

const FETCH_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

async function fetchWithRetry(url: string, retries = 2): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: FETCH_HEADERS,
        redirect: "follow",
        signal: AbortSignal.timeout(30_000),
      });
      return res;
    } catch (err: any) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }
  throw new Error(`fetch failed after ${retries + 1} attempts: ${lastError?.message ?? "unknown error"}`);
}

export async function scrapeUrl(url: string): Promise<ScrapedArticle> {
  const res = await fetchWithRetry(url);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  // Remove noisy elements
  $("script, style, nav, header, footer, .ad, .ads, .advertisement, .sidebar, .widget").remove();

  // Extract title — og:title > <title> > first h1
  const rawTitle =
    $('meta[property="og:title"]').attr("content") ||
    $("title").first().text().trim() ||
    $("h1").first().text().trim() ||
    "Untitled";

  // Strip site name suffix: "Article Title - Site Name" → "Article Title"
  const title = stripSiteNameSuffix(rawTitle);

  // Extract content — try common article selectors
  const contentSelectors = [
    "article",
    ".post-content",
    ".entry-content",
    ".article-content",
    ".article-body",
    ".content-body",
    "main",
    ".content",
  ];

  let contentHtml = "";
  for (const sel of contentSelectors) {
    const el = $(sel).first();
    if (el.length && el.text().trim().length > 200) {
      contentHtml = el.html() ?? "";
      break;
    }
  }

  if (!contentHtml) {
    contentHtml = $("body").html() ?? "";
  }

  // Strip to allowed tags (mirrors PHP strip_tags)
  const allowed = new Set(["p", "br", "h1", "h2", "h3", "h4", "ul", "ol", "li", "strong", "em", "blockquote"]);
  const $c = cheerio.load(contentHtml);
  $c("*").each((_, el) => {
    if (el.type === "tag" && !allowed.has(el.name)) {
      $c(el).replaceWith($c(el).html() ?? "");
    }
  });
  const content = $c.html() ?? contentHtml;

  // Extract featured image — og:image > twitter:image > first article img
  let imageUrl: string | null =
    $('meta[property="og:image"]').attr("content") ||
    $('meta[name="twitter:image"]').attr("content") ||
    null;

  let imageAlt = "";

  if (!imageUrl) {
    const imgSelectors = [
      "article img",
      ".featured-image img",
      ".wp-post-image",
      "figure img",
      ".post-thumbnail img",
    ];
    for (const sel of imgSelectors) {
      const img = $(sel).first();
      if (img.length) {
        const src = img.attr("src") ?? "";
        if (src && !/logo|icon|avatar|sprite|button/i.test(src)) {
          imageUrl = resolveUrl(src, url);
          imageAlt = img.attr("alt") ?? "";
          break;
        }
      }
    }
  }

  if (imageUrl) {
    imageUrl = resolveUrl(imageUrl, url);
    // Filter out logos/icons
    if (/logo|icon|avatar|sprite|button/i.test(imageUrl)) {
      imageUrl = null;
    }
  }

  return {
    title: title.slice(0, 300),
    content: content.trim(),
    imageUrl,
    imageAlt,
  };
}

/**
 * Strip site name from title tag: "Article Title - Site Name" → "Article Title"
 * Finds the LAST separator and returns everything before it.
 * Handles: " - ", " | ", " – ", " — " and site names containing hyphens.
 */
function stripSiteNameSuffix(title: string): string {
  const sep = /\s+[-|–—]\s+/g;
  let lastIndex = -1;
  let m;
  while ((m = sep.exec(title)) !== null) {
    lastIndex = m.index;
  }
  if (lastIndex > 4) {
    return title.substring(0, lastIndex).trim();
  }
  return title;
}

function resolveUrl(src: string, base: string): string {
  if (/^https?:\/\//i.test(src)) return src;
  try {
    return new URL(src, base).href;
  } catch {
    return src;
  }
}
