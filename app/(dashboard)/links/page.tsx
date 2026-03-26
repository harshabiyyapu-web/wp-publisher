"use client";

import { useEffect, useRef, useState, useCallback } from "react";

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

interface SiteBlock {
  id: number;
  name: string;
  color: string;
  groupName: string | null;
  jobs: PubJob[];
}

interface GroupBlock {
  id: number;
  name: string;
  color: string;
  sites: { name: string; jobs: PubJob[] }[];
  allJobs: PubJob[];
}

type RowId = string; // `job-${job.id}`

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function LinksPage() {
  const [tab, setTab] = useState<"site" | "group">("site");
  const [siteBlocks, setSiteBlocks] = useState<SiteBlock[]>([]);
  const [groupBlocks, setGroupBlocks] = useState<GroupBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<RowId>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [lastClicked, setLastClicked] = useState<RowId | null>(null);

  // drag-select state
  const dragging = useRef(false);
  const dragMode = useRef<"add" | "remove">("add");
  const allRows = useRef<RowId[]>([]); // ordered list of all visible row ids

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const res = await fetch("/api/history?page=1&limit=500");
    const data = await res.json();
    const articles: {
      id: number; scrapedTitle: string; sourceUrl: string;
      pubJobs: (Omit<PubJob, "article"> & { article?: never })[];
    }[] = data.articles ?? [];

    const allJobs: PubJob[] = articles.flatMap((a) =>
      a.pubJobs
        .filter((j) => j.status === "success" && j.permalink)
        .map((j) => ({ ...j, article: { id: a.id, scrapedTitle: a.scrapedTitle, sourceUrl: a.sourceUrl } }))
    );

    // Sort jobs newest first
    allJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Build site blocks
    const siteMap: Record<number, SiteBlock> = {};
    for (const j of allJobs) {
      const s = j.site;
      if (!siteMap[s.id]) {
        siteMap[s.id] = { id: s.id, name: s.name, color: s.group?.color ?? "#6366f1", groupName: s.group?.name ?? null, jobs: [] };
      }
      siteMap[s.id].jobs.push(j);
    }
    setSiteBlocks(Object.values(siteMap).sort((a, b) => a.name.localeCompare(b.name)));

    // Build group blocks
    const groupMap: Record<number, { name: string; color: string; siteMap: Record<string, PubJob[]>; allJobs: PubJob[] }> = {};
    for (const j of allJobs) {
      const g = j.site.group;
      if (!g) continue;
      if (!groupMap[g.id]) groupMap[g.id] = { name: g.name, color: g.color, siteMap: {}, allJobs: [] };
      if (!groupMap[g.id].siteMap[j.site.name]) groupMap[g.id].siteMap[j.site.name] = [];
      groupMap[g.id].siteMap[j.site.name].push(j);
      groupMap[g.id].allJobs.push(j);
    }
    setGroupBlocks(
      Object.entries(groupMap)
        .map(([id, v]) => ({
          id: parseInt(id),
          name: v.name,
          color: v.color,
          allJobs: v.allJobs,
          sites: Object.entries(v.siteMap).map(([name, jobs]) => ({ name, jobs })).sort((a, b) => a.name.localeCompare(b.name)),
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    setLoading(false);
  }

  // Ctrl+C global handler
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && selected.size > 0) {
        const orderedIds = allRows.current.filter((id) => selected.has(id));
        // Get job permalinks in order
        const jobs = getJobsForIds(orderedIds);
        const text = jobs.map((j) => j.permalink!).join("\n");
        navigator.clipboard.writeText(text);
        setCopiedKey("ctrl-c");
        setTimeout(() => setCopiedKey(null), 1800);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  function getJobsForIds(ids: RowId[]): PubJob[] {
    const all = [...siteBlocks.flatMap((s) => s.jobs), ...groupBlocks.flatMap((g) => g.allJobs)];
    const map: Record<string, PubJob> = {};
    for (const j of all) map[`job-${j.id}`] = j;
    return ids.map((id) => map[id]).filter(Boolean);
  }

  function copyJobs(jobs: PubJob[], key: string) {
    navigator.clipboard.writeText(jobs.map((j) => j.permalink!).join("\n"));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  }

  function copySelected() {
    const orderedIds = allRows.current.filter((id) => selected.has(id));
    const jobs = getJobsForIds(orderedIds);
    navigator.clipboard.writeText(jobs.map((j) => j.permalink!).join("\n"));
    setCopiedKey("selected");
    setTimeout(() => setCopiedKey(null), 1800);
  }

  function handleRowMouseDown(rowId: RowId, e: React.MouseEvent) {
    if (e.shiftKey && lastClicked) {
      // Shift+click: select range
      const start = allRows.current.indexOf(lastClicked);
      const end = allRows.current.indexOf(rowId);
      if (start !== -1 && end !== -1) {
        const [lo, hi] = start < end ? [start, end] : [end, start];
        setSelected((prev) => {
          const next = new Set(prev);
          for (let i = lo; i <= hi; i++) next.add(allRows.current[i]);
          return next;
        });
      }
      return;
    }
    // Normal click: toggle
    const isSelected = selected.has(rowId);
    dragMode.current = isSelected ? "remove" : "add";
    dragging.current = true;
    setSelected((prev) => {
      const next = new Set(prev);
      if (isSelected) next.delete(rowId); else next.add(rowId);
      return next;
    });
    setLastClicked(rowId);
  }

  function handleRowMouseEnter(rowId: RowId) {
    if (!dragging.current) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (dragMode.current === "add") next.add(rowId);
      else next.delete(rowId);
      return next;
    });
  }

  useEffect(() => {
    const up = () => { dragging.current = false; };
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  // Compute selected count
  const selectedCount = selected.size;
  const selectedJobs = getJobsForIds(allRows.current.filter((id) => selected.has(id)));

  // Render a spreadsheet table for a list of jobs
  const SpreadsheetTable = useCallback(({
    jobs, color, rowPrefix,
  }: { jobs: PubJob[]; color: string; rowPrefix: string }) => {
    return (
      <table className="w-full text-xs border-collapse" style={{ userSelect: "none" }}>
        <colgroup>
          <col style={{ width: 28 }} />
          <col style={{ width: "35%" }} />
          <col />
          <col style={{ width: 90 }} />
          <col style={{ width: 64 }} />
        </colgroup>
        <tbody>
          {jobs.map((j, idx) => {
            const rowId: RowId = `${rowPrefix}-${j.id}`;
            const isSel = selected.has(rowId);
            return (
              <tr
                key={j.id}
                onMouseDown={(e) => handleRowMouseDown(rowId, e)}
                onMouseEnter={() => handleRowMouseEnter(rowId)}
                style={{
                  background: isSel ? color + "22" : idx % 2 === 0 ? "#fff" : "#f8fafc",
                  cursor: "pointer",
                  outline: isSel ? `1px solid ${color}44` : "none",
                }}
              >
                <td className="pl-2 py-1.5 text-center">
                  <input
                    type="checkbox"
                    checked={isSel}
                    onChange={() => {}}
                    onClick={(e) => e.stopPropagation()}
                    style={{ accentColor: color, cursor: "pointer" }}
                  />
                </td>
                <td className="py-1.5 pr-3 font-medium text-slate-700 truncate max-w-0">
                  <span className="block truncate" title={j.article.scrapedTitle}>{j.article.scrapedTitle}</span>
                </td>
                <td className="py-1.5 pr-3 truncate max-w-0">
                  <a
                    href={j.permalink!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline truncate block"
                    style={{ color }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    {j.permalink}
                  </a>
                </td>
                <td className="py-1.5 pr-2 text-slate-400 whitespace-nowrap text-right">{fmtDate(j.createdAt)}</td>
                <td className="py-1.5 pr-3 text-slate-400 whitespace-nowrap text-right">{fmtTime(j.createdAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // Rebuild allRows index whenever tab or data changes
  useEffect(() => {
    if (tab === "site") {
      allRows.current = siteBlocks.flatMap((s) => s.jobs.map((j) => `site-${j.id}` as RowId));
    } else {
      allRows.current = groupBlocks.flatMap((g) =>
        g.sites.flatMap((s) => s.jobs.map((j) => `group-${j.id}` as RowId))
      );
    }
    setSelected(new Set());
    setLastClicked(null);
  }, [tab, siteBlocks, groupBlocks]);

  const tabStyle = (active: boolean) => ({
    padding: "8px 20px",
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: 600,
    border: "none",
    cursor: "pointer",
    background: active ? "#6366f1" : "transparent",
    color: active ? "#fff" : "#64748b",
    transition: "all 0.15s",
  } as React.CSSProperties);

  const copyBtn = (key: string, jobs: PubJob[], label: string, color: string) => (
    <button
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); copyJobs(jobs, key); }}
      className="text-xs px-2.5 py-1 rounded-lg font-semibold transition-all whitespace-nowrap"
      style={{
        background: copiedKey === key ? "#dcfce7" : color + "18",
        color: copiedKey === key ? "#16a34a" : color,
      }}
    >
      {copiedKey === key ? "✓ Copied!" : label}
    </button>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto" onMouseUp={() => { dragging.current = false; }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Published Links</h1>
          <p className="text-sm text-slate-500 mt-0.5">Click or drag to select rows · Shift+click for range · Ctrl+C to copy</p>
        </div>

        {/* Floating copy bar */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-3 bg-white border border-indigo-200 rounded-xl px-4 py-2.5 shadow-md">
            <span className="text-sm font-semibold text-indigo-700">{selectedCount} row{selectedCount !== 1 ? "s" : ""} selected</span>
            <button
              onClick={copySelected}
              className="text-sm font-bold px-4 py-1.5 rounded-lg text-white transition-all"
              style={{ background: copiedKey === "selected" ? "#16a34a" : "linear-gradient(135deg,#6366f1,#7c3aed)" }}
            >
              {copiedKey === "selected" || copiedKey === "ctrl-c" ? "✓ Copied!" : "Copy Selected"}
            </button>
            <button onClick={() => setSelected(new Set())} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 bg-slate-100 p-1 rounded-xl w-fit">
        <button style={tabStyle(tab === "site")} onClick={() => setTab("site")}>By Site</button>
        <button style={tabStyle(tab === "group")} onClick={() => setTab("group")}>By Group</button>
      </div>

      {loading && <div className="text-center py-16 text-slate-400 text-sm">Loading...</div>}

      {/* BY SITE */}
      {!loading && tab === "site" && (
        <div className="space-y-4">
          {siteBlocks.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
              <p className="text-slate-400 text-sm">No published links yet.</p>
            </div>
          )}
          {siteBlocks.map((site) => (
            <div key={site.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Site header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100"
                style={{ background: site.color + "10" }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: site.color }}>
                  {site.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-slate-900 text-sm">{site.name}</span>
                  {site.groupName && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: site.color + "18", color: site.color }}>
                      {site.groupName}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400 mr-2">{site.jobs.length} links</span>
                {copyBtn(`site-all-${site.id}`, site.jobs, `Copy all (${site.jobs.length})`, site.color)}
              </div>

              {/* Column headers */}
              <div className="grid text-xs font-semibold text-slate-400 uppercase tracking-wide px-2 py-1.5 border-b border-slate-100"
                style={{ gridTemplateColumns: "28px 35% 1fr 90px 64px" }}>
                <div />
                <div>Title</div>
                <div>Permalink</div>
                <div className="text-right">Date</div>
                <div className="text-right pr-3">Time</div>
              </div>

              <SpreadsheetTable jobs={site.jobs} color={site.color} rowPrefix="site" />
            </div>
          ))}
        </div>
      )}

      {/* BY GROUP */}
      {!loading && tab === "group" && (
        <div className="space-y-4">
          {groupBlocks.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
              <p className="text-slate-400 text-sm">No group links yet. Assign sites to groups first.</p>
            </div>
          )}
          {groupBlocks.map((group) => (
            <div key={group.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Group header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100"
                style={{ background: group.color + "12" }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: group.color + "25" }}>
                  <div className="w-3 h-3 rounded-full" style={{ background: group.color }} />
                </div>
                <div className="flex-1">
                  <span className="font-semibold text-slate-900 text-sm">{group.name}</span>
                </div>
                <span className="text-xs text-slate-400 mr-2">{group.allJobs.length} links across {group.sites.length} sites</span>
                {copyBtn(`group-all-${group.id}`, group.allJobs, `Copy all (${group.allJobs.length})`, group.color)}
              </div>

              {/* Per-site sub-tables */}
              {group.sites.map((site, si) => (
                <div key={site.name}>
                  {/* Sub-site header */}
                  <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-100"
                    style={{ background: si % 2 === 0 ? "#f8fafc" : "#fff" }}>
                    <span className="text-xs font-semibold text-slate-600 flex-1">{site.name}</span>
                    <span className="text-xs text-slate-400 mr-2">{site.jobs.length}</span>
                    {copyBtn(`group-${group.id}-site-${site.name}`, site.jobs, `Copy (${site.jobs.length})`, group.color)}
                  </div>

                  {/* Column headers */}
                  <div className="grid text-xs font-semibold text-slate-400 uppercase tracking-wide px-2 py-1.5 border-b border-slate-100"
                    style={{ gridTemplateColumns: "28px 35% 1fr 90px 64px" }}>
                    <div />
                    <div>Title</div>
                    <div>Permalink</div>
                    <div className="text-right">Date</div>
                    <div className="text-right pr-3">Time</div>
                  </div>

                  <SpreadsheetTable jobs={site.jobs} color={group.color} rowPrefix="group" />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
