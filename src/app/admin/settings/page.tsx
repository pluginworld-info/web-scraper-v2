'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// --- TYPES ---
type NotificationType = 'success' | 'error';
type ModalType = 'logout' | 'clear_cache' | null;

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false); 
  
  // Modal State
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [processingAction, setProcessingAction] = useState(false);

  // Notification State
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: NotificationType;
  }>({ show: false, message: '', type: 'success' });

  // Form State
  const [formData, setFormData] = useState({
    siteName: '',
    logoUrl: '',
    primaryColor: '#2563eb',
    accentColor: '#ef4444'
  });

  // --- HELPERS ---

  const showToast = (message: string, type: NotificationType) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const applyThemeColors = (primary: string, accent: string) => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.style.setProperty('--primary', primary);
      root.style.setProperty('--accent', accent);
    }
  };

  // --- EFFECTS ---

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

  // --- ACTIONS ---

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        showToast("System configuration updated.", "success");
        router.refresh();
      } else {
        showToast("Save failed. Image might be too large.", "error");
      }
    } catch (e) {
      showToast("Network error. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  // ✅ ROBUST LOGOUT LOGIC
  const executeLogout = async () => {
    setProcessingAction(true);
    
    try {
        // 1. Ask Server to delete the HttpOnly Cookie
        // We do this before clearing client storage to ensure the server session is dead
        await fetch('/api/admin/auth/logout', { method: 'POST' });
        
        // 2. Clear any cosmetic client data
        localStorage.clear();
        sessionStorage.clear();

        // 3. FORCE a hard refresh to the login page.
        // using window.location.href ensures the React state is completely dumped.
        window.location.href = '/admin/login'; 
        
    } catch (e) {
        console.error("Logout failed", e);
        // Fallback: Force redirect anyway if API fails, so user isn't stuck
        window.location.href = '/admin/login';
    }
  };

  // ✅ CLEAR CACHE LOGIC
  const executeClearCache = () => {
    setProcessingAction(true);
    // Simulate a small delay for UX
    setTimeout(() => {
        localStorage.clear();
        sessionStorage.clear();
        showToast("Local cache purged successfully.", "success");
        setActiveModal(null);
        setProcessingAction(false);
        // Optional: Reload to reset state
        window.location.reload();
    }, 800);
  };

  // --- FILE HANDLING ---
  
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return showToast("File must be an image.", "error");
    if (file.size > 2 * 1024 * 1024) return showToast("File too large (Max 2MB).", "error");

    const reader = new FileReader();
    reader.onload = (e) => {
        const result = e.target?.result as string;
        setFormData(prev => ({ ...prev, logoUrl: result }));
        showToast("Logo ready to save.", "success");
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };

  if (loading) return <div className="text-[#666] animate-pulse">Loading System Preferences...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 relative">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-[#333] pb-6">
        <div>
           <h1 className="text-3xl font-black text-white tracking-tight">System Settings</h1>
           <p className="text-[#888] font-medium mt-2">Manage branding, theme, and admin session.</p>
        </div>
        <div className="flex items-center gap-3">
             {/* TRIGGER LOGOUT MODAL */}
             <button 
                onClick={() => setActiveModal('logout')}
                className="px-5 py-3 bg-[#222] hover:bg-[#333] hover:text-red-400 border border-[#333] text-[#aaa] text-sm font-bold rounded-xl transition-all flex items-center gap-2 group"
             >
                <svg className="w-4 h-4 group-hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Sign Out
             </button>
             
             <button 
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
        
        {/* LEFT COLUMN: BRANDING */}
        <div className="lg:col-span-2 space-y-8">
            <section className="bg-[#1a1a1a] border border-[#333] rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-[#333] bg-[#222]/50 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <h2 className="text-white font-bold text-lg">Identity & Branding</h2>
                </div>
                
                <div className="p-8 space-y-8">
                    {/* Site Name */}
                    <div>
                        <label className="block text-xs font-bold text-[#666] uppercase mb-2 tracking-wider">Platform Name</label>
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
                        <label className="block text-xs font-bold text-[#666] uppercase mb-2 tracking-wider">Logo Asset</label>
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
                                        className="object-contain p-6" 
                                        unoptimized
                                    />
                                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                                        <button 
                                            onClick={() => setFormData({...formData, logoUrl: ''})}
                                            className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-xl transform hover:scale-105 transition-all"
                                        >
                                            Remove Logo
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center cursor-pointer p-8 w-full h-full justify-center group">
                                    <div className="w-12 h-12 rounded-full bg-[#222] flex items-center justify-center mb-4 group-hover:bg-[#333] transition-colors border border-[#333]">
                                        <svg className="w-6 h-6 text-[#666]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                    </div>
                                    <span className="text-[#888] font-medium text-sm group-hover:text-white transition-colors">Click to Upload</span>
                                    <span className="text-[#555] text-xs mt-1">or drag and drop (Max 2MB)</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} />
                                </label>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </div>

        {/* RIGHT COLUMN: THEME & DANGER */}
        <div className="space-y-8">

            {/* THEME COLORS */}
            <section className="bg-[#1a1a1a] border border-[#333] rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-[#333] bg-[#222]/50 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                    </div>
                    <h2 className="text-white font-bold text-lg">Appearance</h2>
                </div>
                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-[#111] rounded-xl border border-[#333] hover:border-[#555] transition-colors relative">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg shadow-inner ring-1 ring-white/10" style={{backgroundColor: formData.primaryColor}}></div>
                                <div>
                                    <div className="text-[10px] text-[#666] font-bold uppercase tracking-wider">Primary</div>
                                    <div className="text-white font-mono text-xs">{formData.primaryColor}</div>
                                </div>
                            </div>
                            <input type="color" value={formData.primaryColor} onChange={(e) => { setFormData({...formData, primaryColor: e.target.value}); applyThemeColors(e.target.value, formData.accentColor); }} className="opacity-0 w-full h-full absolute top-0 left-0 cursor-pointer" />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-[#111] rounded-xl border border-[#333] hover:border-[#555] transition-colors relative">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg shadow-inner ring-1 ring-white/10" style={{backgroundColor: formData.accentColor}}></div>
                                <div>
                                    <div className="text-[10px] text-[#666] font-bold uppercase tracking-wider">Accent</div>
                                    <div className="text-white font-mono text-xs">{formData.accentColor}</div>
                                </div>
                            </div>
                            <input type="color" value={formData.accentColor} onChange={(e) => { setFormData({...formData, accentColor: e.target.value}); applyThemeColors(formData.primaryColor, e.target.value); }} className="opacity-0 w-full h-full absolute top-0 left-0 cursor-pointer" />
                        </div>
                    </div>
                </div>
            </section>

            {/* DANGER ZONE (Cache Only) */}
            <section className="bg-red-900/5 border border-red-900/20 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-red-900/20 bg-red-900/10 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <h2 className="text-red-400 font-bold text-lg">Troubleshooting</h2>
                </div>
                <div className="p-6">
                    <p className="text-[#888] text-xs mb-5 leading-relaxed">
                        If the dashboard UI looks broken or tables aren't updating, try clearing the local browser cache. This does <strong>not</strong> delete any data from the server.
                    </p>
                    {/* TRIGGER CLEAR CACHE MODAL */}
                    <button 
                        onClick={() => setActiveModal('clear_cache')}
                        className="w-full bg-[#111] hover:bg-red-900/20 border border-red-900/30 text-red-400 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                    >
                        Clear Local Cache
                    </button>
                </div>
            </section>

        </div>
      </div>

      {/* --- CUSTOM MODAL OVERLAY --- */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with Blur */}
            <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
                onClick={() => !processingAction && setActiveModal(null)}
            ></div>
            
            {/* Modal Content */}
            <div className="relative bg-[#222] border border-[#333] w-full max-w-md rounded-2xl p-8 shadow-2xl transform transition-all scale-100">
                <div className="flex flex-col items-center text-center">
                    
                    {/* Icon */}
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${activeModal === 'logout' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}>
                        {activeModal === 'logout' ? (
                             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        ) : (
                             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        )}
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-2">
                        {activeModal === 'logout' ? 'Sign Out?' : 'Clear Cache?'}
                    </h3>
                    
                    <p className="text-[#888] text-sm mb-8 leading-relaxed">
                        {activeModal === 'logout' 
                            ? 'You are about to end your secure session. You will need to sign in again to access the admin panel.' 
                            : 'This will reset your local dashboard preferences and view settings. Your data on the server will not be affected.'
                        }
                    </p>

                    <div className="grid grid-cols-2 gap-4 w-full">
                        <button 
                            onClick={() => setActiveModal(null)}
                            disabled={processingAction}
                            className="bg-[#333] hover:bg-[#444] text-white py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={activeModal === 'logout' ? executeLogout : executeClearCache}
                            disabled={processingAction}
                            className={`py-3 rounded-xl font-bold text-sm text-white shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                                activeModal === 'logout' ? 'bg-red-600 hover:bg-red-500' : 'bg-orange-600 hover:bg-orange-500'
                            }`}
                        >
                            {processingAction && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                            {activeModal === 'logout' ? 'Sign Out' : 'Confirm Clear'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      <div className={`fixed bottom-6 right-6 z-50 transform transition-all duration-300 ${notification.show ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
         <div className={`flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border bg-[#1a1a1a] ${notification.type === 'success' ? 'border-green-900 text-green-400' : 'border-red-900 text-red-400'}`}>
            <div className={`w-2 h-2 rounded-full ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="font-bold text-sm">{notification.message}</span>
         </div>
      </div>

    </div>
  );
}