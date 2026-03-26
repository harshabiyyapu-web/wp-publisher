/**
 * WordPress REST client — calls the ccr/v1/publish endpoint on each WP site.
 */

export interface PublishPayload {
  title: string;
  content: string;
  slug: string;
  metaDescription: string;
  focusKeyword: string;
  tags: string[];
  categoryId?: number;
  authorId?: number;
  imageUrl?: string;
  status: "draft" | "publish";
}

export interface PublishResult {
  success: true;
  postId: number;
  permalink: string;
  status: string;
  site: string;
}

export interface PublishError {
  success: false;
  error: string;
}

/**
 * Publish one article to one WP site via the ccr/v1/publish endpoint.
 */
export async function publishToWordPress(
  siteUrl: string,
  token: string,
  payload: PublishPayload
): Promise<PublishResult | PublishError> {
  const endpoint = `${siteUrl.replace(/\/$/, "")}/wp-json/ccr/v1/publish`;

  const body = {
    title: payload.title,
    content: payload.content,
    slug: payload.slug,
    meta_description: payload.metaDescription,
    focus_keyword: payload.focusKeyword,
    tags: payload.tags,
    category_id: payload.categoryId ?? 0,
    author_id: payload.authorId ?? 0,
    image_url: payload.imageUrl ?? "",
    status: payload.status,
  };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CCR-Token": token,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.message ?? data.data?.message ?? `HTTP ${res.status}`,
      };
    }

    return {
      success: true,
      postId: data.post_id,
      permalink: data.permalink,
      status: data.status,
      site: data.site ?? siteUrl,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message ?? "Unknown error",
    };
  }
}

/**
 * Test connection to a WP site's health endpoint.
 */
export async function testConnection(
  siteUrl: string,
  token: string
): Promise<{ ok: boolean; siteName?: string; error?: string }> {
  const endpoint = `${siteUrl.replace(/\/$/, "")}/wp-json/ccr/v1/health`;

  try {
    const res = await fetch(endpoint, {
      headers: { "X-CCR-Token": token },
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json();
    if (res.ok && data.status === "ok") {
      return { ok: true, siteName: data.site };
    }
    return { ok: false, error: data.message ?? `HTTP ${res.status}` };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? "Connection failed" };
  }
}
