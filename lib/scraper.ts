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

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; ContentBot/1.0; +https://example.com)",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "en-US,en;q=0.9",
};

export async function scrapeUrl(url: string): Promise<ScrapedArticle> {
  const res = await fetch(url, {
    headers: FETCH_HEADERS,
    signal: AbortSignal.timeout(30_000),
  });

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
