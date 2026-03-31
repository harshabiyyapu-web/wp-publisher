"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  // --- API Key state ---
  const [apiKey, setApiKey] = useState("");
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [apiKeySaving, setApiKeySaving] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<"idle" | "saved" | "error">("idle");
  const [apiKeyError, setApiKeyError] = useState("");
  const [showKey, setShowKey] = useState(false);

  // --- Other settings state ---
  const [customPrompt, setCustomPrompt] = useState("");
  const [dashboardPw, setDashboardPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Check if API key is already configured
    fetch("/api/apikey")
      .then((r) => r.json())
      .then((d) => setApiKeyConfigured(d.configured === true));

    // Load other settings
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setCustomPrompt(d.custom_prompt ?? "");
      });
  }, []);

  async function saveApiKey() {
    if (!apiKey.trim()) {
      setApiKeyError("Please enter an API key.");
      setApiKeyStatus("error");
      return;
    }
    setApiKeySaving(true);
    setApiKeyStatus("idle");
    setApiKeyError("");
    try {
      const res = await fetch("/api/apikey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: apiKey.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setApiKeyStatus("saved");
        setApiKeyConfigured(true);
        setApiKey("");
        setTimeout(() => setApiKeyStatus("idle"), 3000);
      } else {
        setApiKeyStatus("error");
        setApiKeyError(data.error ?? "Failed to save.");
      }
    } catch {
      setApiKeyStatus("error");
      setApiKeyError("Network error — could not save.");
    } finally {
      setApiKeySaving(false);
    }
  }

  async function saveOtherSettings() {
    setSaving(true);
    const body: Record<string, string> = {};
    if (customPrompt.trim()) body.custom_prompt = customPrompt.trim();
    if (dashboardPw.trim()) body.dashboard_password = dashboardPw.trim();
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    setSaved(true);
    setDashboardPw("");
    setTimeout(() => setSaved(false), 2000);
  }

  const inputClass =
    "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Configure your API keys and publishing preferences.</p>
      </div>

      <div className="space-y-4">

        {/* ── API Key Card ── */}
        <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-sm p-6">
          <div className="flex items-start justify-between mb-1">
            <h2 className="text-sm font-bold text-slate-800">OpenRouter API Key</h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#eef2ff", color: "#6366f1" }}>
              Grok 4.1 Fast
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Required for AI rewrites. Get your key from{" "}
            <span className="text-indigo-500">openrouter.ai</span>.
          </p>

          {/* Status */}
          <div className="mb-3">
            {apiKeyStatus === "saved" && (
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <span className="text-base">✓</span> API Key saved successfully!
              </div>
            )}
            {apiKeyStatus === "error" && (
              <div className="flex items-center gap-2 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <span className="text-base">✗</span> {apiKeyError}
              </div>
            )}
            {apiKeyStatus === "idle" && apiKeyConfigured && !apiKey && (
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                API Key is saved and active. Enter a new key below to replace it.
              </div>
            )}
            {apiKeyStatus === "idle" && !apiKeyConfigured && (
              <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <span className="text-base">⚠</span> No API key configured — publishing will not work.
              </div>
            )}
          </div>

          <div className="flex gap-2 mb-3">
            <input
              type={showKey ? "text" : "password"}
              placeholder="Paste your OpenRouter API key here..."
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setApiKeyStatus("idle"); }}
              className={`flex-1 font-mono ${inputClass}`}
              onKeyDown={(e) => e.key === "Enter" && saveApiKey()}
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 bg-white"
            >
              {showKey ? "Hide" : "Show"}
            </button>
          </div>

          <button
            onClick={saveApiKey}
            disabled={apiKeySaving || !apiKey.trim()}
            className="w-full py-3 font-bold rounded-xl text-sm text-white transition-all disabled:opacity-40"
            style={{
              background: apiKeyStatus === "saved" ? "#16a34a" : "linear-gradient(135deg, #6366f1, #7c3aed)",
              boxShadow: apiKeyStatus === "saved" ? "0 2px 8px rgba(22,163,74,0.3)" : "0 4px 14px rgba(99,102,241,0.4)",
            }}
          >
            {apiKeySaving ? "Saving API Key..." : apiKeyStatus === "saved" ? "✓ API Key Saved!" : "Save API Key"}
          </button>
        </div>

        {/* ── Custom Prompt ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-1">Custom Rewrite Prompt</h2>
          <p className="text-xs text-slate-400 mb-3">
            Leave blank to use the default prompt. Variables:{" "}
            <code className="bg-slate-100 px-1 rounded text-slate-600">{"{{title_instruction}}"}</code>,{" "}
            <code className="bg-slate-100 px-1 rounded text-slate-600">{"{{target_language}}"}</code>
          </p>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={8}
            placeholder="Leave empty to use the built-in SEO prompt..."
            className={`${inputClass} resize-y font-mono`}
          />
          {customPrompt && (
            <button onClick={() => setCustomPrompt("")} className="text-xs text-slate-400 hover:text-slate-600 mt-1.5">
              Clear (use default prompt)
            </button>
          )}
        </div>

        {/* ── Dashboard Password ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-1">Dashboard Password</h2>
          <p className="text-xs text-slate-400 mb-3">Leave blank to keep the current password.</p>
          <input
            type="password"
            placeholder="New password (leave blank to keep current)"
            value={dashboardPw}
            onChange={(e) => setDashboardPw(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* ── WP Token instructions ── */}
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

        {/* ── Save other settings button ── */}
        <button
          onClick={saveOtherSettings}
          disabled={saving}
          className="w-full py-3 font-semibold rounded-xl text-sm text-white transition-all disabled:opacity-50"
          style={{
            background: saved ? "#16a34a" : "linear-gradient(135deg, #64748b, #475569)",
            boxShadow: saved ? "0 2px 8px rgba(22,163,74,0.3)" : "0 4px 14px rgba(100,116,139,0.3)",
          }}
        >
          {saved ? "✓ Saved!" : saving ? "Saving..." : "Save Prompt & Password"}
        </button>
      </div>
    </div>
  );
}
