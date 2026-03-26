"use client";

import { useEffect, useRef, useState } from "react";

interface Site {
  id: number;
  name: string;
  url: string;
  language: string;
  groupId: number | null;
  group: { id: number; name: string; color: string; geography: string } | null;
}

interface Group {
  id: number;
  name: string;
  geography: string;
  color: string;
  sites: { id: number; name: string }[];
}

interface LogEntry {
  type: string;
  siteName?: string;
  siteId?: number;
  permalink?: string;
  error?: string;
  url?: string;
  title?: string;
  message?: string;
  successCount?: number;
  failCount?: number;
}

interface PublishedLink {
  siteId: number;
  siteName: string;
  siteGroupId?: number | null;
  permalink: string;
  sourceUrl: string;
}

const LANGUAGES = [
  { value: "english", label: "English" },
  { value: "hindi", label: "Hindi" },
  { value: "spanish", label: "Spanish" },
  { value: "telugu", label: "Telugu" },
  { value: "polish", label: "Polish" },
  { value: "italian", label: "Italian" },
  { value: "japanese", label: "Japanese" },
  { value: "german", label: "German" },
  { value: "dutch", label: "Dutch" },
  { value: "swedish", label: "Swedish" },
  { value: "french", label: "French" },
  { value: "tamil", label: "Tamil" },
  { value: "marathi", label: "Marathi" },
  { value: "gujarati", label: "Gujarati" },
];

export default function PublisherPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [urlsText, setUrlsText] = useState("");
  const [selectedSiteIds, setSelectedSiteIds] = useState<Set<number>>(new Set());
  const [language, setLanguage] = useState("english");
  const [postStatus, setPostStatus] = useState<"draft" | "publish">("draft");
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [publishedLinks, setPublishedLinks] = useState<PublishedLink[]>([]);
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [resultGroupFilter] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/sites").then((r) => r.json()),
      fetch("/api/groups").then((r) => r.json()),
    ]).then(([s, g]) => {
      setSites(s);
      setGroups(g);
    });
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  function toggleSite(id: number) {
    setSelectedSiteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectGroup(groupId: number) {
    const groupSiteIds = sites.filter((s) => s.groupId === groupId).map((s) => s.id);
    setSelectedSiteIds((prev) => {
      const next = new Set(prev);
      const allSelected = groupSiteIds.every((id) => next.has(id));
      if (allSelected) groupSiteIds.forEach((id) => next.delete(id));
      else groupSiteIds.forEach((id) => next.add(id));
      return next;
    });
  }

  function selectAll() { setSelectedSiteIds(new Set(sites.map((s) => s.id))); }
  function deselectAll() { setSelectedSiteIds(new Set()); }

  async function startPublish() {
    const sourceUrls = urlsText.split("\n").map((u) => u.trim()).filter(Boolean);
    if (!sourceUrls.length) { alert("Please enter at least one URL"); return; }
    if (selectedSiteIds.size === 0) { alert("Please select at least one site"); return; }

    setIsRunning(true);
    setLogs([]);
    setPublishedLinks([]);
    setSuccessCount(0);
    setFailCount(0);
    setIsDone(false);
    // reset result view

    const res = await fetch("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceUrls, siteIds: Array.from(selectedSiteIds), status: postStatus, language }),
    });

    if (!res.ok || !res.body) {
      setLogs([{ type: "error", message: await res.text() }]);
      setIsRunning(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const dataLine = line.trim();
        if (!dataLine.startsWith("data:")) continue;
        try {
          const event: LogEntry = JSON.parse(dataLine.slice(5).trim());
          setLogs((prev) => [...prev, event]);
          if (event.type === "success" && event.permalink && event.siteName) {
            const site = sites.find((s) => s.id === event.siteId);
            setPublishedLinks((prev) => [
              ...prev,
              { siteId: event.siteId!, siteName: event.siteName!, siteGroupId: site?.groupId ?? null, permalink: event.permalink!, sourceUrl: event.url ?? "" },
            ]);
            setSuccessCount((c) => c + 1);
          }
          if (event.type === "error") setFailCount((c) => c + 1);
          if (event.type === "complete") { setIsDone(true); setIsRunning(false); }
        } catch {}
      }
    }
    setIsRunning(false);
    setIsDone(true);
  }

  // Group published links by site
  const filteredLinks = resultGroupFilter
    ? publishedLinks.filter((l) => l.siteGroupId === resultGroupFilter)
    : publishedLinks;

  const linksBySite = filteredLinks.reduce<Record<string, PublishedLink[]>>((acc, l) => {
    if (!acc[l.siteName]) acc[l.siteName] = [];
    acc[l.siteName].push(l);
    return acc;
  }, {});

  function copyLinks(links: string[], key: string) {
    navigator.clipboard.writeText(links.join("\n"));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  }

  const inputClass = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";
  const selectClass = "border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Publisher</h1>
        <p className="text-sm text-slate-500 mt-0.5">Paste article URLs, select target sites, and publish with AI rewrites in parallel.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          {/* URL input card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Source URLs <span className="font-normal normal-case text-slate-400">— one per line</span>
            </label>
            <textarea
              value={urlsText}
              onChange={(e) => setUrlsText(e.target.value)}
              rows={5}
              className={`${inputClass} font-mono resize-y`}
              placeholder={"https://example.com/article-1\nhttps://example.com/article-2"}
              disabled={isRunning}
            />
          </div>

          {/* Settings row */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-36">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Language</label>
                <select value={language} onChange={(e) => setLanguage(e.target.value)} disabled={isRunning} className={`w-full ${selectClass}`}>
                  {LANGUAGES.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-36">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Post Status</label>
                <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                  {(["draft", "publish"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setPostStatus(s)}
                      disabled={isRunning}
                      className="flex-1 py-2 text-sm font-medium transition-colors capitalize"
                      style={{
                        background: postStatus === s ? "#6366f1" : "#fff",
                        color: postStatus === s ? "#fff" : "#64748b",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={startPublish}
                disabled={isRunning || selectedSiteIds.size === 0}
                className="flex-shrink-0 px-6 py-2 rounded-lg text-sm font-semibold text-white transition-all"
                style={{
                  background: isRunning || selectedSiteIds.size === 0
                    ? "#a5b4fc"
                    : "linear-gradient(135deg, #6366f1, #7c3aed)",
                  boxShadow: isRunning || selectedSiteIds.size === 0 ? "none" : "0 4px 14px rgba(99,102,241,0.4)",
                }}
              >
                {isRunning
                  ? `Publishing... (${selectedSiteIds.size} sites)`
                  : selectedSiteIds.size === 0
                  ? "Select sites first"
                  : `Publish to ${selectedSiteIds.size} site${selectedSiteIds.size !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>

          {/* Live log */}
          {(logs.length > 0 || isRunning) && (
            <div className="rounded-2xl overflow-hidden" style={{ background: "#0d1117" }}>
              <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: isRunning ? "#22c55e" : "#6b7280", boxShadow: isRunning ? "0 0 6px #22c55e" : "none" }} />
                  <span className="text-xs font-semibold" style={{ color: "#8b949e" }}>Live Log</span>
                </div>
                {isDone && (
                  <span className="text-xs" style={{ color: "#8b949e" }}>
                    <span style={{ color: "#22c55e" }}>✓ {successCount} success</span>
                    {failCount > 0 && <span style={{ color: "#f87171" }}> · ✗ {failCount} failed</span>}
                  </span>
                )}
              </div>
              <div ref={logRef} className="h-52 overflow-y-auto px-5 py-3 font-mono text-xs space-y-0.5">
                {logs.map((log, i) => (
                  <div
                    key={i}
                    style={{
                      color: log.type === "success" ? "#4ade80"
                        : log.type === "error" ? "#f87171"
                        : log.type === "complete" ? "#fbbf24"
                        : "#6b7280",
                      fontWeight: log.type === "complete" ? 700 : 400,
                    }}
                  >
                    {formatLog(log)}
                  </div>
                ))}
                {isRunning && (
                  <div className="animate-pulse" style={{ color: "#4b5563" }}>● Processing...</div>
                )}
              </div>
            </div>
          )}

          {/* Results panel */}
          {isDone && publishedLinks.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-slate-900">Published Links</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{publishedLinks.length} links across {Object.keys(linksBySite).length} sites</p>
                </div>
                <button
                  onClick={() => copyLinks(publishedLinks.map((l) => l.permalink), "all")}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
                  style={{ background: copiedKey === "all" ? "#dcfce7" : "#eef2ff", color: copiedKey === "all" ? "#16a34a" : "#6366f1" }}
                >
                  {copiedKey === "all" ? "✓ Copied!" : `Copy all (${publishedLinks.length})`}
                </button>
              </div>

              {/* Per-group one-click copy buttons */}
              {groups.length > 0 && (
                <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Copy by Group</p>
                  <div className="flex flex-wrap gap-2">
                    {groups.map((g) => {
                      const groupLinks = publishedLinks.filter((l) => l.siteGroupId === g.id);
                      if (groupLinks.length === 0) return null;
                      const copyKey = `group-${g.id}`;
                      return (
                        <button
                          key={g.id}
                          onClick={() => copyLinks(groupLinks.map((l) => l.permalink), copyKey)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                          style={{
                            borderColor: copiedKey === copyKey ? "#22c55e" : g.color,
                            background: copiedKey === copyKey ? "#dcfce7" : g.color + "12",
                            color: copiedKey === copyKey ? "#16a34a" : g.color,
                          }}
                        >
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: copiedKey === copyKey ? "#16a34a" : g.color }} />
                          {copiedKey === copyKey ? "✓ Copied!" : `${g.name} (${groupLinks.length})`}
                        </button>
                      );
                    })}
                    {/* Sites with no group */}
                    {(() => {
                      const ungrouped = publishedLinks.filter((l) => !l.siteGroupId);
                      if (!ungrouped.length) return null;
                      return (
                        <button
                          onClick={() => copyLinks(ungrouped.map((l) => l.permalink), "ungrouped")}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                          style={{
                            borderColor: copiedKey === "ungrouped" ? "#22c55e" : "#94a3b8",
                            background: copiedKey === "ungrouped" ? "#dcfce7" : "#f1f5f9",
                            color: copiedKey === "ungrouped" ? "#16a34a" : "#64748b",
                          }}
                        >
                          {copiedKey === "ungrouped" ? "✓ Copied!" : `No group (${ungrouped.length})`}
                        </button>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Per-site breakdown */}
              <div className="space-y-2">
                {Object.entries(linksBySite).map(([siteName, links]) => (
                  <div key={siteName} className="rounded-xl border border-slate-100 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50">
                      <span className="text-sm font-medium text-slate-700">{siteName}</span>
                      <button
                        onClick={() => copyLinks(links.map((l) => l.permalink), siteName)}
                        className="text-xs font-medium px-2 py-1 rounded"
                        style={{ background: copiedKey === siteName ? "#dcfce7" : "#eef2ff", color: copiedKey === siteName ? "#16a34a" : "#6366f1" }}
                      >
                        {copiedKey === siteName ? "✓ Copied!" : `Copy (${links.length})`}
                      </button>
                    </div>
                    <div className="px-4 py-2 space-y-1">
                      {links.map((l, i) => (
                        <a key={i} href={l.permalink} target="_blank" rel="noopener noreferrer"
                          className="block text-xs hover:underline truncate"
                          style={{ color: "#6366f1" }}>
                          {l.permalink}
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: site selector */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col h-fit max-h-[calc(100vh-8rem)] sticky top-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Select Sites</h2>
              <p className="text-xs text-slate-400 mt-0.5">{selectedSiteIds.size} of {sites.length} selected</p>
            </div>
            <div className="flex gap-2 text-xs">
              <button onClick={selectAll} className="font-medium" style={{ color: "#6366f1" }}>All</button>
              <span className="text-slate-300">·</span>
              <button onClick={deselectAll} className="text-slate-400 hover:text-slate-600">None</button>
            </div>
          </div>

          {/* Group filter buttons */}
          {groups.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3 pb-3 border-b border-slate-100">
              {groups.map((g) => {
                const groupSiteIds = sites.filter((s) => s.groupId === g.id).map((s) => s.id);
                const allSelected = groupSiteIds.length > 0 && groupSiteIds.every((id) => selectedSiteIds.has(id));
                return (
                  <button
                    key={g.id}
                    onClick={() => selectGroup(g.id)}
                    className="px-2.5 py-1 text-xs font-medium rounded-full border transition-all"
                    style={{
                      borderColor: g.color,
                      color: allSelected ? "#fff" : g.color,
                      background: allSelected ? g.color : "transparent",
                    }}
                  >
                    {g.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* Site checkboxes */}
          <div className="flex-1 overflow-y-auto space-y-0.5 min-h-0">
            {sites.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs text-slate-400">No sites yet.</p>
                <a href="/sites" className="text-xs font-medium mt-1 block" style={{ color: "#6366f1" }}>Add your first site →</a>
              </div>
            ) : (
              sites.map((site) => (
                <label key={site.id} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSiteIds.has(site.id)}
                    onChange={() => toggleSite(site.id)}
                    disabled={isRunning}
                    className="rounded border-slate-300"
                    style={{ accentColor: "#6366f1" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{site.name}</p>
                    <p className="text-xs text-slate-400 truncate">{site.url}</p>
                  </div>
                  {site.group && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium"
                      style={{ background: site.group.color + "22", color: site.group.color }}>
                      {site.group.name}
                    </span>
                  )}
                </label>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatLog(log: LogEntry): string {
  const time = new Date().toLocaleTimeString("en-US", { hour12: false });
  switch (log.type) {
    case "scraping": return `[${time}] Scraping ${log.url}`;
    case "scraped": return `[${time}] Scraped: "${log.title}"`;
    case "rewriting": return `[${time}] [${log.siteName}] Rewriting...`;
    case "success": return `[${time}] ✓ [${log.siteName}] ${log.permalink}`;
    case "error": return `[${time}] ✗ [${log.siteName ?? ""}] ${log.error ?? log.message}`;
    case "complete": return `[${time}] ═══ DONE: ${log.successCount} ok · ${log.failCount} failed ═══`;
    default: return `[${time}] ${JSON.stringify(log)}`;
  }
}
