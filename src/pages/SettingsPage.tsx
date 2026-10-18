// ──────────────────────────────────────────────
// Settings Page — Interface preferences (Light Mode Only)
// ──────────────────────────────────────────────

import React, { useState } from 'react';
import { Settings as SettingsIcon, Bell, Globe, CheckCircle2 } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState('en');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shadow-lg shadow-slate-600/20 text-white">
          <SettingsIcon className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Settings</h2>
          <p className="text-xs text-slate-400">Manage your system preferences</p>
        </div>
      </div>

      {saved && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Preferences saved successfully!
        </div>
      )}

      {/* Settings card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100">
        {/* Notifications */}
        <div className="flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Push Notifications</p>
              <p className="text-xs text-slate-400">Receive alerts for new marks and attendance updates</p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={notifications}
            aria-label="Toggle push notifications"
            onClick={() => setNotifications(!notifications)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-royal-500/40 ${
              notifications ? 'bg-royal-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                notifications ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Language */}
        <div className="flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Language</p>
              <p className="text-xs text-slate-400">Select your preferred portal language</p>
            </div>
          </div>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-royal-500/30"
          >
            <option value="en">English</option>
            <option value="ta">Tamil (தமிழ்)</option>
          </select>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-royal-500 to-royal-600 hover:from-royal-600 hover:to-royal-700 text-white text-sm font-semibold shadow-lg shadow-royal-500/25 transition-all"
        >
          Save Preferences
        </button>
      </div>

      {/* Future features note */}
      <div className="bg-blue-50/70 rounded-2xl p-5 border border-blue-100">
        <p className="text-sm text-blue-700 font-bold mb-1">🚀 Architecture Ready</p>
        <p className="text-xs text-blue-600 leading-relaxed">
          Modular design with ready integration hooks for Voice Navigation (Tamil, Tanglish, English),
          RAG-powered campus knowledge search, and Supabase backend.
        </p>
      </div>
    </div>
  );
};

export default SettingsPage;
