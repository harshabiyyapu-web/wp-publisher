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

  useEffect(() => {
    load();
  }, []);

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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Sites</h1>

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">{editId ? "Edit Site" : "Add New Site"}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input placeholder="Site name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <input placeholder="https://yoursite.com" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <input placeholder="Secret token (from WP plugin)" value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <select value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">No group</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {LANGUAGES.map((l) => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
          </select>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={save} disabled={saving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
            {saving ? "Saving..." : editId ? "Update Site" : "Add Site"}
          </button>
          {editId && (
            <button onClick={() => { setForm(BLANK); setEditId(null); }}
              className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Site list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">URL</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Group</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Language</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sites.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">No sites yet.</td></tr>
            )}
            {sites.map((site) => (
              <tr key={site.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{site.name}</td>
                <td className="px-4 py-3 text-gray-500 max-w-48 truncate">{site.url}</td>
                <td className="px-4 py-3">
                  {site.group ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: site.group.color + "22", color: site.group.color }}>
                      {site.group.name}
                    </span>
                  ) : <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3 text-gray-500 capitalize">{site.language}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => testConn(site.id)}
                      className="text-xs px-2 py-1 border border-gray-200 rounded hover:bg-gray-50">
                      {testStatus[site.id] === "loading" ? "..." :
                        testStatus[site.id] === "ok" ? "✓ OK" :
                        testStatus[site.id] === "fail" ? "✗ Fail" : "Test"}
                    </button>
                    <button onClick={() => startEdit(site)} className="text-xs text-indigo-600 hover:underline">Edit</button>
                    <button onClick={() => remove(site.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
