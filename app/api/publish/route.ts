/**
 * POST /api/publish — SSE streaming endpoint.
 * Orchestrates: scrape → AI rewrite per site (5 concurrent) → WP publish → save DB → stream events.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { scrapeUrl } from "@/lib/scraper";
import { rewriteWithGrok } from "@/lib/ai";
import { publishToWordPress } from "@/lib/wordpress";
import { runWithConcurrency } from "@/lib/queue";

const MAX_CONCURRENCY = 5;

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min max for large batches

function sseEvent(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sourceUrls: string[] = body.sourceUrls ?? [];
  const siteIds: number[] = body.siteIds ?? [];
  const postStatus: "draft" | "publish" = body.status === "publish" ? "publish" : "draft";
  const language: string = body.language ?? "english";

  if (!sourceUrls.length || !siteIds.length) {
    return new Response("sourceUrls and siteIds required", { status: 400 });
  }

  // Load API key + custom prompt from settings
  const apiKeySetting = await prisma.setting.findUnique({ where: { key: "grok_api_key" } });
  const promptSetting = await prisma.setting.findUnique({ where: { key: "custom_prompt" } });

  const apiKey = process.env.GROK_API_KEY || apiKeySetting?.value;
  if (!apiKey) {
    return new Response("Grok API key not configured in Settings or Environment", { status: 400 });
  }

  const customPrompt = promptSetting?.value ?? undefined;

  // Load sites
  const sites = await prisma.site.findMany({
    where: { id: { in: siteIds } },
  });

  if (!sites.length) {
    return new Response("No valid sites found", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(sseEvent(data)));
      }

      let totalSuccess = 0;
      let totalFail = 0;

      for (const sourceUrl of sourceUrls) {
        // 1. Scrape the source URL once
        send({ type: "scraping", url: sourceUrl });
        let scraped;
        try {
          scraped = await scrapeUrl(sourceUrl);
        } catch (err: any) {
          send({ type: "error", url: sourceUrl, error: `Scrape failed: ${err.message}` });
          totalFail += sites.length;
          continue;
        }

        send({ type: "scraped", url: sourceUrl, title: scraped.title });

        // 2. Save article record
        const article = await prisma.article.create({
          data: { sourceUrl, scrapedTitle: scraped.title },
        });

        // 3. Create one task per site: AI rewrite + WP publish
        const tasks = sites.map((site) => async () => {
          // Notify start
          send({ type: "rewriting", siteId: site.id, siteName: site.name, url: sourceUrl });

          // UI-selected language always overrides the site's stored default
          const siteLanguage = language || site.language || "english";

          // Create pending PubJob
          const job = await prisma.pubJob.create({
            data: {
              articleId: article.id,
              siteId: site.id,
              status: "processing",
            },
          });

          try {
            // AI rewrite — unique per site, title preserved
            const rewritten = await rewriteWithGrok(
              scraped.content,
              scraped.title,
              siteLanguage,
              apiKey,
              customPrompt
            );

            // Publish to WP
            const result = await publishToWordPress(site.url, site.token, {
              title: rewritten.title,
              content: rewritten.content,
              slug: rewritten.slug,
              metaDescription: rewritten.metaDescription,
              focusKeyword: rewritten.focusKeyword,
              tags: rewritten.tags,
              imageUrl: scraped.imageUrl ?? undefined,
              status: postStatus,
            });

            if (result.success) {
              await prisma.pubJob.update({
                where: { id: job.id },
                data: { status: "success", wpPostId: result.postId, permalink: result.permalink },
              });

              send({
                type: "success",
                siteId: site.id,
                siteName: site.name,
                permalink: result.permalink,
                postId: result.postId,
                sourceUrl,
              });
              totalSuccess++;
            } else {
              await prisma.pubJob.update({
                where: { id: job.id },
                data: { status: "error", error: result.error },
              });

              send({
                type: "error",
                siteId: site.id,
                siteName: site.name,
                error: result.error,
                sourceUrl,
              });
              totalFail++;
            }
          } catch (err: any) {
            await prisma.pubJob.update({
              where: { id: job.id },
              data: { status: "error", error: err.message },
            });

            send({
              type: "error",
              siteId: site.id,
              siteName: site.name,
              error: err.message,
              sourceUrl,
            });
            totalFail++;
          }
        });

        // 4. Run all site tasks with max 5 concurrent
        await runWithConcurrency(tasks, MAX_CONCURRENCY);
      }

      send({ type: "complete", totalSuccess, totalFail });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
