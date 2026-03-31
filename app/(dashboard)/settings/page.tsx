"use client";

import { useEffect, useState } from "react";

const HARDCODED_KEY = "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";

export default function SettingsPage() {
  const [grokKey, setGrokKey] = useState("");
  const [keyIsSet, setKeyIsSet] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [dashboardPw, setDashboardPw] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => {
      // If the API returns masked key or hardcoded key is always available, mark as set
      if (d.grok_api_key === "••••••••") {
        setKeyIsSet(true);
        setGrokKey(""); // Don't show masked dots in the input
      } else {
        setGrokKey(d.grok_api_key ?? "");
        setKeyIsSet(!!d.grok_api_key);
      }
      setCustomPrompt(d.custom_prompt ?? "");
    });
  }, []);

  async function save() {
    setSaving(true);
    const body: Record<string, string> = { custom_prompt: customPrompt };
    // Only send API key if user typed a new one
    if (grokKey && grokKey.trim()) {
      body.grok_api_key = grokKey.trim();
    }
    if (dashboardPw) body.dashboard_password = dashboardPw;
    await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSaving(false);
    setSaved(true);
    // If user entered a new key, mark as set
    if (grokKey && grokKey.trim()) {
      setKeyIsSet(true);
      setGrokKey(""); // Clear the input after saving
    }
    setTimeout(() => setSaved(false), 2000);
  }

  const inputClass = "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Configure your API keys and publishing preferences.</p>
      </div>

      <div className="space-y-4">
        {/* Grok API Key */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-start justify-between mb-1">
            <h2 className="text-sm font-semibold text-slate-800">OpenRouter API Key</h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#eef2ff", color: "#6366f1" }}>
              Grok 4.1 Fast
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Used for all AI rewrites. Model: <code className="bg-slate-100 px-1 rounded text-slate-600">x-ai/grok-4.1-fast</code>
          </p>

          {/* Status badge */}
          {keyIsSet && !grokKey && (
            <div className="flex items-center gap-1.5 mb-3 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              <span className="text-emerald-700 font-medium">API Key is configured</span>
              <span className="text-slate-400 ml-1">— enter a new key below to change it</span>
            </div>
          )}

          <div className="flex gap-2">
            <input
              type={showKey ? "text" : "password"}
              placeholder={keyIsSet ? "Enter new key to replace current one..." : "sk-or-v1-..."}
              value={grokKey}
              onChange={(e) => setGrokKey(e.target.value)}
              className={`flex-1 font-mono ${inputClass}`}
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 bg-white"
            >
              {showKey ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {/* Custom Prompt */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-1">Custom Rewrite Prompt</h2>
          <p className="text-xs text-slate-400 mb-3">
            Leave blank to use the default prompt. Available variables:{" "}
            <code className="bg-slate-100 px-1 rounded text-slate-600">{"{{title_instruction}}"}</code>,{" "}
            <code className="bg-slate-100 px-1 rounded text-slate-600">{"{{target_language}}"}</code>
          </p>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={8}
            placeholder="Leave empty to use the built-in SEO prompt identical to your WordPress plugin..."
            className={`${inputClass} resize-y font-mono`}
          />
          {customPrompt && (
            <button onClick={() => setCustomPrompt("")} className="text-xs text-slate-400 hover:text-slate-600 mt-1.5">
              Clear (use default prompt)
            </button>
          )}
        </div>

        {/* Dashboard password */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-1">Dashboard Password</h2>
          <p className="text-xs text-slate-400 mb-3">
            Protect this dashboard with a password. Leave blank to keep the current password.
          </p>
          <input
            type="password"
            placeholder="New password (leave blank to keep current)"
            value={dashboardPw}
            onChange={(e) => setDashboardPw(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* WP Token instructions */}
        <div className="rounded-2xl border border-blue-100 p-5" style={{ background: "linear-gradient(135deg, #eff6ff, #f0f9ff)" }}>
          <h3 className="text-sm font-semibold text-blue-800 mb-2">How to get your WP site token</h3>
          <ol className="text-xs text-blue-700 space-y-1.5 list-decimal list-inside">
            <li>Install the updated plugin on your WP site</li>
            <li>In WP Admin, go to <strong>Tools → Available Tools</strong></li>
            <li>Find the <strong>WP Publisher — Site Token</strong> card</li>
            <li>Click <strong>Generate Token</strong>, then <strong>Copy Token</strong></li>
            <li>Paste it on the <a href="/sites" style={{ color: "#1d4ed8", textDecoration: "underline" }}>Sites page</a> for that site</li>
          </ol>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full py-3 font-semibold rounded-xl text-sm text-white transition-all disabled:opacity-50"
          style={{
            background: saved ? "#16a34a" : "linear-gradient(135deg, #6366f1, #7c3aed)",
            boxShadow: saved ? "0 2px 8px rgba(22,163,74,0.3)" : "0 4px 14px rgba(99,102,241,0.4)",
          }}
        >
          {saved ? "✓ Settings Saved!" : saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
