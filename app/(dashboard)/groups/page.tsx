"use client";

import { useEffect, useState } from "react";

interface Site {
  id: number;
  name: string;
  url: string;
  token: string;
  language: string;
  groupId: number | null;
}

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
  const [allSites, setAllSites] = useState<Site[]>([]);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  // which group card is expanded for management
  const [expandedId, setExpandedId] = useState<number | null>(null);
  // inline edit form per group: groupId -> form state
  const [editForms, setEditForms] = useState<Record<number, { name: string; geography: string; color: string }>>({});
  const [savingGroup, setSavingGroup] = useState<number | null>(null);
  const [togglingsite, setTogglingSite] = useState<number | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const [g, s] = await Promise.all([
      fetch("/api/groups").then((r) => r.json()),
      fetch("/api/sites").then((r) => r.json()),
    ]);
    setGroups(g);
    setAllSites(s);
  }

  // Create new group
  async function createGroup() {
    if (!form.name) { alert("Group name is required"); return; }
    setSaving(true);
    await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm(BLANK);
    setSaving(false);
    load();
  }

  // Delete group
  async function removeGroup(id: number) {
    if (!confirm("Delete this group? All sites will be unassigned.")) return;
    await fetch(`/api/groups/${id}`, { method: "DELETE" });
    load();
  }

  // Open inline edit for a group
  function openEdit(g: Group) {
    setEditForms((prev) => ({ ...prev, [g.id]: { name: g.name, geography: g.geography, color: g.color } }));
    setExpandedId((prev) => (prev === g.id ? null : g.id));
  }

  // Save inline edits for a group
  async function saveGroupEdit(id: number) {
    const f = editForms[id];
    if (!f?.name) { alert("Name is required"); return; }
    setSavingGroup(id);
    await fetch(`/api/groups/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    setSavingGroup(null);
    load();
  }

  // Toggle a site's membership in a group
  async function toggleSite(site: Site, groupId: number) {
    setTogglingSite(site.id);
    const newGroupId = site.groupId === groupId ? null : groupId;
    await fetch(`/api/sites/${site.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: newGroupId }),
    });
    setTogglingSite(null);
    load();
  }

  const inputClass = "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Site Groups</h1>
        <p className="text-sm text-slate-500 mt-0.5">Group sites for bulk publishing and one-click link copying. Click a group to manage it.</p>
      </div>

      {/* Create new group form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white" style={{ background: "#6366f1" }}>+</span>
          Create New Group
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Group Name <span className="text-red-400">*</span></label>
            <input placeholder="e.g. India - Hindi" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && createGroup()}
              className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Label / Region <span className="text-slate-300">(optional)</span></label>
            <input placeholder="e.g. South Asia" value={form.geography}
              onChange={(e) => setForm({ ...form, geography: e.target.value })}
              className={inputClass} />
          </div>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <label className="text-xs font-semibold text-slate-500">Color</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button key={c} onClick={() => setForm({ ...form, color: c })}
                className="w-7 h-7 rounded-full transition-all"
                style={{ background: c, outline: form.color === c ? `3px solid ${c}` : "3px solid transparent", outlineOffset: "2px", transform: form.color === c ? "scale(1.15)" : "scale(1)" }} />
            ))}
          </div>
          <div className="w-6 h-6 rounded-full border-2 border-slate-200" style={{ background: form.color }} />
        </div>
        <button onClick={createGroup} disabled={saving}
          className="px-5 py-2 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #6366f1, #7c3aed)", boxShadow: "0 2px 8px rgba(99,102,241,0.3)" }}>
          {saving ? "Creating..." : "Create Group"}
        </button>
      </div>

      {/* Group cards */}
      {groups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-slate-400 text-sm">No groups yet. Create your first group above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => {
            const isExpanded = expandedId === g.id;
            const ef = editForms[g.id] ?? { name: g.name, geography: g.geography, color: g.color };
            const groupSiteIds = new Set(g.sites.map((s) => s.id));

            return (
              <div key={g.id} className="bg-white rounded-2xl border shadow-sm overflow-hidden transition-all"
                style={{ borderColor: isExpanded ? g.color + "60" : "#e2e8f0" }}>

                {/* Group header row */}
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: g.color + "20" }}>
                    <div className="w-4 h-4 rounded-full" style={{ background: g.color }} />
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(g)}>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">{g.name}</p>
                      {g.geography && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{g.geography}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{g.sites.length} site{g.sites.length !== 1 ? "s" : ""} · click to manage</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => openEdit(g)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all"
                      style={{
                        borderColor: isExpanded ? g.color : "#e2e8f0",
                        background: isExpanded ? g.color : "white",
                        color: isExpanded ? "white" : "#64748b",
                      }}>
                      {isExpanded ? "Close" : "Manage"}
                    </button>
                    <button onClick={() => removeGroup(g.id)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-red-400 hover:bg-red-50 hover:border-red-200 transition-all">
                      Delete
                    </button>
                  </div>
                </div>

                {/* Site pills preview (collapsed) */}
                {!isExpanded && g.sites.length > 0 && (
                  <div className="px-5 pb-4 flex flex-wrap gap-1.5">
                    {g.sites.map((s) => (
                      <span key={s.id} className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ background: g.color + "15", color: g.color }}>
                        {s.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Expanded management panel */}
                {isExpanded && (
                  <div className="border-t px-5 py-5 space-y-5" style={{ borderColor: g.color + "30", background: g.color + "06" }}>

                    {/* Edit group properties */}
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Group Settings</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Name</label>
                          <input value={ef.name}
                            onChange={(e) => setEditForms((prev) => ({ ...prev, [g.id]: { ...ef, name: e.target.value } }))}
                            className={inputClass} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Label / Region</label>
                          <input value={ef.geography} placeholder="Optional"
                            onChange={(e) => setEditForms((prev) => ({ ...prev, [g.id]: { ...ef, geography: e.target.value } }))}
                            className={inputClass} />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        <label className="text-xs font-semibold text-slate-500">Color</label>
                        <div className="flex gap-2 flex-wrap">
                          {COLORS.map((c) => (
                            <button key={c}
                              onClick={() => setEditForms((prev) => ({ ...prev, [g.id]: { ...ef, color: c } }))}
                              className="w-6 h-6 rounded-full transition-all"
                              style={{ background: c, outline: ef.color === c ? `3px solid ${c}` : "3px solid transparent", outlineOffset: "2px", transform: ef.color === c ? "scale(1.15)" : "scale(1)" }} />
                          ))}
                        </div>
                      </div>
                      <button onClick={() => saveGroupEdit(g.id)} disabled={savingGroup === g.id}
                        className="px-4 py-1.5 text-xs font-semibold text-white rounded-lg disabled:opacity-50"
                        style={{ background: ef.color, boxShadow: `0 2px 6px ${ef.color}40` }}>
                        {savingGroup === g.id ? "Saving..." : "Save Changes"}
                      </button>
                    </div>

                    {/* Site assignment */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assign Sites</h3>
                        <span className="text-xs text-slate-400">{groupSiteIds.size} of {allSites.length} assigned</span>
                      </div>
                      {allSites.length === 0 ? (
                        <p className="text-xs text-slate-400">No sites yet. <a href="/sites" style={{ color: g.color }}>Add sites first.</a></p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {allSites.map((site) => {
                            const inThisGroup = groupSiteIds.has(site.id);
                            const inOtherGroup = !inThisGroup && site.groupId !== null;
                            const otherGroup = inOtherGroup ? groups.find((gr) => gr.id === site.groupId) : null;
                            const isToggling = togglingsite === site.id;

                            return (
                              <label key={site.id}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all"
                                style={{
                                  borderColor: inThisGroup ? g.color + "60" : "#f1f5f9",
                                  background: inThisGroup ? g.color + "08" : "white",
                                  opacity: isToggling ? 0.6 : 1,
                                }}>
                                <input
                                  type="checkbox"
                                  checked={inThisGroup}
                                  onChange={() => toggleSite(site, g.id)}
                                  disabled={isToggling}
                                  style={{ accentColor: g.color }}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-800 truncate">{site.name}</p>
                                  <p className="text-xs text-slate-400 truncate">{site.url}</p>
                                </div>
                                {inOtherGroup && otherGroup && (
                                  <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium"
                                    style={{ background: otherGroup.color + "18", color: otherGroup.color }}>
                                    {otherGroup.name}
                                  </span>
                                )}
                                {inThisGroup && (
                                  <span className="text-xs font-semibold flex-shrink-0" style={{ color: g.color }}>✓</span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      )}
                      <p className="text-xs text-slate-400 mt-2">
                        Checking a site from another group will move it to this group.
                      </p>
                    </div>
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
