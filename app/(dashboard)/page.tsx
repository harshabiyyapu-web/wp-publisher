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
  permalink: string;
  sourceUrl: string;
}

const LANGUAGES = [
  { value: "english", label: "🇺🇸 English" },
  { value: "hindi", label: "🇮🇳 Hindi" },
  { value: "spanish", label: "🇪🇸 Spanish" },
  { value: "telugu", label: "🇮🇳 Telugu" },
  { value: "polish", label: "🇵🇱 Polish" },
  { value: "italian", label: "🇮🇹 Italian" },
  { value: "japanese", label: "🇯🇵 Japanese" },
  { value: "german", label: "🇩🇪 German" },
  { value: "dutch", label: "🇳🇱 Dutch" },
  { value: "swedish", label: "🇸🇪 Swedish" },
  { value: "french", label: "🇫🇷 French" },
  { value: "tamil", label: "🇮🇳 Tamil" },
  { value: "marathi", label: "🇮🇳 Marathi" },
  { value: "gujarati", label: "🇮🇳 Gujarati" },
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
      if (allSelected) {
        groupSiteIds.forEach((id) => next.delete(id));
      } else {
        groupSiteIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function selectAll() {
    setSelectedSiteIds(new Set(sites.map((s) => s.id)));
  }

  function deselectAll() {
    setSelectedSiteIds(new Set());
  }

  async function startPublish() {
    const sourceUrls = urlsText
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);

    if (!sourceUrls.length) {
      alert("Please enter at least one URL");
      return;
    }
    if (selectedSiteIds.size === 0) {
      alert("Please select at least one site");
      return;
    }

    setIsRunning(true);
    setLogs([]);
    setPublishedLinks([]);
    setSuccessCount(0);
    setFailCount(0);
    setIsDone(false);

    const res = await fetch("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceUrls,
        siteIds: Array.from(selectedSiteIds),
        status: postStatus,
        language,
      }),
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
            setPublishedLinks((prev) => [
              ...prev,
              {
                siteId: event.siteId!,
                siteName: event.siteName!,
                permalink: event.permalink!,
                sourceUrl: event.url ?? "",
              },
            ]);
            setSuccessCount((c) => c + 1);
          }
          if (event.type === "error" && event.siteName) {
            setFailCount((c) => c + 1);
          }
          if (event.type === "complete") {
            setIsDone(true);
            setIsRunning(false);
          }
        } catch {}
      }
    }

    setIsRunning(false);
    setIsDone(true);
  }

  // Group published links by site for copy feature
  const linksBySite = publishedLinks.reduce<Record<string, PublishedLink[]>>((acc, l) => {
    if (!acc[l.siteName]) acc[l.siteName] = [];
    acc[l.siteName].push(l);
    return acc;
  }, {});

  function copyLinksForSite(siteName: string) {
    const links = linksBySite[siteName]?.map((l) => l.permalink).join("\n") ?? "";
    navigator.clipboard.writeText(links);
  }

  function copyAllLinks() {
    const all = publishedLinks.map((l) => l.permalink).join("\n");
    navigator.clipboard.writeText(all);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Publisher</h1>
      <p className="text-sm text-gray-500 mb-6">Paste URLs, select sites, and publish with one click.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: inputs */}
        <div className="lg:col-span-2 space-y-4">
          {/* URL input */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Source URLs <span className="font-normal text-gray-400">(one per line)</span>
            </label>
            <textarea
              value={urlsText}
              onChange={(e) => setUrlsText(e.target.value)}
              rows={6}
              className="w-full font-mono text-sm border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
              placeholder={"https://example.com/article-1\nhttps://example.com/article-2"}
              disabled={isRunning}
            />
          </div>

          {/* Settings row */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-4">
            <div className="flex-1 min-w-40">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={isRunning}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {LANGUAGES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-40">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Post Status</label>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                {(["draft", "publish"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setPostStatus(s)}
                    disabled={isRunning}
                    className={`flex-1 py-2 text-sm font-medium transition-colors capitalize ${
                      postStatus === s
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={startPublish}
                disabled={isRunning}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-lg text-sm transition-colors"
              >
                {isRunning
                  ? `Publishing... (${selectedSiteIds.size} sites)`
                  : `Publish to ${selectedSiteIds.size} site${selectedSiteIds.size !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>

          {/* Progress log */}
          {(logs.length > 0 || isRunning) && (
            <div className="bg-gray-900 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase">Live Log</span>
                {isDone && (
                  <span className="text-xs text-gray-400">
                    ✓ {successCount} success · ✗ {failCount} failed
                  </span>
                )}
              </div>
              <div
                ref={logRef}
                className="h-56 overflow-y-auto font-mono text-xs space-y-0.5 pr-1"
              >
                {logs.map((log, i) => (
                  <div
                    key={i}
                    className={
                      log.type === "success"
                        ? "text-green-400"
                        : log.type === "error"
                        ? "text-red-400"
                        : log.type === "complete"
                        ? "text-yellow-300 font-bold"
                        : "text-gray-400"
                    }
                  >
                    {formatLog(log)}
                  </div>
                ))}
                {isRunning && (
                  <div className="text-gray-500 animate-pulse">● Processing...</div>
                )}
              </div>
            </div>
          )}

          {/* Results — published links */}
          {isDone && publishedLinks.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900">Published Links</h2>
                <button
                  onClick={copyAllLinks}
                  className="text-xs text-indigo-600 hover:underline font-medium"
                >
                  Copy all ({publishedLinks.length})
                </button>
              </div>
              <div className="space-y-3">
                {Object.entries(linksBySite).map(([siteName, links]) => (
                  <div key={siteName} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-gray-800">{siteName}</span>
                      <button
                        onClick={() => copyLinksForSite(siteName)}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        Copy ({links.length})
                      </button>
                    </div>
                    <div className="space-y-1">
                      {links.map((l, i) => (
                        <a
                          key={i}
                          href={l.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs text-blue-600 hover:underline truncate"
                        >
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
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col h-fit max-h-[calc(100vh-8rem)] sticky top-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-800">
              Select Sites
              <span className="ml-1.5 text-indigo-600">({selectedSiteIds.size}/{sites.length})</span>
            </h2>
            <div className="flex gap-2 text-xs">
              <button onClick={selectAll} className="text-indigo-600 hover:underline">All</button>
              <button onClick={deselectAll} className="text-gray-500 hover:underline">None</button>
            </div>
          </div>

          {/* Group filter buttons */}
          {groups.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {groups.map((g) => {
                const groupSiteIds = sites.filter((s) => s.groupId === g.id).map((s) => s.id);
                const allSelected = groupSiteIds.length > 0 && groupSiteIds.every((id) => selectedSiteIds.has(id));
                return (
                  <button
                    key={g.id}
                    onClick={() => selectGroup(g.id)}
                    style={{ borderColor: g.color, color: allSelected ? "#fff" : g.color, backgroundColor: allSelected ? g.color : "transparent" }}
                    className="px-2.5 py-1 text-xs font-medium rounded-full border transition-colors"
                  >
                    {g.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* Site list */}
          <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
            {sites.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">
                No sites yet.{" "}
                <a href="/sites" className="text-indigo-600 hover:underline">Add sites</a>
              </p>
            ) : (
              sites.map((site) => (
                <label
                  key={site.id}
                  className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={selectedSiteIds.has(site.id)}
                    onChange={() => toggleSite(site.id)}
                    disabled={isRunning}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{site.name}</p>
                    <p className="text-xs text-gray-400 truncate">{site.url}</p>
                  </div>
                  {site.group && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full ml-auto flex-shrink-0 font-medium"
                      style={{ background: site.group.color + "22", color: site.group.color }}
                    >
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
  const time = new Date().toLocaleTimeString();
  switch (log.type) {
    case "scraping": return `[${time}] Scraping: ${log.url}`;
    case "scraped": return `[${time}] Scraped: "${log.title}"`;
    case "rewriting": return `[${time}] ⟳ [${log.siteName}] Rewriting...`;
    case "success": return `[${time}] ✓ [${log.siteName}] ${log.permalink}`;
    case "error": return `[${time}] ✗ [${log.siteName ?? ""}] ${log.error ?? log.message}`;
    case "complete": return `[${time}] === COMPLETE: ${log.successCount} success, ${log.failCount} failed ===`;
    default: return `[${time}] ${JSON.stringify(log)}`;
  }
}
