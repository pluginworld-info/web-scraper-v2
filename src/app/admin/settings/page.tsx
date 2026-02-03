'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false); 
  
  // Notification State
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ show: false, message: '', type: 'success' });

  // Form State
  const [formData, setFormData] = useState({
    siteName: '',
    logoUrl: '',
    primaryColor: '#2563eb',
    accentColor: '#ef4444'
  });

  // HELPER: Show Custom Notification
  const showToast = (message: string, type: 'success' | 'error') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  // HELPER: Apply colors live
  const applyThemeColors = (primary: string, accent: string) => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.style.setProperty('--primary', primary);
      root.style.setProperty('--accent', accent);
    }
  };

  // 1. Fetch current settings
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
        showToast("Configuration saved successfully.", "success");
        router.refresh();
      } else {
        showToast("Save failed. Check payload size.", "error");
      }
    } catch (e) {
      showToast("Network error saving settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  // 3. LOGOUT LOGIC (Fixed)
  const handleLogout = async () => {
    setLoading(true);
    try {
        // 1. Call server to clear HttpOnly cookies (Important!)
        await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
        console.warn("Server logout failed, forcing client logout");
    } finally {
        // 2. Force redirect to login
        window.location.href = '/admin/login';
    }
  };

  // 4. CLEAR CACHE LOGIC (Separate)
  const handleClearCache = () => {
    if (confirm("Reset local dashboard preferences? This will not log you out, but may reset table views and filters.")) {
        localStorage.clear();
        sessionStorage.clear();
        showToast("Local cache purged.", "success");
        setTimeout(() => window.location.reload(), 1000); // Reload to re-initialize
    }
  };

  // FILE UPLOAD LOGIC
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return showToast("File must be an image.", "error");
    if (file.size > 2 * 1024 * 1024) return showToast("File too large (Max 2MB).", "error");

    const reader = new FileReader();
    reader.onload = (e) => {
        const result = e.target?.result as string;
        setFormData(prev => ({ ...prev, logoUrl: result }));
        showToast("Logo staged for upload.", "success");
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };

  if (loading) return <div className="p-10 text-center text-[#666] animate-pulse">Loading Configuration...</div>;

  return (
    <main className="max-w-6xl mx-auto pb-20 space-y-8">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#333] pb-6">
        <div>
           <h1 className="text-3xl font-black text-white tracking-tight">System Settings</h1>
           <p className="text-[#888] font-medium mt-1">Manage global branding, theme, and admin sessions.</p>
        </div>
        <div className="flex items-center gap-3">
             <button 
                onClick={handleLogout}
                className="px-5 py-2.5 bg-[#222] hover:bg-[#333] border border-[#333] text-white text-sm font-bold rounded-lg transition-all flex items-center gap-2"
             >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Sign Out
             </button>
             <button 
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
             >
                {saving ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Saving...</>
                ) : (
                    <>Save Changes</>
                )}
             </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: BRANDING (Takes up 2 cols) */}
        <div className="lg:col-span-2 space-y-8">
            
            {/* BRANDING CARD */}
            <section className="bg-[#1a1a1a] border border-[#333] rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#333] bg-[#222]/50 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    </div>
                    <h2 className="text-white font-bold text-lg">Identity & Branding</h2>
                </div>
                
                <div className="p-6 space-y-6">
                    {/* Site Name */}
                    <div>
                        <label className="block text-xs font-bold text-[#666] uppercase mb-2">Platform Name</label>
                        <input 
                            type="text" 
                            value={formData.siteName}
                            onChange={(e) => setFormData({...formData, siteName: e.target.value})}
                            className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all placeholder-[#444]"
                            placeholder="e.g. PluginWorld Admin"
                        />
                    </div>

                    {/* Logo Upload */}
                    <div>
                        <label className="block text-xs font-bold text-[#666] uppercase mb-2">Logo Asset</label>
                        <div 
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                            onDrop={handleDrop}
                            className={`relative w-full h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all ${
                                isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-[#333] bg-[#111] hover:border-[#444]'
                            }`}
                        >
                            {formData.logoUrl ? (
                                <div className="relative w-full h-full p-4 flex items-center justify-center group">
                                    <Image 
                                        src={formData.logoUrl} 
                                        alt="Logo" 
                                        fill 
                                        className="object-contain p-4" 
                                        unoptimized
                                    />
                                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                        <button 
                                            onClick={() => setFormData({...formData, logoUrl: ''})}
                                            className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-xs"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center cursor-pointer p-8 w-full h-full justify-center">
                                    <svg className="w-10 h-10 text-[#333] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <span className="text-[#666] font-medium text-sm">Drag & Drop or <span className="text-blue-500 hover:underline">Browse</span></span>
                                    <span className="text-[#444] text-xs mt-1">PNG, JPG, SVG (Max 2MB)</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} />
                                </label>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </div>

        {/* RIGHT COLUMN: THEME & DANGER (Takes up 1 col) */}
        <div className="space-y-8">

            {/* THEME COLORS */}
            <section className="bg-[#1a1a1a] border border-[#333] rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#333] bg-[#222]/50 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                    </div>
                    <h2 className="text-white font-bold text-lg">Appearance</h2>
                </div>
                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-[#111] rounded-xl border border-[#333]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg shadow-inner" style={{backgroundColor: formData.primaryColor}}></div>
                                <div>
                                    <div className="text-xs text-[#666] font-bold uppercase">Primary</div>
                                    <div className="text-white font-mono text-xs">{formData.primaryColor}</div>
                                </div>
                            </div>
                            <input type="color" value={formData.primaryColor} onChange={(e) => { setFormData({...formData, primaryColor: e.target.value}); applyThemeColors(e.target.value, formData.accentColor); }} className="opacity-0 w-8 h-8 absolute cursor-pointer" />
                            <div className="text-[#444] text-xs">Edit</div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-[#111] rounded-xl border border-[#333]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg shadow-inner" style={{backgroundColor: formData.accentColor}}></div>
                                <div>
                                    <div className="text-xs text-[#666] font-bold uppercase">Accent</div>
                                    <div className="text-white font-mono text-xs">{formData.accentColor}</div>
                                </div>
                            </div>
                            <input type="color" value={formData.accentColor} onChange={(e) => { setFormData({...formData, accentColor: e.target.value}); applyThemeColors(formData.primaryColor, e.target.value); }} className="opacity-0 w-8 h-8 absolute cursor-pointer" />
                            <div className="text-[#444] text-xs">Edit</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* DANGER ZONE (Cache Only) */}
            <section className="bg-red-900/5 border border-red-900/20 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-red-900/20 bg-red-900/10 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <h2 className="text-red-400 font-bold text-lg">Troubleshooting</h2>
                </div>
                <div className="p-6">
                    <p className="text-[#888] text-xs mb-4 leading-relaxed">
                        If the dashboard UI looks broken or tables aren't updating, try clearing the local browser cache. This does <strong>not</strong> delete any data from the server.
                    </p>
                    <button 
                        onClick={handleClearCache}
                        className="w-full bg-[#111] hover:bg-red-900/20 border border-red-900/30 text-red-400 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                    >
                        Clear Local Cache
                    </button>
                </div>
            </section>

        </div>
      </div>

      {/* TOAST NOTIFICATION */}
      <div className={`fixed bottom-6 right-6 z-50 transform transition-all duration-300 ${notification.show ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
         <div className={`flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border bg-[#1a1a1a] ${notification.type === 'success' ? 'border-green-900 text-green-400' : 'border-red-900 text-red-400'}`}>
            <div className={`w-2 h-2 rounded-full ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="font-bold text-sm">{notification.message}</span>
         </div>
      </div>

    </main>
  );
}