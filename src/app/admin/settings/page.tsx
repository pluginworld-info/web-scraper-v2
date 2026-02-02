'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    siteName: '',
    logoUrl: '',
    primaryColor: '#2563eb',
    accentColor: '#ef4444'
  });

  // 1. Fetch current settings on load
  useEffect(() => {
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
           setFormData({
             siteName: data.siteName || '',
             logoUrl: data.logoUrl || '',
             primaryColor: data.primaryColor || '#2563eb',
             accentColor: data.accentColor || '#ef4444'
           });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // 2. Handle Save
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        alert("Settings Saved! The site cache has been refreshed.");
        router.refresh();
      } else {
        alert("Failed to save settings.");
      }
    } catch (e) {
      alert("Error saving settings.");
    } finally {
      setSaving(false);
    }
  };

  // 3. Handle Cache Clearing (Client Side)
  const handleClearBrowserCache = () => {
    if (confirm("This will log you out and clear all local storage. Continue?")) {
      // Clear Cookies
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      // Clear Local Storage
      localStorage.clear();
      // Reload
      window.location.href = '/admin/login';
    }
  };

  if (loading) return <div className="text-[#666] animate-pulse p-8">Loading Settings...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tighter">Site Settings</h1>
        <p className="text-[#666] font-medium">Customize your platform branding and system preferences.</p>
      </div>

      {/* --- BRANDING SECTION --- */}
      <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-8">
        <h3 className="text-white font-bold mb-6 flex items-center gap-2">
           <span className="w-2 h-2 rounded-full bg-blue-500"></span> Identity & Branding
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#888] uppercase">Site Name</label>
            <input 
              type="text" 
              value={formData.siteName}
              onChange={(e) => setFormData({...formData, siteName: e.target.value})}
              className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="e.g. PluginDeals"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#888] uppercase">Logo URL</label>
            <input 
              type="text" 
              value={formData.logoUrl}
              onChange={(e) => setFormData({...formData, logoUrl: e.target.value})}
              className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="https://..."
            />
          </div>
        </div>
      </div>

      {/* --- THEME COLORS --- */}
      <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-8">
        <h3 className="text-white font-bold mb-6 flex items-center gap-2">
           <span className="w-2 h-2 rounded-full bg-purple-500"></span> Theme Colors
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Primary Color */}
          <div className="flex items-center gap-4 bg-[#111] p-4 rounded-xl border border-[#333]">
             <input 
               type="color" 
               value={formData.primaryColor}
               onChange={(e) => setFormData({...formData, primaryColor: e.target.value})}
               className="w-12 h-12 rounded-lg cursor-pointer bg-transparent border-none"
             />
             <div>
                <label className="block text-xs font-bold text-[#888] uppercase">Primary Color</label>
                <span className="text-white font-mono text-sm">{formData.primaryColor}</span>
             </div>
          </div>

          {/* Accent Color */}
          <div className="flex items-center gap-4 bg-[#111] p-4 rounded-xl border border-[#333]">
             <input 
               type="color" 
               value={formData.accentColor}
               onChange={(e) => setFormData({...formData, accentColor: e.target.value})}
               className="w-12 h-12 rounded-lg cursor-pointer bg-transparent border-none"
             />
             <div>
                <label className="block text-xs font-bold text-[#888] uppercase">Accent Color</label>
                <span className="text-white font-mono text-sm">{formData.accentColor}</span>
             </div>
          </div>
        </div>
      </div>

      {/* --- SAVE BUTTON --- */}
      <div className="flex justify-end">
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white font-black text-lg px-8 py-3 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-900/20 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      {/* --- DANGER ZONE (CACHE) --- */}
      <div className="mt-12 border-t border-[#333] pt-12">
        <h3 className="text-red-500 font-bold mb-6 flex items-center gap-2 uppercase tracking-widest text-sm">
           ⚠️ System Maintenance
        </h3>
        
        <div className="bg-red-900/10 border border-red-900/30 rounded-2xl p-6 flex items-center justify-between">
           <div>
             <h4 className="text-white font-bold">Clear Browser Session</h4>
             <p className="text-[#888] text-sm mt-1">
               This will delete all local cookies and storage, effectively logging you out.
             </p>
           </div>
           <button 
             onClick={handleClearBrowserCache}
             className="bg-black border border-red-900/50 text-red-500 px-6 py-2 rounded-lg text-sm font-bold uppercase hover:bg-red-900/20 transition"
           >
             Clear & Logout
           </button>
        </div>
      </div>

    </div>
  );
}