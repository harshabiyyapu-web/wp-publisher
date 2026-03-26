"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [grokKey, setGrokKey] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [dashboardPw, setDashboardPw] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => {
      setGrokKey(d.grok_api_key === "••••••••" ? "" : (d.grok_api_key ?? ""));
      setCustomPrompt(d.custom_prompt ?? "");
      setDashboardPw("");
    });
  }, []);

  async function save() {
    setSaving(true);
    const body: Record<string, string> = { custom_prompt: customPrompt };
    if (grokKey) body.grok_api_key = grokKey;
    if (dashboardPw) body.dashboard_password = dashboardPw;

    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const DEFAULT_PROMPT = "";

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="space-y-5">
        {/* Grok API Key */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Grok API Key (via OpenRouter)</h2>
          <p className="text-xs text-gray-400 mb-3">
            Used for all AI rewrites. Model: <code className="bg-gray-100 px-1 rounded">x-ai/grok-4.1-fast</code> via OpenRouter.
          </p>
          <div className="flex gap-2">
            <input
              type={showKey ? "text" : "password"}
              placeholder="sk-or-v1-..."
              value={grokKey}
              onChange={(e) => setGrokKey(e.target.value)}
              className="flex-1 font-mono text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button onClick={() => setShowKey(!showKey)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              {showKey ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {/* Custom Prompt */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Custom Rewrite Prompt</h2>
          <p className="text-xs text-gray-400 mb-3">
            Leave blank to use the default prompt. Supports variables:{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{title_instruction}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{target_language}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{response_title_instruction}}"}</code>
          </p>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={8}
            placeholder="Leave empty to use the built-in SEO prompt identical to your WordPress plugin..."
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y font-mono"
          />
          {customPrompt && (
            <button onClick={() => setCustomPrompt("")}
              className="text-xs text-gray-500 hover:text-gray-700 mt-1">
              Clear (use default)
            </button>
          )}
        </div>

        {/* Dashboard password */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Dashboard Password</h2>
          <p className="text-xs text-gray-400 mb-3">
            Set a password to protect this dashboard. Leave blank to keep current password.
          </p>
          <input
            type="password"
            placeholder="New password (leave blank to keep current)"
            value={dashboardPw}
            onChange={(e) => setDashboardPw(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Token instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-blue-800 mb-2">How to get your WP site token</h2>
          <ol className="text-xs text-blue-700 space-y-1.5 list-decimal list-inside">
            <li>Make sure the updated plugin is installed on your WP site</li>
            <li>While logged in as admin, call this URL in your browser:</li>
          </ol>
          <code className="block mt-2 bg-blue-100 text-blue-800 px-3 py-2 rounded text-xs font-mono break-all">
            POST https://yoursite.com/wp-json/ccr/v1/generate-token
          </code>
          <p className="text-xs text-blue-600 mt-2">
            This returns a secure 64-char token. Paste it in the Sites page for that WP site.
          </p>
        </div>

        <button onClick={save} disabled={saving}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm disabled:opacity-50 transition-colors">
          {saved ? "✓ Saved!" : saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
