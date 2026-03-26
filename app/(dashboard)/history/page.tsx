"use client";

import { useEffect, useState } from "react";

interface PubJob {
  id: number;
  status: string;
  permalink: string | null;
  error: string | null;
  createdAt: string;
  site: { id: number; name: string; url: string; group: { name: string; color: string } | null };
}

interface Article {
  id: number;
  sourceUrl: string;
  scrapedTitle: string;
  createdAt: string;
  pubJobs: PubJob[];
}

export default function HistoryPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);
  const LIMIT = 20;

  useEffect(() => {
    fetch(`/api/history?page=${page}&limit=${LIMIT}`)
      .then((r) => r.json())
      .then((d) => { setArticles(d.articles); setTotal(d.total); });
  }, [page]);

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function copyLinks(jobs: PubJob[], siteName?: string) {
    const links = jobs
      .filter((j) => j.status === "success" && j.permalink && (!siteName || j.site.name === siteName))
      .map((j) => j.permalink)
      .join("\n");
    navigator.clipboard.writeText(links);
    const key = siteName ?? "all";
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  // Group jobs by site for display
  function jobsBySite(jobs: PubJob[]) {
    const map: Record<string, PubJob[]> = {};
    for (const j of jobs) {
      if (!map[j.site.name]) map[j.site.name] = [];
      map[j.site.name].push(j);
    }
    return map;
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">History</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} articles published</p>
        </div>
      </div>

      <div className="space-y-2">
        {articles.length === 0 && (
          <div className="text-center py-16 text-gray-400">No published articles yet.</div>
        )}
        {articles.map((article) => {
          const success = article.pubJobs.filter((j) => j.status === "success").length;
          const fail = article.pubJobs.filter((j) => j.status !== "success").length;
          const isExpanded = expanded.has(article.id);
          const bySite = jobsBySite(article.pubJobs);

          return (
            <div key={article.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Row header */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
                onClick={() => toggle(article.id)}
              >
                <span className="text-gray-400 text-xs">{isExpanded ? "▼" : "▶"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{article.scrapedTitle || article.sourceUrl}</p>
                  <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-gray-400 hover:underline truncate block" onClick={(e) => e.stopPropagation()}>
                    {article.sourceUrl}
                  </a>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-xs">
                  <span className="text-green-600 font-medium">✓ {success}</span>
                  {fail > 0 && <span className="text-red-500 font-medium">✗ {fail}</span>}
                  <span className="text-gray-400">{new Date(article.createdAt).toLocaleDateString()}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); copyLinks(article.pubJobs); }}
                    className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 font-medium"
                  >
                    {copied === "all" ? "Copied!" : `Copy all (${success})`}
                  </button>
                </div>
              </div>

              {/* Expanded: per-site breakdown */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-3 space-y-3">
                  {Object.entries(bySite).map(([siteName, jobs]) => {
                    const siteSuccess = jobs.filter((j) => j.status === "success");
                    return (
                      <div key={siteName}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-700">{siteName}</span>
                          {siteSuccess.length > 0 && (
                            <button
                              onClick={() => copyLinks(jobs, siteName)}
                              className="text-xs text-indigo-600 hover:underline"
                            >
                              {copied === siteName ? "Copied!" : `Copy (${siteSuccess.length})`}
                            </button>
                          )}
                        </div>
                        <div className="space-y-0.5">
                          {jobs.map((j) => (
                            <div key={j.id} className="flex items-center gap-2 text-xs">
                              {j.status === "success" ? (
                                <>
                                  <span className="text-green-500">✓</span>
                                  <a href={j.permalink!} target="_blank" rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline truncate">
                                    {j.permalink}
                                  </a>
                                  <span className="text-gray-400 flex-shrink-0">
                                    {new Date(j.createdAt).toLocaleTimeString()}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="text-red-500">✗</span>
                                  <span className="text-red-600">{j.error ?? "Failed"}</span>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 border border-gray-200 rounded text-sm disabled:opacity-40">← Prev</button>
          <span className="px-3 py-1.5 text-sm text-gray-600">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1.5 border border-gray-200 rounded text-sm disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  );
}
