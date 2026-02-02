'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false); // Visual cue state
  
  // Form State
  const [formData, setFormData] = useState({
    siteName: '',
    logoUrl: '',
    primaryColor: '#2563eb',
    accentColor: '#ef4444'
  });

  // ✅ HELPER: Apply colors live to the entire document
  const applyThemeColors = (primary: string, accent: string) => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.style.setProperty('--primary', primary);
      root.style.setProperty('--accent', accent);
    }
  };

  // 1. Fetch current settings on load
  useEffect(() => {
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
           const newSettings = {
             siteName: data.siteName || '',
             logoUrl: data.logoUrl || '',
             primaryColor: data.primaryColor || '#2563eb',
             accentColor: data.accentColor || '#ef4444'
           };
           setFormData(newSettings);
           applyThemeColors(newSettings.primaryColor, newSettings.accentColor);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // 2. Handle Color Changes (Live Preview)
  const handleColorChange = (key: string, value: string) => {
    const newData = { ...formData, [key]: value };
    setFormData(newData);
    // Apply immediately so user sees the change
    applyThemeColors(newData.primaryColor, newData.accentColor);
  };

  // 3. Handle Save
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        alert("Settings Saved! Theme updated.");
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

  // 4. Handle Cache Clearing
  const handleClearBrowserCache = () => {
    if (confirm("This will log you out and clear all local storage. Continue?")) {
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      localStorage.clear();
      window.location.href = '/admin/login';
    }
  };

  // ✅ FIXED DRAG & DROP LOGIC
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    // Try to get data from different formats
    const textData = e.dataTransfer.getData('text/plain');
    const uriData = e.dataTransfer.getData('text/uri-list');
    
    // Prioritize URI, then Text
    const droppedUrl = uriData || textData;

    if (droppedUrl && (droppedUrl.startsWith('http') || droppedUrl.startsWith('/'))) {
        setFormData({ ...formData, logoUrl: droppedUrl });
    } else {
        alert("Could not detect a valid URL. Please right-click the image -> Copy Image Address, then paste it here.");
    }
  };

  if (loading) return <div className="text-[#666] animate-pulse p-8">Loading Settings...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tighter">Site Settings</h1>
        <p className="text-[#666] font-medium">Customize your platform branding and system preferences.</p>
      </div>

      {/* --- BRANDING SECTION --- */}
      <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-8">
        <h3 className="text-white font-bold mb-6 flex items-center gap-2">
           <span className="w-2 h-2 rounded-full bg-[var(--primary)]"></span> Identity & Branding
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className="space-y-3">
            <label className="text-xs font-bold text-[#888] uppercase">Site Name</label>
            <input 
              type="text" 
              value={formData.siteName}
              onChange={(e) => setFormData({...formData, siteName: e.target.value})}
              className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--primary)] transition-colors"
              placeholder="e.g. PluginDeals"
            />
            <p className="text-[10px] text-[#555]">Displayed in the browser tab and navigation fallback.</p>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-[#888] uppercase">Site Logo</label>
            
            {formData.logoUrl ? (
                <div className="relative group w-full h-32 bg-[#111] border border-[#333] rounded-xl flex items-center justify-center overflow-hidden">
                    <Image 
                        src={formData.logoUrl} 
                        alt="Logo Preview" 
                        fill 
                        className="object-contain p-4" 
                        unoptimized
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button 
                            onClick={() => setFormData({...formData, logoUrl: ''})}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg hover:bg-red-700 transition"
                        >
                            Delete Logo
                        </button>
                    </div>
                </div>
            ) : (
                <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`w-full h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors p-4 ${
                        isDragging ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[#333] bg-[#111] hover:border-[#555]'
                    }`}
                >
                    <span className={`text-xs font-bold uppercase mb-2 ${isDragging ? 'text-[var(--primary)]' : 'text-[#666]'}`}>
                        {isDragging ? 'Drop URL Here!' : 'Drop Image URL Here'}
                    </span>
                    <input 
                      type="text" 
                      value={formData.logoUrl}
                      onChange={(e) => setFormData({...formData, logoUrl: e.target.value})}
                      className="w-full bg-transparent text-center text-sm text-white focus:outline-none placeholder:text-[#333]"
                      placeholder="Or paste URL here..."
                    />
                </div>
            )}
          </div>
        </div>
      </div>

      {/* --- THEME COLORS --- */}
      <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-8">
        <h3 className="text-white font-bold mb-6 flex items-center gap-2">
           <span className="w-2 h-2 rounded-full bg-[var(--accent)]"></span> Theme Colors
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Primary Color */}
          <div className="flex items-center gap-4 bg-[#111] p-4 rounded-xl border border-[#333]">
             <input 
               type="color" 
               value={formData.primaryColor}
               onChange={(e) => handleColorChange('primaryColor', e.target.value)}
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
               onChange={(e) => handleColorChange('accentColor', e.target.value)}
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
      <div className="flex justify-end sticky bottom-6 z-10">
        <button 
          onClick={handleSave}
          disabled={saving}
          // Note: using explicit styles here because Tailwind variables handle class names, 
          // but for the button itself, inline styles ensure 100% reliability during preview
          style={{ backgroundColor: formData.primaryColor }}
          className="text-white font-black text-lg px-8 py-4 rounded-xl hover:opacity-90 transition shadow-xl disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? 'Processing...' : 'Save All Changes'}
        </button>
      </div>

      {/* --- SESSION INFO SECTION --- */}
      <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-[#111] border border-[#333] rounded-2xl p-6">
             <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Active Session
             </h3>
             <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-[#222]">
                   <span className="text-[#666] text-sm">Account Status</span>
                   <span className="text-green-500 font-bold text-sm bg-green-900/20 px-2 py-1 rounded">Authenticated</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#222]">
                   <span className="text-[#666] text-sm">Role</span>
                   <span className="text-white font-mono text-sm">Super Admin</span>
                </div>
                <div className="flex justify-between items-center py-2">
                   <span className="text-[#666] text-sm">Security Level</span>
                   <span className="text-white font-mono text-sm">High (HttpOnly)</span>
                </div>
             </div>
          </div>

          <div className="bg-red-900/10 border border-red-900/30 rounded-2xl p-6 flex flex-col justify-between">
             <div>
                <h3 className="text-red-500 font-bold mb-2 flex items-center gap-2 uppercase tracking-widest text-sm">
                    ⚠️ Danger Zone
                </h3>
                <p className="text-[#aaa] text-sm mb-6">
                    Clearing the browser session will remove all local data and log you out immediately.
                </p>
             </div>
             <button 
               onClick={handleClearBrowserCache}
               className="w-full bg-black border border-red-900/50 text-red-500 px-6 py-3 rounded-xl text-sm font-bold uppercase hover:bg-red-900/20 transition flex items-center justify-center gap-2"
             >
               Logout & Clear Cache
             </button>
          </div>
      </div>
    </div>
  );
}