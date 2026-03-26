"use client";

import { useEffect, useState } from "react";

interface PubJob {
  id: number;
  status: string;
  permalink: string | null;
  error: string | null;
  createdAt: string;
  site: { id: number; name: string; url: string; group: { id: number; name: string; color: string } | null };
}

interface Article {
  id: number;
  sourceUrl: string;
  scrapedTitle: string;
  createdAt: string;
  pubJobs: PubJob[];
}

interface Group {
  id: number;
  name: string;
  color: string;
}

export default function HistoryPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [groupFilter, setGroupFilter] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const LIMIT = 20;

  useEffect(() => {
    fetch(`/api/history?page=${page}&limit=${LIMIT}`)
      .then((r) => r.json())
      .then((d) => { setArticles(d.articles); setTotal(d.total); });
    fetch("/api/groups").then((r) => r.json()).then(setGroups);
  }, [page]);

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAll() { setSelected(new Set(articles.map((a) => a.id))); }
  function deselectAll() { setSelected(new Set()); }

  function copyLinks(jobs: PubJob[], key: string, groupId?: number | null) {
    const links = jobs
      .filter((j) => j.status === "success" && j.permalink)
      .filter((j) => groupId == null || j.site.group?.id === groupId)
      .map((j) => j.permalink!)
      .join("\n");
    navigator.clipboard.writeText(links);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  }

  function copySelected() {
    const selectedArticles = articles.filter((a) => selected.has(a.id));
    const links = selectedArticles
      .flatMap((a) => a.pubJobs)
      .filter((j) => j.status === "success" && j.permalink)
      .filter((j) => groupFilter == null || j.site.group?.id === groupFilter)
      .map((j) => j.permalink!)
      .join("\n");
    navigator.clipboard.writeText(links);
    setCopiedKey("bulk");
    setTimeout(() => setCopiedKey(null), 1800);
  }

  function jobsBySite(jobs: PubJob[], groupId?: number | null) {
    const filtered = groupId != null ? jobs.filter((j) => j.site.group?.id === groupId) : jobs;
    const map: Record<string, PubJob[]> = {};
    for (const j of filtered) {
      if (!map[j.site.name]) map[j.site.name] = [];
      map[j.site.name].push(j);
    }
    return map;
  }

  const totalPages = Math.ceil(total / LIMIT);

  // Count selected links
  const selectedLinks = articles
    .filter((a) => selected.has(a.id))
    .flatMap((a) => a.pubJobs)
    .filter((j) => j.status === "success" && j.permalink)
    .filter((j) => groupFilter == null || j.site.group?.id === groupFilter);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">History</h1>
        <p className="text-sm text-slate-500 mt-0.5">{total} articles published</p>
      </div>

      {/* Bulk copy panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">Copy Links</p>
            <p className="text-xs text-slate-400">Select articles below, optionally filter by group, then copy all links</p>
          </div>

          <div className="flex-1" />

          {/* Group filter */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setGroupFilter(null)}
              className="px-2.5 py-1 text-xs font-medium rounded-full border transition-all"
              style={{
                borderColor: groupFilter === null ? "#6366f1" : "#e2e8f0",
                background: groupFilter === null ? "#6366f1" : "white",
                color: groupFilter === null ? "white" : "#64748b",
              }}
            >
              All Groups
            </button>
            {groups.map((g) => {
              const active = groupFilter === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => setGroupFilter(active ? null : g.id)}
                  className="px-2.5 py-1 text-xs font-medium rounded-full border transition-all"
                  style={{
                    borderColor: g.color,
                    background: active ? g.color : "transparent",
                    color: active ? "white" : g.color,
                  }}
                >
                  {g.name}
                </button>
              );
            })}
          </div>

          {selected.size > 0 ? (
            <button
              onClick={copySelected}
              className="px-4 py-2 text-sm font-semibold rounded-lg text-white transition-all"
              style={{
                background: copiedKey === "bulk" ? "#16a34a" : "linear-gradient(135deg, #6366f1, #7c3aed)",
                boxShadow: "0 2px 8px rgba(99,102,241,0.3)",
              }}
            >
              {copiedKey === "bulk" ? "✓ Copied!" : `Copy ${selectedLinks.length} link${selectedLinks.length !== 1 ? "s" : ""}`}
            </button>
          ) : (
            <button
              disabled
              className="px-4 py-2 text-sm font-semibold rounded-lg text-slate-400 border border-slate-200 bg-slate-50 cursor-not-allowed"
            >
              Select articles below
            </button>
          )}
        </div>

        {selected.size > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-3">
            <span className="text-xs text-slate-500">{selected.size} article{selected.size !== 1 ? "s" : ""} selected</span>
            <button onClick={deselectAll} className="text-xs text-slate-400 hover:text-slate-600">Clear selection</button>
          </div>
        )}
      </div>

      {/* Select all bar */}
      {articles.length > 0 && (
        <div className="flex items-center gap-3 mb-2 px-1">
          <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.size === articles.length && articles.length > 0}
              onChange={(e) => e.target.checked ? selectAll() : deselectAll()}
              style={{ accentColor: "#6366f1" }}
            />
            Select all on this page
          </label>
        </div>
      )}

      {/* Article list */}
      <div className="space-y-2">
        {articles.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
            <p className="text-slate-400">No published articles yet.</p>
          </div>
        )}
        {articles.map((article) => {
          const allJobs = article.pubJobs;
          const filteredJobs = groupFilter != null ? allJobs.filter((j) => j.site.group?.id === groupFilter) : allJobs;
          const success = filteredJobs.filter((j) => j.status === "success").length;
          const fail = filteredJobs.filter((j) => j.status !== "success").length;
          const isExpanded = expanded.has(article.id);
          const isSelected = selected.has(article.id);
          const bySite = jobsBySite(article.pubJobs, groupFilter);

          return (
            <div key={article.id}
              className="bg-white rounded-2xl border shadow-sm overflow-hidden transition-colors"
              style={{ borderColor: isSelected ? "#a5b4fc" : "#e2e8f0" }}>
              {/* Row header */}
              <div className="flex items-center gap-3 px-4 py-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(article.id)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ accentColor: "#6366f1" }}
                  className="flex-shrink-0"
                />
                <div
                  className="flex-1 min-w-0 cursor-pointer flex items-center gap-3"
                  onClick={() => toggle(article.id)}
                >
                  <span className="text-slate-300 text-xs flex-shrink-0">{isExpanded ? "▼" : "▶"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{article.scrapedTitle || article.sourceUrl}</p>
                    <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-slate-400 hover:underline truncate block" onClick={(e) => e.stopPropagation()}>
                      {article.sourceUrl}
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {success > 0 && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "#f0fdf4", color: "#16a34a" }}>
                      ✓ {success}
                    </span>
                  )}
                  {fail > 0 && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "#fef2f2", color: "#dc2626" }}>
                      ✗ {fail}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">{new Date(article.createdAt).toLocaleDateString()}</span>
                  {success > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); copyLinks(article.pubJobs, `article-${article.id}`, groupFilter); }}
                      className="text-xs font-medium px-2.5 py-1 rounded-lg transition-colors"
                      style={{
                        background: copiedKey === `article-${article.id}` ? "#dcfce7" : "#eef2ff",
                        color: copiedKey === `article-${article.id}` ? "#16a34a" : "#6366f1",
                      }}
                    >
                      {copiedKey === `article-${article.id}` ? "✓ Copied!" : `Copy (${success})`}
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded: per-site breakdown */}
              {isExpanded && (
                <div className="border-t border-slate-100 px-5 py-4 space-y-3">
                  {Object.entries(bySite).map(([siteName, jobs]) => {
                    const siteSuccess = jobs.filter((j) => j.status === "success");
                    const copyKey = `site-${article.id}-${siteName}`;
                    return (
                      <div key={siteName}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-700">{siteName}</span>
                            {jobs[0]?.site.group && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                                style={{ background: jobs[0].site.group.color + "18", color: jobs[0].site.group.color }}>
                                {jobs[0].site.group.name}
                              </span>
                            )}
                          </div>
                          {siteSuccess.length > 0 && (
                            <button
                              onClick={() => copyLinks(jobs, copyKey)}
                              className="text-xs font-medium px-2 py-0.5 rounded"
                              style={{
                                background: copiedKey === copyKey ? "#dcfce7" : "#eef2ff",
                                color: copiedKey === copyKey ? "#16a34a" : "#6366f1",
                              }}
                            >
                              {copiedKey === copyKey ? "✓ Copied!" : `Copy (${siteSuccess.length})`}
                            </button>
                          )}
                        </div>
                        <div className="space-y-1">
                          {jobs.map((j) => (
                            <div key={j.id} className="flex items-center gap-2 text-xs">
                              {j.status === "success" ? (
                                <>
                                  <span style={{ color: "#22c55e" }}>✓</span>
                                  <a href={j.permalink!} target="_blank" rel="noopener noreferrer"
                                    className="hover:underline truncate" style={{ color: "#6366f1" }}>
                                    {j.permalink}
                                  </a>
                                  <span className="text-slate-400 flex-shrink-0">
                                    {new Date(j.createdAt).toLocaleTimeString()}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="text-red-500">✗</span>
                                  <span className="text-red-500">{j.error ?? "Failed"}</span>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(bySite).length === 0 && (
                    <p className="text-xs text-slate-400">No results for the selected group filter.</p>
                  )}
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
            className="px-4 py-2 border border-slate-200 bg-white rounded-lg text-sm font-medium text-slate-600 disabled:opacity-40 hover:bg-slate-50">
            ← Prev
          </button>
          <span className="px-4 py-2 text-sm text-slate-600">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-4 py-2 border border-slate-200 bg-white rounded-lg text-sm font-medium text-slate-600 disabled:opacity-40 hover:bg-slate-50">
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
