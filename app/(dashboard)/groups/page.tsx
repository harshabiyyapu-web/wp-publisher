"use client";

import { useEffect, useState } from "react";

interface Group {
  id: number;
  name: string;
  geography: string;
  color: string;
  sites: { id: number; name: string }[];
}

const COLORS = ["#6366f1","#10b981","#f59e0b","#ef4444","#3b82f6","#8b5cf6","#ec4899","#14b8a6"];
const BLANK = { name: "", geography: "", color: "#6366f1" };

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [form, setForm] = useState(BLANK);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const g = await fetch("/api/groups").then((r) => r.json());
    setGroups(g);
  }

  async function save() {
    if (!form.name || !form.geography) { alert("Name and geography are required"); return; }
    setSaving(true);
    const url = editId ? `/api/groups/${editId}` : "/api/groups";
    const method = editId ? "PUT" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setForm(BLANK); setEditId(null); setSaving(false); load();
  }

  async function remove(id: number) {
    if (!confirm("Delete this group? Sites will be unassigned.")) return;
    await fetch(`/api/groups/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Geography Groups</h1>

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">{editId ? "Edit Group" : "Create Group"}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input placeholder="Group name (e.g. India - Hindi)" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <input placeholder="Geography label (e.g. South Asia)" value={form.geography}
            onChange={(e) => setForm({ ...form, geography: e.target.value })}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex gap-2 mt-3 items-center">
          <span className="text-xs text-gray-500">Color:</span>
          {COLORS.map((c) => (
            <button key={c} onClick={() => setForm({ ...form, color: c })}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${form.color === c ? "border-gray-900 scale-110" : "border-transparent"}`}
              style={{ background: c }} />
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={save} disabled={saving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
            {saving ? "Saving..." : editId ? "Update" : "Create Group"}
          </button>
          {editId && (
            <button onClick={() => { setForm(BLANK); setEditId(null); }}
              className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Group list */}
      <div className="space-y-3">
        {groups.length === 0 && <p className="text-gray-400 text-sm text-center py-8">No groups yet.</p>}
        {groups.map((g) => (
          <div key={g.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-4">
            <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ background: g.color }} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">{g.name}</p>
              <p className="text-xs text-gray-500">{g.geography} · {g.sites.length} site{g.sites.length !== 1 ? "s" : ""}</p>
              {g.sites.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {g.sites.map((s) => (
                    <span key={s.id} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{s.name}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 text-xs flex-shrink-0">
              <button onClick={() => { setEditId(g.id); setForm({ name: g.name, geography: g.geography, color: g.color }); window.scrollTo(0,0); }}
                className="text-indigo-600 hover:underline">Edit</button>
              <button onClick={() => remove(g.id)} className="text-red-500 hover:underline">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
