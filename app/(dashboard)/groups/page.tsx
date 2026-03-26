"use client";

import { useEffect, useState } from "react";

interface Group {
  id: number;
  name: string;
  geography: string;
  color: string;
  sites: { id: number; name: string }[];
}

const COLORS = [
  "#6366f1","#8b5cf6","#ec4899","#ef4444","#f59e0b",
  "#10b981","#14b8a6","#3b82f6","#06b6d4","#84cc16",
];
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
    if (!form.name) { alert("Group name is required"); return; }
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

  const inputClass = "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Site Groups</h1>
        <p className="text-sm text-slate-500 mt-0.5">Group sites together for bulk publishing and one-click link copying.</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white"
            style={{ background: editId ? "#f59e0b" : "#6366f1" }}>
            {editId ? "✎" : "+"}
          </span>
          {editId ? "Edit Group" : "Create Group"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Group Name <span className="text-red-400">*</span></label>
            <input
              placeholder="e.g. India - Hindi"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Label / Region <span className="text-slate-300">(optional)</span></label>
            <input
              placeholder="e.g. South Asia"
              value={form.geography}
              onChange={(e) => setForm({ ...form, geography: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <label className="text-xs font-semibold text-slate-500">Color</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setForm({ ...form, color: c })}
                className="w-7 h-7 rounded-full transition-all"
                style={{
                  background: c,
                  outline: form.color === c ? `3px solid ${c}` : "3px solid transparent",
                  outlineOffset: "2px",
                  transform: form.color === c ? "scale(1.15)" : "scale(1)",
                }}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #6366f1, #7c3aed)", boxShadow: "0 2px 8px rgba(99,102,241,0.3)" }}
          >
            {saving ? "Saving..." : editId ? "Update" : "Create Group"}
          </button>
          {editId && (
            <button onClick={() => { setForm(BLANK); setEditId(null); }}
              className="px-5 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50">
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Group list */}
      {groups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-slate-400 text-sm">No groups yet. Create your first group above.</p>
          <p className="text-slate-400 text-xs mt-1">Groups let you publish to many sites at once and copy all their links in one click.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: g.color + "20" }}>
                  <div className="w-4 h-4 rounded-full" style={{ background: g.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{g.name}</p>
                    {g.geography && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{g.geography}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{g.sites.length} site{g.sites.length !== 1 ? "s" : ""} in this group</p>
                </div>
                <div className="flex gap-3 text-xs flex-shrink-0">
                  <button
                    onClick={() => { setEditId(g.id); setForm({ name: g.name, geography: g.geography, color: g.color }); window.scrollTo(0, 0); }}
                    className="font-medium" style={{ color: "#6366f1" }}>
                    Edit
                  </button>
                  <button onClick={() => remove(g.id)} className="font-medium text-red-400 hover:text-red-600">Delete</button>
                </div>
              </div>
              {g.sites.length > 0 && (
                <div className="px-5 pb-4 flex flex-wrap gap-1.5">
                  {g.sites.map((s) => (
                    <span key={s.id} className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{ background: g.color + "15", color: g.color }}>
                      {s.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
