'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// --- TYPES ---
type NotificationType = 'success' | 'error';
type ModalType = 'logout' | 'clear_cache' | 'garbage_collect' | 'db_cleanup' | null;

// RGBA Parser Helper
const parseColor = (colorStr: string) => {
  if (!colorStr) return { hex: '#000000', opacity: 0.7 };
  if (colorStr.startsWith('rgba')) {
      const parts = colorStr.match(/[\d.]+/g);
      if (parts && parts.length === 4) {
          const r = parseInt(parts[0]);
          const g = parseInt(parts[1]);
          const b = parseInt(parts[2]);
          const a = parseFloat(parts[3]);
          const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
          return { hex, opacity: a };
      }
  }
  if (colorStr.startsWith('#')) {
      if (colorStr.length === 9) {
          const hex = colorStr.slice(0, 7);
          const alpha = parseInt(colorStr.slice(7, 9), 16) / 255;
          return { hex, opacity: alpha };
      }
      return { hex: colorStr.slice(0, 7), opacity: 1 };
  }
  return { hex: '#000000', opacity: 0.7 };
};

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [dragActive, setDragActive] = useState<'logo' | 'favicon' | 'heroBg' | null>(null);
  
  // Modal State
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [processingAction, setProcessingAction] = useState(false);

  // Notification State
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: NotificationType;
  }>({ show: false, message: '', type: 'success' });

  // ⚡ UPDATED: Form State (Added Blur, Border, and SEO fields)
  const [formData, setFormData] = useState({
    siteName: '',
    logoUrl: '',
    faviconUrl: '',
    primaryColor: '#2563eb',
    accentColor: '#ef4444',
    // HERO FIELDS
    heroBgUrl: '',
    heroTagline: '',
    heroTitle: '',
    heroSubtitle: '',
    heroOverlayColor: 'rgba(0, 0, 0, 0.7)',
    heroOverlayBlur: 2,
    heroBorderColor: 'rgba(255, 255, 255, 0.05)',
    heroBorderThickness: 1,
    // GLOBAL SEO
    metaTitle: '',
    metaDescription: '',
    metaKeywords: ''
  });

  // Extract parsed hex and opacity for the UI sliders
  const { hex: overlayHex, opacity: overlayOpacity } = parseColor(formData.heroOverlayColor);
  const { hex: borderHex, opacity: borderOpacity } = parseColor(formData.heroBorderColor);

  const handleOverlayChange = (newHex: string, newOpacity: number) => {
    const r = parseInt(newHex.slice(1, 3), 16);
    const g = parseInt(newHex.slice(3, 5), 16);
    const b = parseInt(newHex.slice(5, 7), 16);
    setFormData({ ...formData, heroOverlayColor: `rgba(${r}, ${g}, ${b}, ${newOpacity})` });
  };

  const handleBorderColorChange = (newHex: string, newOpacity: number) => {
    const r = parseInt(newHex.slice(1, 3), 16);
    const g = parseInt(newHex.slice(3, 5), 16);
    const b = parseInt(newHex.slice(5, 7), 16);
    setFormData({ ...formData, heroBorderColor: `rgba(${r}, ${g}, ${b}, ${newOpacity})` });
  };

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
             faviconUrl: data.faviconUrl || '',
             primaryColor: data.primaryColor || '#2563eb',
             accentColor: data.accentColor || '#ef4444',
             // LOAD HERO FIELDS
             heroBgUrl: data.heroBgUrl || '',
             heroTagline: data.heroTagline || '',
             heroTitle: data.heroTitle || '',
             heroSubtitle: data.heroSubtitle || '',
             heroOverlayColor: data.heroOverlayColor || 'rgba(0, 0, 0, 0.7)',
             // ⚡ LOAD NEW HERO STYLE & SEO FIELDS
             heroOverlayBlur: data.heroOverlayBlur ?? 2,
             heroBorderColor: data.heroBorderColor || 'rgba(255, 255, 255, 0.05)',
             heroBorderThickness: data.heroBorderThickness ?? 1,
             metaTitle: data.metaTitle || '',
             metaDescription: data.metaDescription || '',
             metaKeywords: data.metaKeywords || ''
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

  const executeLogout = async () => {
    setProcessingAction(true);
    try {
        await fetch('/api/admin/auth/logout', { method: 'POST' });
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/admin/login'; 
    } catch (e) {
        console.error("Logout failed", e);
        window.location.href = '/admin/login';
    }
  };

  const executeClearCache = () => {
    setProcessingAction(true);
    const authSession = sessionStorage.getItem('admin_authenticated');
    setTimeout(() => {
        localStorage.clear();
        sessionStorage.clear();
        if (authSession) {
            sessionStorage.setItem('admin_authenticated', authSession);
        }
        showToast("Local cache purged successfully.", "success");
        setActiveModal(null);
        setProcessingAction(false);
        window.location.reload();
    }, 800);
  };

  const executeGarbageCollection = async () => {
    setProcessingAction(true);
    try {
      const res = await fetch('/api/admin/system/garbage-collect', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast(`Cleanup complete: ${data.stats.orphansDeleted} orphans removed.`, "success");
      } else {
        showToast(data.error || "Garbage collection failed.", "error");
      }
    } catch (e) {
      showToast("Network error. Please try again.", "error");
    } finally {
      setProcessingAction(false);
      setActiveModal(null);
    }
  };

  const executeDbCleanup = async () => {
    setProcessingAction(true);
    try {
      const res = await fetch('/api/admin/system/cleanup', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast(`Database clean: ${data.deletedCount} zombie products removed.`, "success");
      } else {
        showToast(data.error || "Database cleanup failed.", "error");
      }
    } catch (e) {
      showToast("Network error. Please try again.", "error");
    } finally {
      setProcessingAction(false);
      setActiveModal(null);
    }
  };

  // --- FILE HANDLING ---
  
  const processFile = (file: File, field: 'logoUrl' | 'faviconUrl' | 'heroBgUrl') => {
    if (!file.type.startsWith('image/')) return showToast("File must be an image.", "error");
    const maxSize = field === 'heroBgUrl' ? 5 : 2;
    if (file.size > maxSize * 1024 * 1024) return showToast(`File too large (Max ${maxSize}MB).`, "error");

    const reader = new FileReader();
    reader.onload = (e) => {
        const result = e.target?.result as string;
        setFormData(prev => ({ ...prev, [field]: result }));
        showToast(`Image ready to save.`, "success");
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent, field: 'logoUrl' | 'faviconUrl' | 'heroBgUrl') => {
    e.preventDefault();
    setDragActive(null);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0], field);
  };

  if (loading) return <div className="text-[#666] animate-pulse">Loading System Preferences...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 relative">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-[#333] pb-6">
        <div>
           <h1 className="text-3xl font-black text-white tracking-tight">System Settings</h1>
           <p className="text-[#888] font-medium mt-2">Manage branding, theme, SEO, and admin session.</p>
        </div>
        <div className="flex items-center gap-3">
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
                className="px-6 py-3 bg-primary hover:opacity-90 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
        
        {/* LEFT COLUMN: BRANDING, HERO & SEO */}
        <div className="lg:col-span-2 space-y-8">
            
            {/* 1. IDENTITY & BRANDING */}
            <section className="bg-[#1a1a1a] border border-[#333] rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-[#333] bg-[#222]/50 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <h2 className="text-white font-bold text-lg">Identity & Branding</h2>
                </div>
                
                <div className="p-8 space-y-8">
                    <div>
                        <label className="block text-xs font-bold text-[#666] uppercase mb-2 tracking-wider">Platform Name</label>
                        <input 
                            type="text" 
                            value={formData.siteName}
                            onChange={(e) => setFormData({...formData, siteName: e.target.value})}
                            className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder-[#444]"
                            placeholder="e.g. PluginWorld Admin"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Logo Upload */}
                        <div>
                            <label className="block text-xs font-bold text-[#666] uppercase mb-2 tracking-wider">Logo Asset</label>
                            <div 
                                onDragOver={(e) => { e.preventDefault(); setDragActive('logo'); }}
                                onDragLeave={(e) => { e.preventDefault(); setDragActive(null); }}
                                onDrop={(e) => handleDrop(e, 'logoUrl')}
                                className={`relative w-full h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all ${
                                    dragActive === 'logo' ? 'border-primary bg-primary/10' : 'border-[#333] bg-[#111] hover:border-[#444]'
                                }`}
                            >
                                {formData.logoUrl ? (
                                    <div className="relative w-full h-full p-4 flex items-center justify-center group">
                                        <Image src={formData.logoUrl} alt="Logo" fill className="object-contain p-6" unoptimized />
                                        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                                            <button 
                                                onClick={() => setFormData({...formData, logoUrl: ''})}
                                                className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-xl transform hover:scale-105 transition-all"
                                            >
                                                Remove Logo
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center cursor-pointer p-4 w-full h-full justify-center group">
                                        <div className="w-10 h-10 rounded-full bg-[#222] flex items-center justify-center mb-3 group-hover:bg-[#333] transition-colors border border-[#333]">
                                            <svg className="w-5 h-5 text-[#666]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                        </div>
                                        <span className="text-[#888] font-medium text-xs group-hover:text-white transition-colors">Upload Logo</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0], 'logoUrl')} />
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Favicon Upload */}
                        <div>
                            <label className="block text-xs font-bold text-[#666] uppercase mb-2 tracking-wider">Browser Favicon</label>
                            <div 
                                onDragOver={(e) => { e.preventDefault(); setDragActive('favicon'); }}
                                onDragLeave={(e) => { e.preventDefault(); setDragActive(null); }}
                                onDrop={(e) => handleDrop(e, 'faviconUrl')}
                                className={`relative w-full h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all ${
                                    dragActive === 'favicon' ? 'border-primary bg-primary/10' : 'border-[#333] bg-[#111] hover:border-[#444]'
                                }`}
                            >
                                {formData.faviconUrl ? (
                                    <div className="relative w-full h-full p-4 flex items-center justify-center group">
                                        <div className="relative w-16 h-16">
                                            <Image src={formData.faviconUrl} alt="Favicon" fill className="object-contain" unoptimized />
                                        </div>
                                        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm rounded-lg">
                                            <button 
                                                onClick={() => setFormData({...formData, faviconUrl: ''})}
                                                className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-xl transform hover:scale-105 transition-all"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center cursor-pointer p-4 w-full h-full justify-center group">
                                        <div className="w-10 h-10 rounded-full bg-[#222] flex items-center justify-center mb-3 group-hover:bg-[#333] transition-colors border border-[#333]">
                                            <svg className="w-5 h-5 text-[#666]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </div>
                                        <span className="text-[#888] font-medium text-xs group-hover:text-white transition-colors">Upload Favicon</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0], 'faviconUrl')} />
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ⚡ 2. HERO BANNER CONFIGURATION */}
            <section className="bg-[#1a1a1a] border border-[#333] rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-[#333] bg-[#222]/50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                        <h2 className="text-white font-bold text-lg">Home Page Hero Banner</h2>
                    </div>
                </div>
                
                <div className="p-8 space-y-8">
                    
                    {/* Background Image Upload */}
                    <div>
                        <label className="block text-xs font-bold text-[#666] uppercase mb-2 tracking-wider">Background Image</label>
                        <div 
                            onDragOver={(e) => { e.preventDefault(); setDragActive('heroBg'); }}
                            onDragLeave={(e) => { e.preventDefault(); setDragActive(null); }}
                            onDrop={(e) => handleDrop(e, 'heroBgUrl')}
                            className={`relative w-full h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all overflow-hidden ${
                                dragActive === 'heroBg' ? 'border-primary bg-primary/10' : 'border-[#333] bg-[#111] hover:border-[#444]'
                            }`}
                        >
                            {formData.heroBgUrl ? (
                                <div className="relative w-full h-full p-4 flex items-center justify-center group">
                                    <Image src={formData.heroBgUrl} alt="Hero Background" fill className="object-cover" unoptimized />
                                    {/* Show a preview of the tint and border! */}
                                    <div className="absolute inset-0 transition-colors" style={{ backgroundColor: formData.heroOverlayColor, backdropFilter: `blur(${formData.heroOverlayBlur}px)` }}></div>
                                    <div className="absolute inset-0 border" style={{ borderColor: formData.heroBorderColor, borderWidth: `${formData.heroBorderThickness}px` }}></div>
                                    
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                                        <button 
                                            onClick={() => setFormData({...formData, heroBgUrl: ''})}
                                            className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-xl transform hover:scale-105 transition-all"
                                        >
                                            Remove Background
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center cursor-pointer p-4 w-full h-full justify-center group">
                                    <div className="w-10 h-10 rounded-full bg-[#222] flex items-center justify-center mb-3 group-hover:bg-[#333] transition-colors border border-[#333]">
                                        <svg className="w-5 h-5 text-[#666]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    </div>
                                    <span className="text-[#888] font-medium text-xs group-hover:text-white transition-colors">Upload Background Image</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0], 'heroBgUrl')} />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* ⚡ NEW: Overlay & Blur Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-[#111] rounded-xl border border-[#333]">
                        {/* Tint Color */}
                        <div>
                            <label className="block text-xs font-bold text-white uppercase mb-4 tracking-wider">Tint Color & Opacity</label>
                            <div className="flex items-center gap-4">
                                <div className="relative w-10 h-10 rounded-lg shadow-inner ring-1 ring-white/10 overflow-hidden shrink-0">
                                    <input type="color" value={overlayHex} onChange={(e) => handleOverlayChange(e.target.value, overlayOpacity)} className="absolute -inset-2 w-14 h-14 cursor-pointer" />
                                </div>
                                <input type="range" min="0" max="1" step="0.05" value={overlayOpacity} onChange={(e) => handleOverlayChange(overlayHex, parseFloat(e.target.value))} className="flex-1 accent-primary h-1 bg-[#333] rounded-lg appearance-none cursor-pointer" />
                                <span className="text-xs text-white font-mono w-10 text-right">{Math.round(overlayOpacity * 100)}%</span>
                            </div>
                        </div>

                        {/* Blur Slider */}
                        <div>
                            <label className="block text-xs font-bold text-white uppercase mb-4 tracking-wider">Backdrop Blur Strength</label>
                            <div className="flex items-center gap-4 h-10">
                                <input type="range" min="0" max="20" step="1" value={formData.heroOverlayBlur} onChange={(e) => setFormData({...formData, heroOverlayBlur: parseInt(e.target.value)})} className="flex-1 accent-primary h-1 bg-[#333] rounded-lg appearance-none cursor-pointer" />
                                <span className="text-xs text-white font-mono w-10 text-right">{formData.heroOverlayBlur}px</span>
                            </div>
                        </div>
                    </div>

                    {/* ⚡ NEW: Border Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-[#111] rounded-xl border border-[#333]">
                        {/* Border Color */}
                        <div>
                            <label className="block text-xs font-bold text-white uppercase mb-4 tracking-wider">Border Color & Opacity</label>
                            <div className="flex items-center gap-4">
                                <div className="relative w-10 h-10 rounded-lg shadow-inner ring-1 ring-white/10 overflow-hidden shrink-0">
                                    <input type="color" value={borderHex} onChange={(e) => handleBorderColorChange(e.target.value, borderOpacity)} className="absolute -inset-2 w-14 h-14 cursor-pointer" />
                                </div>
                                <input type="range" min="0" max="1" step="0.05" value={borderOpacity} onChange={(e) => handleBorderColorChange(borderHex, parseFloat(e.target.value))} className="flex-1 accent-primary h-1 bg-[#333] rounded-lg appearance-none cursor-pointer" />
                                <span className="text-xs text-white font-mono w-10 text-right">{Math.round(borderOpacity * 100)}%</span>
                            </div>
                        </div>

                        {/* Border Thickness */}
                        <div>
                            <label className="block text-xs font-bold text-white uppercase mb-4 tracking-wider">Border Thickness</label>
                            <div className="flex items-center gap-4 h-10">
                                <input type="range" min="0" max="10" step="1" value={formData.heroBorderThickness} onChange={(e) => setFormData({...formData, heroBorderThickness: parseInt(e.target.value)})} className="flex-1 accent-primary h-1 bg-[#333] rounded-lg appearance-none cursor-pointer" />
                                <span className="text-xs text-white font-mono w-10 text-right">{formData.heroBorderThickness}px</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {/* Tagline */}
                         <div>
                             <label className="block text-xs font-bold text-[#666] uppercase mb-2 tracking-wider">Top Tagline</label>
                             <input 
                                 type="text" 
                                 value={formData.heroTagline}
                                 onChange={(e) => setFormData({...formData, heroTagline: e.target.value})}
                                 className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder-[#444]"
                                 placeholder="e.g. Live Price Tracking"
                             />
                         </div>

                         {/* Title */}
                         <div>
                             <label className="block text-xs font-bold text-[#666] uppercase mb-2 tracking-wider">Main Title (HTML Allowed)</label>
                             <input 
                                 type="text" 
                                 value={formData.heroTitle}
                                 onChange={(e) => setFormData({...formData, heroTitle: e.target.value})}
                                 className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder-[#444]"
                                 placeholder="e.g. Compare <span class='text-primary'>Deals</span>"
                             />
                         </div>
                    </div>

                    {/* Subtitle */}
                    <div>
                        <label className="block text-xs font-bold text-[#666] uppercase mb-2 tracking-wider">Bottom Subtitle</label>
                        <textarea 
                            value={formData.heroSubtitle}
                            onChange={(e) => setFormData({...formData, heroSubtitle: e.target.value})}
                            className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder-[#444] resize-none h-24"
                            placeholder="e.g. Real-time price monitoring from the best audio software sellers..."
                        />
                    </div>

                </div>
            </section>

            {/* ⚡ 3. GLOBAL SEO CONFIGURATION */}
            <section className="bg-[#1a1a1a] border border-[#333] rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-[#333] bg-[#222]/50 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <h2 className="text-white font-bold text-lg">Global SEO & Metadata</h2>
                </div>
                <div className="p-8 space-y-6">
                    <p className="text-sm text-[#888] leading-relaxed">
                        These tags are injected into the head of your Home Page to improve Google Search rankings and control how your site appears when shared on social media.
                    </p>
                    
                    <div>
                        <label className="block text-xs font-bold text-[#666] uppercase mb-2 tracking-wider">Meta Title (Max 60 chars)</label>
                        <input 
                            type="text" 
                            value={formData.metaTitle} 
                            onChange={(e) => setFormData({...formData, metaTitle: e.target.value})} 
                            placeholder="e.g. PluginWorld | VST & Audio Software Deals" 
                            className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-all placeholder-[#444]" 
                        />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-[#666] uppercase mb-2 tracking-wider">Meta Description (Max 160 chars)</label>
                        <textarea 
                            value={formData.metaDescription} 
                            onChange={(e) => setFormData({...formData, metaDescription: e.target.value})} 
                            placeholder="e.g. Find the best deals and lowest prices on VSTs, synths, and audio software..." 
                            className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-all placeholder-[#444] h-20 resize-none" 
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-[#666] uppercase mb-2 tracking-wider">Keywords (Comma separated)</label>
                        <input 
                            type="text" 
                            value={formData.metaKeywords} 
                            onChange={(e) => setFormData({...formData, metaKeywords: e.target.value})} 
                            placeholder="e.g. audio plugins, vst deals, music production software, synths" 
                            className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-all placeholder-[#444]" 
                        />
                    </div>
                </div>
            </section>
        </div>

        {/* RIGHT COLUMN: THEME & DANGER */}
        <div className="space-y-8">

            {/* THEME COLORS */}
            <section className="bg-[#1a1a1a] border border-[#333] rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-[#333] bg-[#222]/50 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
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

            {/* DANGER ZONE */}
            <section className="bg-red-900/5 border border-red-900/20 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-red-900/20 bg-red-900/10 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <h2 className="text-red-400 font-bold text-lg">Troubleshooting</h2>
                </div>
                <div className="p-6">
                    <p className="text-[#888] text-xs mb-5 leading-relaxed">
                        If the dashboard UI looks broken or tables aren't updating, try clearing the local browser cache. This does <strong>not</strong> delete any data.
                    </p>
                    <button 
                        onClick={() => setActiveModal('clear_cache')}
                        className="w-full bg-[#111] hover:bg-red-900/20 border border-red-900/30 text-red-400 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                    >
                        Clear Local Cache
                    </button>

                    <p className="text-[#888] text-xs mt-6 mb-3 leading-relaxed border-t border-red-900/20 pt-4">
                        Reclaim Google Cloud Storage space by deleting orphaned images that do not have a matching database product.
                    </p>
                    <button 
                        onClick={() => setActiveModal('garbage_collect')}
                        className="w-full bg-[#111] hover:bg-orange-900/20 border border-orange-900/30 text-orange-400 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                    >
                        Run Storage Cleanup
                    </button>

                    <p className="text-[#888] text-xs mt-6 mb-3 leading-relaxed border-t border-red-900/20 pt-4">
                        Clean database by removing "Zombie Products" (products with 0 active store listings) caused by aborted syncs.
                    </p>
                    <button 
                        onClick={() => setActiveModal('db_cleanup')}
                        className="w-full bg-[#111] hover:bg-purple-900/20 border border-purple-900/30 text-purple-400 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                    >
                        Purge Zombie Products
                    </button>
                </div>
            </section>

        </div>
      </div>

      {/* --- CUSTOM MODAL OVERLAY --- */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
                onClick={() => !processingAction && setActiveModal(null)}
            ></div>
            
            <div className="relative bg-[#222] border border-[#333] w-full max-w-md rounded-2xl p-8 shadow-2xl transform transition-all scale-100">
                <div className="flex flex-col items-center text-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${
                        activeModal === 'logout' ? 'bg-red-500/10 text-red-500' : 
                        activeModal === 'garbage_collect' ? 'bg-orange-500/10 text-orange-500' : 
                        activeModal === 'db_cleanup' ? 'bg-purple-500/10 text-purple-500' :
                        'bg-yellow-500/10 text-yellow-500'
                    }`}>
                        {activeModal === 'logout' ? (
                             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        ) : activeModal === 'garbage_collect' ? (
                             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        ) : activeModal === 'db_cleanup' ? (
                             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7h16M4 7a2 2 0 012-2h12a2 2 0 012 2M4 7v12a2 2 0 002 2h12a2 2 0 002-2V7m-8 4v8m-4-8v8" /></svg>
                        ) : (
                             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        )}
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-2">
                        {activeModal === 'logout' ? 'Sign Out?' : 
                         activeModal === 'garbage_collect' ? 'Run Storage Cleanup?' :
                         activeModal === 'db_cleanup' ? 'Purge Zombie Products?' :
                         'Clear Cache?'}
                    </h3>
                    
                    <p className="text-[#888] text-sm mb-8 leading-relaxed">
                        {activeModal === 'logout' 
                           ? 'You are about to end your secure session. You will need to sign in again to access the admin panel.' 
                           : activeModal === 'garbage_collect'
                           ? 'This will scan Google Cloud Storage and permanently delete any images that do not have a matching product in your database. This action cannot be undone.'
                           : activeModal === 'db_cleanup'
                           ? 'This will scan your database for orphaned products that currently have zero active store listings, and permanently delete them and their cloud images.'
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
                            onClick={
                                activeModal === 'logout' ? executeLogout : 
                                activeModal === 'garbage_collect' ? executeGarbageCollection :
                                activeModal === 'db_cleanup' ? executeDbCleanup :
                                executeClearCache
                            }
                            disabled={processingAction}
                            className={`py-3 rounded-xl font-bold text-sm text-white shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                                activeModal === 'logout' ? 'bg-red-600 hover:bg-red-500' : 
                                activeModal === 'garbage_collect' ? 'bg-orange-600 hover:bg-orange-500' :
                                activeModal === 'db_cleanup' ? 'bg-purple-600 hover:bg-purple-500' :
                                'bg-yellow-600 hover:bg-yellow-500'
                            }`}
                        >
                            {processingAction && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                            {activeModal === 'logout' ? 'Sign Out' : 
                             activeModal === 'garbage_collect' ? 'Purge Storage' : 
                             activeModal === 'db_cleanup' ? 'Purge Database' : 
                             'Confirm Clear'}
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