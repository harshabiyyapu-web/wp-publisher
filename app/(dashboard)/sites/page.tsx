"use client";

import { useEffect, useRef, useState } from "react";

interface Group { id: number; name: string; color: string; }
interface Site {
  id: number; name: string; url: string; token: string;
  language: string; groupId: number | null; group: Group | null; createdAt: string;
}

const LANGUAGES = [
  "english","hindi","spanish","telugu","polish","italian",
  "japanese","german","dutch","swedish","french","tamil","marathi","gujarati",
];
const BLANK = { name: "", url: "", token: "", groupId: "", language: "english" };

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [form, setForm] = useState(BLANK);
  const [editId, setEditId] = useState<number | null>(null);
  const [testStatus, setTestStatus] = useState<Record<number, "ok" | "fail" | "loading">>({});
  const [saving, setSaving] = useState(false);

  // Spreadsheet selection
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [lastClicked, setLastClicked] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const dragging = useRef(false);
  const dragMode = useRef<"add" | "remove">("add");

  useEffect(() => { load(); }, []);

  async function load() {
    const [s, g] = await Promise.all([
      fetch("/api/sites").then((r) => r.json()),
      fetch("/api/groups").then((r) => r.json()),
    ]);
    setSites(s);
    setGroups(g);
  }

  async function save() {
    if (!form.name || !form.url || !form.token) { alert("Name, URL, and token are required"); return; }
    setSaving(true);
    await fetch(editId ? `/api/sites/${editId}` : "/api/sites", {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, groupId: form.groupId ? parseInt(form.groupId) : null }),
    });
    setForm(BLANK); setEditId(null); setSaving(false); load();
  }

  async function remove(id: number) {
    if (!confirm("Delete this site?")) return;
    await fetch(`/api/sites/${id}`, { method: "DELETE" });
    load();
  }

  function startEdit(site: Site) {
    setEditId(site.id);
    setForm({ name: site.name, url: site.url, token: site.token, groupId: site.groupId?.toString() ?? "", language: site.language });
    window.scrollTo(0, 0);
  }

  async function testConn(id: number) {
    setTestStatus((p) => ({ ...p, [id]: "loading" }));
    const res = await fetch(`/api/sites/${id}/test`, { method: "POST" });
    const data = await res.json();
    setTestStatus((p) => ({ ...p, [id]: data.ok ? "ok" : "fail" }));
  }

  // Spreadsheet selection handlers
  function handleRowMouseDown(id: number, e: React.MouseEvent) {
    // Don't interfere with button clicks inside the row
    if ((e.target as HTMLElement).closest("button,a,input,select")) return;

    if (e.shiftKey && lastClicked !== null) {
      const ids = sites.map((s) => s.id);
      const start = ids.indexOf(lastClicked);
      const end = ids.indexOf(id);
      if (start !== -1 && end !== -1) {
        const [lo, hi] = start < end ? [start, end] : [end, start];
        setSelected((prev) => {
          const next = new Set(prev);
          for (let i = lo; i <= hi; i++) next.add(ids[i]);
          return next;
        });
      }
      return;
    }

    const isSelected = selected.has(id);
    dragMode.current = isSelected ? "remove" : "add";
    dragging.current = true;
    setSelected((prev) => {
      const next = new Set(prev);
      if (isSelected) next.delete(id); else next.add(id);
      return next;
    });
    setLastClicked(id);
  }

  function handleRowMouseEnter(id: number) {
    if (!dragging.current) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (dragMode.current === "add") next.add(id); else next.delete(id);
      return next;
    });
  }

  useEffect(() => {
    const up = () => { dragging.current = false; };
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  // Ctrl+C copies URLs of selected sites
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && selected.size > 0) {
        const urls = sites.filter((s) => selected.has(s.id)).map((s) => s.url).join("\n");
        navigator.clipboard.writeText(urls);
        setCopiedKey("ctrl-c");
        setTimeout(() => setCopiedKey(null), 1800);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected, sites]);

  function copySelected() {
    const urls = sites.filter((s) => selected.has(s.id)).map((s) => s.url).join("\n");
    navigator.clipboard.writeText(urls);
    setCopiedKey("selected");
    setTimeout(() => setCopiedKey(null), 1800);
  }

  const inputClass = "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";

  return (
    <div className="p-6 max-w-6xl mx-auto" onMouseUp={() => { dragging.current = false; }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sites</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your WordPress sites · Click or drag to select · Ctrl+C to copy URLs</p>
        </div>
        {selected.size > 0 && (
          <div className="flex items-center gap-3 bg-white border border-indigo-200 rounded-xl px-4 py-2.5 shadow-md">
            <span className="text-sm font-semibold text-indigo-700">{selected.size} site{selected.size !== 1 ? "s" : ""} selected</span>
            <button
              onClick={copySelected}
              className="text-sm font-bold px-4 py-1.5 rounded-lg text-white transition-all"
              style={{ background: copiedKey === "selected" || copiedKey === "ctrl-c" ? "#16a34a" : "linear-gradient(135deg,#6366f1,#7c3aed)" }}
            >
              {copiedKey === "selected" || copiedKey === "ctrl-c" ? "✓ Copied!" : "Copy URLs"}
            </button>
            <button onClick={() => setSelected(new Set())} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
          </div>
        )}
      </div>

      {/* Add / Edit form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white"
            style={{ background: editId ? "#f59e0b" : "#6366f1" }}>
            {editId ? "✎" : "+"}
          </span>
          {editId ? "Edit Site" : "Add New Site"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Site Name</label>
            <input placeholder="e.g. My Hindi Blog" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">WordPress URL</label>
            <input placeholder="https://yoursite.com" value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Secret Token</label>
            <input placeholder="Paste from WP Admin → Tools" value={form.token}
              onChange={(e) => setForm({ ...form, token: e.target.value })} className={`${inputClass} font-mono`} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Group</label>
            <select value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">No group</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Default Language</label>
            <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {LANGUAGES.map((l) => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={save} disabled={saving}
            className="px-5 py-2 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #6366f1, #7c3aed)", boxShadow: "0 2px 8px rgba(99,102,241,0.3)" }}>
            {saving ? "Saving..." : editId ? "Update Site" : "Add Site"}
          </button>
          {editId && (
            <button onClick={() => { setForm(BLANK); setEditId(null); }}
              className="px-5 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50">
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Spreadsheet table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="border-b border-slate-100 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input type="checkbox"
              checked={selected.size === sites.length && sites.length > 0}
              onChange={(e) => setSelected(e.target.checked ? new Set(sites.map((s) => s.id)) : new Set())}
              style={{ accentColor: "#6366f1" }}
            />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {sites.length} Site{sites.length !== 1 ? "s" : ""}
              {selected.size > 0 && <span className="ml-2 text-indigo-500">· {selected.size} selected</span>}
            </span>
          </div>
          {selected.size > 0 && (
            <span className="text-xs text-slate-400">Shift+click for range · Ctrl+C to copy</span>
          )}
        </div>

        {sites.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 text-sm">No sites yet. Add your first site above.</p>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse" style={{ userSelect: "none" }}>
            <colgroup>
              <col style={{ width: 36 }} />
              <col style={{ width: 36 }} />
              <col style={{ width: "22%" }} />
              <col />
              <col style={{ width: 120 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 220 }} />
            </colgroup>
            <thead>
              <tr className="border-b border-slate-100" style={{ background: "#f8fafc" }}>
                <th className="py-2 pl-3 text-left" />
                <th className="py-2 text-left" />
                <th className="py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Site Name</th>
                <th className="py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">URL</th>
                <th className="py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Group</th>
                <th className="py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Language</th>
                <th className="py-2 pr-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((site, idx) => {
                const isSel = selected.has(site.id);
                const rowBg = isSel ? "#eef2ff" : idx % 2 === 0 ? "#fff" : "#f8fafc";
                return (
                  <tr key={site.id}
                    onMouseDown={(e) => handleRowMouseDown(site.id, e)}
                    onMouseEnter={() => handleRowMouseEnter(site.id)}
                    style={{
                      background: rowBg,
                      cursor: "default",
                      outline: isSel ? "1px solid #a5b4fc" : "none",
                      outlineOffset: "-1px",
                    }}
                    className="transition-colors"
                  >
                    {/* Checkbox */}
                    <td className="pl-3 py-3">
                      <input type="checkbox" checked={isSel} onChange={() => {}}
                        onClick={(e) => { e.stopPropagation(); setSelected((p) => { const n = new Set(p); isSel ? n.delete(site.id) : n.add(site.id); return n; }); }}
                        style={{ accentColor: "#6366f1", cursor: "pointer" }} />
                    </td>
                    {/* Avatar */}
                    <td className="py-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: site.group?.color ?? "#94a3b8" }}>
                        {site.name.charAt(0).toUpperCase()}
                      </div>
                    </td>
                    {/* Name */}
                    <td className="py-3 pr-3 font-semibold text-slate-900">
                      <span className="block truncate" title={site.name}>{site.name}</span>
                    </td>
                    {/* URL */}
                    <td className="py-3 pr-3">
                      <a href={site.url} target="_blank" rel="noopener noreferrer"
                        className="text-indigo-500 hover:underline truncate block text-xs"
                        onMouseDown={(e) => e.stopPropagation()}
                        title={site.url}>
                        {site.url}
                      </a>
                    </td>
                    {/* Group */}
                    <td className="py-3 pr-3">
                      {site.group ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                          style={{ background: site.group.color + "18", color: site.group.color }}>
                          {site.group.name}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    {/* Language */}
                    <td className="py-3 pr-3 text-xs text-slate-500 capitalize">{site.language}</td>
                    {/* Actions */}
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => testConn(site.id)}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors whitespace-nowrap"
                          style={{
                            borderColor: testStatus[site.id] === "ok" ? "#22c55e" : testStatus[site.id] === "fail" ? "#ef4444" : "#e2e8f0",
                            color: testStatus[site.id] === "ok" ? "#16a34a" : testStatus[site.id] === "fail" ? "#dc2626" : "#64748b",
                            background: testStatus[site.id] === "ok" ? "#f0fdf4" : testStatus[site.id] === "fail" ? "#fef2f2" : "white",
                          }}>
                          {testStatus[site.id] === "loading" ? "Testing…" : testStatus[site.id] === "ok" ? "✓ OK" : testStatus[site.id] === "fail" ? "✗ Failed" : "Test"}
                        </button>
                        <button onClick={() => startEdit(site)}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="text-xs font-medium px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600">
                          Edit
                        </button>
                        <button onClick={() => remove(site.id)}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="text-xs font-medium text-red-400 hover:text-red-600 px-2 py-1">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Token instructions */}
      <div className="mt-5 rounded-2xl border border-blue-100 p-5" style={{ background: "linear-gradient(135deg, #eff6ff, #f0f9ff)" }}>
        <h3 className="text-sm font-semibold text-blue-800 mb-2">How to get your site token</h3>
        <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
          <li>Install the updated <strong>claude-content-rewriter.php</strong> plugin on your WP site</li>
          <li>In WP Admin, go to <strong>Tools → Available Tools</strong></li>
          <li>Find the <strong>WP Publisher — Site Token</strong> card</li>
          <li>Click <strong>Generate Token</strong>, then <strong>Copy Token</strong></li>
          <li>Paste the token in the field above</li>
        </ol>
      </div>
    </div>
  );
}
