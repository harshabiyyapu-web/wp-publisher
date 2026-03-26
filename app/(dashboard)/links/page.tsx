"use client";

import { useEffect, useState } from "react";

interface PubJob {
  id: number;
  status: string;
  permalink: string | null;
  createdAt: string;
  site: {
    id: number;
    name: string;
    url: string;
    group: { id: number; name: string; color: string } | null;
  };
  article: { id: number; scrapedTitle: string; sourceUrl: string };
}

interface SiteEntry {
  id: number;
  name: string;
  url: string;
  color: string;
  groupName: string | null;
  jobs: PubJob[];
}

interface GroupEntry {
  id: number;
  name: string;
  color: string;
  jobs: PubJob[];
}

export default function LinksPage() {
  const [tab, setTab] = useState<"site" | "group">("site");
  const [sites, setSites] = useState<SiteEntry[]>([]);
  const [groups, setGroups] = useState<GroupEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedSite, setExpandedSite] = useState<number | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const res = await fetch("/api/history?page=1&limit=500");
    const data = await res.json();
    const articles: { id: number; scrapedTitle: string; sourceUrl: string; pubJobs: PubJob[] }[] = data.articles ?? [];

    // Flatten all successful pub jobs
    const allJobs: PubJob[] = articles.flatMap((a) =>
      a.pubJobs
        .filter((j) => j.status === "success" && j.permalink)
        .map((j) => ({ ...j, article: { id: a.id, scrapedTitle: a.scrapedTitle, sourceUrl: a.sourceUrl } }))
    );

    // Build site map
    const siteMap: Record<number, SiteEntry> = {};
    for (const j of allJobs) {
      const s = j.site;
      if (!siteMap[s.id]) {
        siteMap[s.id] = {
          id: s.id,
          name: s.name,
          url: s.url,
          color: s.group?.color ?? "#6366f1",
          groupName: s.group?.name ?? null,
          jobs: [],
        };
      }
      siteMap[s.id].jobs.push(j);
    }
    setSites(Object.values(siteMap).sort((a, b) => a.name.localeCompare(b.name)));

    // Build group map
    const groupMap: Record<number, GroupEntry> = {};
    for (const j of allJobs) {
      const g = j.site.group;
      if (!g) continue;
      if (!groupMap[g.id]) {
        groupMap[g.id] = { id: g.id, name: g.name, color: g.color, jobs: [] };
      }
      groupMap[g.id].jobs.push(j);
    }
    setGroups(Object.values(groupMap).sort((a, b) => a.name.localeCompare(b.name)));
    setLoading(false);
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  }

  function copyJobs(jobs: PubJob[], key: string) {
    copy(jobs.map((j) => j.permalink!).join("\n"), key);
  }

  const btnTab = (active: boolean, color = "#6366f1") => ({
    padding: "8px 20px",
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    background: active ? color : "transparent",
    color: active ? "#fff" : "#64748b",
    transition: "all 0.15s",
  } as React.CSSProperties);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Published Links</h1>
        <p className="text-sm text-slate-500 mt-0.5">Browse and copy links by site or group</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        <button style={btnTab(tab === "site")} onClick={() => setTab("site")}>By Site</button>
        <button style={btnTab(tab === "group")} onClick={() => setTab("group")}>By Group</button>
      </div>

      {loading && (
        <div className="text-center py-16 text-slate-400 text-sm">Loading published links...</div>
      )}

      {/* BY SITE */}
      {!loading && tab === "site" && (
        <div className="space-y-3">
          {sites.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
              <p className="text-slate-400 text-sm">No published articles yet.</p>
            </div>
          )}
          {sites.map((site) => {
            const isOpen = expandedSite === site.id;
            return (
              <div key={site.id} className="bg-white rounded-2xl border shadow-sm overflow-hidden"
                style={{ borderColor: isOpen ? site.color + "60" : "#e2e8f0" }}>
                {/* Site header */}
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
                    style={{ background: `linear-gradient(135deg, ${site.color}, ${site.color}aa)` }}>
                    {site.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedSite(isOpen ? null : site.id)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900">{site.name}</p>
                      {site.groupName && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: site.color + "18", color: site.color }}>
                          {site.groupName}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{site.jobs.length} published · click to {isOpen ? "collapse" : "expand"}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => copyJobs(site.jobs, `site-${site.id}`)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
                      style={{
                        background: copiedKey === `site-${site.id}` ? "#dcfce7" : site.color + "18",
                        color: copiedKey === `site-${site.id}` ? "#16a34a" : site.color,
                      }}
                    >
                      {copiedKey === `site-${site.id}` ? "✓ Copied!" : `Copy all (${site.jobs.length})`}
                    </button>
                    <button
                      onClick={() => setExpandedSite(isOpen ? null : site.id)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all"
                      style={{
                        borderColor: isOpen ? site.color : "#e2e8f0",
                        background: isOpen ? site.color : "white",
                        color: isOpen ? "white" : "#64748b",
                      }}
                    >
                      {isOpen ? "Close" : "View"}
                    </button>
                  </div>
                </div>

                {/* Expanded links */}
                {isOpen && (
                  <div className="border-t px-5 py-4" style={{ borderColor: site.color + "30", background: site.color + "06" }}>
                    <div className="space-y-2">
                      {site.jobs.map((j) => {
                        const copyKey = `job-${j.id}`;
                        return (
                          <div key={j.id} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-700 truncate">{j.article.scrapedTitle}</p>
                              <a href={j.permalink!} target="_blank" rel="noopener noreferrer"
                                className="text-xs truncate hover:underline block mt-0.5" style={{ color: site.color }}>
                                {j.permalink}
                              </a>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs text-slate-400">{new Date(j.createdAt).toLocaleDateString()}</span>
                              <button
                                onClick={() => copy(j.permalink!, copyKey)}
                                className="text-xs px-2 py-0.5 rounded font-medium transition-all"
                                style={{
                                  background: copiedKey === copyKey ? "#dcfce7" : "#f1f5f9",
                                  color: copiedKey === copyKey ? "#16a34a" : "#64748b",
                                }}
                              >
                                {copiedKey === copyKey ? "✓" : "Copy"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* BY GROUP */}
      {!loading && tab === "group" && (
        <div className="space-y-3">
          {groups.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
              <p className="text-slate-400 text-sm">No group-published articles yet. Assign sites to groups first.</p>
            </div>
          )}
          {groups.map((group) => {
            const isOpen = expandedGroup === group.id;
            // Group jobs by site name within the group
            const bySite: Record<string, PubJob[]> = {};
            for (const j of group.jobs) {
              if (!bySite[j.site.name]) bySite[j.site.name] = [];
              bySite[j.site.name].push(j);
            }
            const siteNames = Object.keys(bySite);
            return (
              <div key={group.id} className="bg-white rounded-2xl border shadow-sm overflow-hidden"
                style={{ borderColor: isOpen ? group.color + "60" : "#e2e8f0" }}>
                {/* Group header */}
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: group.color + "20" }}>
                    <div className="w-4 h-4 rounded-full" style={{ background: group.color }} />
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedGroup(isOpen ? null : group.id)}>
                    <p className="font-semibold text-slate-900">{group.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {group.jobs.length} links across {siteNames.length} site{siteNames.length !== 1 ? "s" : ""} · click to {isOpen ? "collapse" : "expand"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => copyJobs(group.jobs, `group-${group.id}`)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
                      style={{
                        background: copiedKey === `group-${group.id}` ? "#dcfce7" : group.color + "18",
                        color: copiedKey === `group-${group.id}` ? "#16a34a" : group.color,
                      }}
                    >
                      {copiedKey === `group-${group.id}` ? "✓ Copied!" : `Copy all (${group.jobs.length})`}
                    </button>
                    <button
                      onClick={() => setExpandedGroup(isOpen ? null : group.id)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all"
                      style={{
                        borderColor: isOpen ? group.color : "#e2e8f0",
                        background: isOpen ? group.color : "white",
                        color: isOpen ? "white" : "#64748b",
                      }}
                    >
                      {isOpen ? "Close" : "View"}
                    </button>
                  </div>
                </div>

                {/* Expanded: grouped by site inside the group */}
                {isOpen && (
                  <div className="border-t px-5 py-4 space-y-5" style={{ borderColor: group.color + "30", background: group.color + "06" }}>
                    {siteNames.map((siteName) => {
                      const siteJobs = bySite[siteName];
                      const siteCopyKey = `group-${group.id}-site-${siteName}`;
                      return (
                        <div key={siteName}>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{siteName}</p>
                            <button
                              onClick={() => copyJobs(siteJobs, siteCopyKey)}
                              className="text-xs px-2 py-0.5 rounded font-medium transition-all"
                              style={{
                                background: copiedKey === siteCopyKey ? "#dcfce7" : group.color + "18",
                                color: copiedKey === siteCopyKey ? "#16a34a" : group.color,
                              }}
                            >
                              {copiedKey === siteCopyKey ? "✓ Copied!" : `Copy ${siteJobs.length}`}
                            </button>
                          </div>
                          <div className="space-y-2">
                            {siteJobs.map((j) => {
                              const copyKey = `job-g-${j.id}`;
                              return (
                                <div key={j.id} className="flex items-start gap-3 py-1.5 border-b border-slate-100 last:border-0">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-slate-700 truncate">{j.article.scrapedTitle}</p>
                                    <a href={j.permalink!} target="_blank" rel="noopener noreferrer"
                                      className="text-xs truncate hover:underline block mt-0.5" style={{ color: group.color }}>
                                      {j.permalink}
                                    </a>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="text-xs text-slate-400">{new Date(j.createdAt).toLocaleDateString()}</span>
                                    <button
                                      onClick={() => copy(j.permalink!, copyKey)}
                                      className="text-xs px-2 py-0.5 rounded font-medium transition-all"
                                      style={{
                                        background: copiedKey === copyKey ? "#dcfce7" : "#f1f5f9",
                                        color: copiedKey === copyKey ? "#16a34a" : "#64748b",
                                      }}
                                    >
                                      {copiedKey === copyKey ? "✓" : "Copy"}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
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
      )}
    </div>
  );
}
