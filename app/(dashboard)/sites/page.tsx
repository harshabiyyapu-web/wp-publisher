"use client";

import { useEffect, useState } from "react";

interface Group {
  id: number;
  name: string;
  color: string;
}

interface Site {
  id: number;
  name: string;
  url: string;
  token: string;
  language: string;
  groupId: number | null;
  group: Group | null;
  createdAt: string;
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
    if (!form.name || !form.url || !form.token) {
      alert("Name, URL, and token are required");
      return;
    }
    setSaving(true);
    const url = editId ? `/api/sites/${editId}` : "/api/sites";
    const method = editId ? "PUT" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, groupId: form.groupId ? parseInt(form.groupId) : null }),
    });
    setForm(BLANK);
    setEditId(null);
    setSaving(false);
    load();
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

  const inputClass = "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow";

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Sites</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your WordPress sites and connection tokens.</p>
      </div>

      {/* Add / Edit form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white" style={{ background: editId ? "#f59e0b" : "#6366f1" }}>
            {editId ? "✎" : "+"}
          </span>
          {editId ? "Edit Site" : "Add New Site"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Site Name</label>
            <input
              placeholder="e.g. My Hindi Blog"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">WordPress URL</label>
            <input
              placeholder="https://yoursite.com"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Secret Token</label>
            <input
              placeholder="Paste from WP Admin → Tools"
              value={form.token}
              onChange={(e) => setForm({ ...form, token: e.target.value })}
              className={`${inputClass} font-mono`}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Group</label>
            <select
              value={form.groupId}
              onChange={(e) => setForm({ ...form, groupId: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">No group</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Default Language</label>
            <select
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {LANGUAGES.map((l) => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-all"
            style={{ background: "linear-gradient(135deg, #6366f1, #7c3aed)", boxShadow: "0 2px 8px rgba(99,102,241,0.3)" }}
          >
            {saving ? "Saving..." : editId ? "Update Site" : "Add Site"}
          </button>
          {editId && (
            <button
              onClick={() => { setForm(BLANK); setEditId(null); }}
              className="px-5 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Site list */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">{sites.length} Site{sites.length !== 1 ? "s" : ""}</h2>
        </div>
        {sites.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 text-sm">No sites yet. Add your first site above.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sites.map((site) => (
              <div key={site.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ background: site.group ? site.group.color : "#94a3b8" }}>
                  {site.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm">{site.name}</p>
                  <p className="text-xs text-slate-400 truncate">{site.url}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {site.group && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: site.group.color + "18", color: site.group.color }}>
                      {site.group.name}
                    </span>
                  )}
                  <span className="text-xs text-slate-400 capitalize">{site.language}</span>
                  <button
                    onClick={() => testConn(site.id)}
                    className="text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors"
                    style={{
                      borderColor: testStatus[site.id] === "ok" ? "#22c55e" : testStatus[site.id] === "fail" ? "#ef4444" : "#e2e8f0",
                      color: testStatus[site.id] === "ok" ? "#16a34a" : testStatus[site.id] === "fail" ? "#dc2626" : "#64748b",
                      background: testStatus[site.id] === "ok" ? "#f0fdf4" : testStatus[site.id] === "fail" ? "#fef2f2" : "white",
                    }}
                  >
                    {testStatus[site.id] === "loading" ? "Testing..." : testStatus[site.id] === "ok" ? "✓ Connected" : testStatus[site.id] === "fail" ? "✗ Failed" : "Test Connection"}
                  </button>
                  <button onClick={() => startEdit(site)} className="text-xs font-medium" style={{ color: "#6366f1" }}>Edit</button>
                  <button onClick={() => remove(site.id)} className="text-xs font-medium text-red-400 hover:text-red-600">Delete</button>
                </div>
              </div>
            ))}
          </div>
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
