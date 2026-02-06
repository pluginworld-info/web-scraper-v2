'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useDropzone } from 'react-dropzone'; 
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

// --- SUB-COMPONENT: CUSTOM TOAST NOTIFICATION ---
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000); // Auto dismiss after 3s
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl border shadow-2xl backdrop-blur-md ${
        type === 'success' 
          ? 'bg-[#1a1a1a]/90 border-green-500/30 shadow-green-500/10' 
          : 'bg-[#1a1a1a]/90 border-red-500/30 shadow-red-500/10'
      }`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          type === 'success' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
        }`}>
          {type === 'success' ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
          )}
        </div>
        <div>
          <h4 className={`text-sm font-black uppercase tracking-wider ${type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
            {type === 'success' ? 'Success' : 'Error'}
          </h4>
          <p className="text-white text-xs font-medium mt-0.5">{message}</p>
        </div>
        <button onClick={onClose} className="ml-4 text-gray-500 hover:text-white transition-colors">
           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: IMAGE DROPZONE ---
const ImageDropzone = ({ label, image, onImageChange }: { label: string, image: string | null, onImageChange: (val: string) => void }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) onImageChange(e.target.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [onImageChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 'image/*': [] },
    multiple: false 
  });

  return (
    <div className="bg-[#1a1a1a] p-6 rounded-[32px] border border-white/5 transition-all hover:border-primary/30">
      <label className="block text-[10px] font-black uppercase tracking-widest text-[#555] mb-4">{label}</label>
      
      {image ? (
        <div className="relative w-full h-48 bg-[#111] rounded-2xl overflow-hidden group border border-white/10">
          <img src={image} alt="Preview" className="w-full h-full object-contain p-4" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
             <button 
               onClick={(e) => { e.stopPropagation(); onImageChange(''); }}
               className="bg-red-500 text-white px-6 py-2 rounded-full font-bold uppercase text-xs tracking-widest hover:bg-red-600 transform hover:scale-105 transition-all shadow-lg shadow-red-500/20"
             >
               Remove Image
             </button>
          </div>
        </div>
      ) : (
        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed rounded-2xl h-32 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
            isDragActive ? 'border-primary bg-primary/10' : 'border-[#333] hover:border-[#555] bg-[#111]'
          }`}
        >
          <input {...getInputProps()} />
          <div className="text-3xl mb-2 text-[#444] group-hover:text-[#666] transition-colors">
            {isDragActive ? '📂' : '☁️'}
          </div>
          <p className="text-xs font-bold text-[#666] uppercase tracking-wide group-hover:text-[#888] transition-colors">
            {isDragActive ? 'Drop file now' : 'Drag & Drop or Click to Upload'}
          </p>
        </div>
      )}
    </div>
  );
};

export default function EmailTemplatePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [template, setTemplate] = useState({
    subject: '',
    bodyHtml: '',
    headerImageUrl: '',
    footerImageUrl: ''
  });

  useEffect(() => {
    fetch('/api/admin/email-template')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setTemplate(data);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/email-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      });
      if (res.ok) {
        // ✅ REPLACED ALERT WITH TOAST
        setToast({ message: "Template updated successfully.", type: 'success' });
      } else {
        throw new Error();
      }
    } catch (err) {
      setToast({ message: "Failed to save configuration.", type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#444] font-black uppercase tracking-widest animate-pulse">Loading Template Engine...</div>;

  return (
    <div className="max-w-[1600px] mx-auto pb-20">
      
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 border-b border-white/5 pb-8 gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white">Email <span className="text-primary">Template</span></h1>
          <p className="text-[#666] mt-2 font-medium text-lg">Design the automated price alert mailer.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-white px-10 py-4 rounded-full font-black uppercase text-xs tracking-[0.2em] hover:opacity-90 transition-all shadow-xl shadow-primary/20 disabled:opacity-50 hover:scale-105 active:scale-95"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-12 items-start">
        
        {/* --- LEFT COLUMN: EDITOR --- */}
        <div className="space-y-8">
          
          {/* SUBJECT */}
          <div className="bg-[#1a1a1a] p-8 rounded-[32px] border border-white/5 shadow-2xl">
            <label className="block text-[10px] font-black uppercase tracking-widest text-[#555] mb-4">Email Subject</label>
            <input 
              type="text"
              value={template.subject}
              onChange={(e) => setTemplate({...template, subject: e.target.value})}
              className="w-full bg-[#111] border border-[#333] rounded-xl p-5 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-medium"
              placeholder="e.g. Price Alert: {{product_name}}"
            />
          </div>

          {/* HEADER IMAGE */}
          <ImageDropzone 
            label="Header Banner" 
            image={template.headerImageUrl} 
            onImageChange={(val) => setTemplate(prev => ({ ...prev, headerImageUrl: val }))} 
          />

          {/* EDITOR */}
          <div className="bg-[#1a1a1a] p-8 rounded-[32px] border border-white/5 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
               <label className="text-[10px] font-black uppercase tracking-widest text-[#555]">Message Body</label>
               <div className="flex gap-2">
                 {['product_name', 'current_price', 'target_price', 'url'].map(tag => (
                   <button 
                     key={tag}
                     onClick={() => setTemplate(prev => ({ ...prev, bodyHtml: prev.bodyHtml + ` {{${tag}}} ` }))}
                     className="bg-[#222] hover:bg-primary hover:text-white text-[#666] text-[9px] font-bold px-2 py-1 rounded border border-[#333] transition-colors uppercase tracking-wider"
                   >
                     + {tag}
                   </button>
                 ))}
               </div>
            </div>
            
            <div className="bg-white rounded-2xl overflow-hidden text-black editor-wrapper">
              <ReactQuill 
                theme="snow" 
                value={template.bodyHtml} 
                onChange={(content) => setTemplate({...template, bodyHtml: content})}
                modules={{
                  toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'align': [] }],
                    ['link', 'clean']
                  ],
                }}
              />
            </div>
          </div>

          {/* FOOTER IMAGE */}
          <ImageDropzone 
            label="Footer Signature" 
            image={template.footerImageUrl} 
            onImageChange={(val) => setTemplate(prev => ({ ...prev, footerImageUrl: val }))} 
          />
        </div>

        {/* --- RIGHT COLUMN: PREVIEW --- */}
        <div className="sticky top-8">
           <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[#555]">Live Mobile Preview</label>
           </div>
           
           <div className="bg-white rounded-[40px] p-2 shadow-[0_0_50px_rgba(0,0,0,0.5)] border-[8px] border-[#222] overflow-hidden w-full max-w-[420px] mx-auto min-h-[800px] flex flex-col relative">
              <div className="absolute top-0 left-0 right-0 h-6 bg-black z-10 flex justify-between px-6 items-center">
                 <span className="text-[9px] text-white font-bold">9:41</span>
                 <div className="flex gap-1">
                    <div className="w-3 h-3 bg-white rounded-full opacity-20"></div>
                    <div className="w-3 h-3 bg-white rounded-full opacity-20"></div>
                 </div>
              </div>

              <div className="bg-gray-50 pt-10 pb-4 px-5 border-b border-gray-100">
                 <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1">
                    {template.subject.replace('{{product_name}}', 'Serum Synth') || 'No Subject'}
                 </h3>
                 <div className="flex items-center gap-3 mt-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">P</div>
                    <div className="flex flex-col">
                       <span className="text-xs font-bold text-gray-900">Plugin Deals Alerts</span>
                       <span className="text-[10px] text-gray-500">to me</span>
                    </div>
                 </div>
              </div>
              
              <div className="flex-grow overflow-y-auto custom-scrollbar-light bg-white">
                 {template.headerImageUrl && (
                   <img src={template.headerImageUrl} alt="Header" className="w-full h-auto object-cover" />
                 )}

                 <div className="p-6">
                   <div 
                    className="prose prose-sm max-w-none text-gray-800 email-preview-content"
                    dangerouslySetInnerHTML={{ __html: (template.bodyHtml || '')
                      .replace(/{{product_name}}/g, '<strong>Serum Synth</strong>')
                      .replace(/{{current_price}}/g, '<span style="color:#ef4444; font-weight:bold">$99.00</span>')
                      .replace(/{{target_price}}/g, '<strong>$149.00</strong>')
                      .replace(/{{url}}/g, '#')
                    }} 
                   />

                   <div className="mt-8 text-center">
                      <span className="inline-block bg-primary text-white px-8 py-3 rounded-full font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/30">
                        View Deal Now
                      </span>
                   </div>
                 </div>

                 {template.footerImageUrl && (
                   <div className="mt-8 border-t border-gray-100 pt-6 px-6 pb-6">
                      <img src={template.footerImageUrl} alt="Footer" className="w-full h-auto object-contain max-h-16 mx-auto opacity-80" />
                   </div>
                 )}
                 
                 <div className="pb-10 text-center text-[10px] text-gray-400 px-6 mt-4">
                    © 2024 Plugin Deals Tracker. <br/>You are receiving this because you subscribed to price alerts.
                 </div>
              </div>
           </div>
        </div>

      </div>

      {/* ✅ RENDER TOAST IF ACTIVE */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <style jsx global>{`
        .ql-container.ql-snow {
          min-height: 350px !important;
          background-color: #fff;
          font-size: 16px;
          border-bottom-left-radius: 16px;
          border-bottom-right-radius: 16px;
        }
        .ql-toolbar.ql-snow {
          background-color: #f3f3f3;
          border-top-left-radius: 16px;
          border-top-right-radius: 16px;
          border-color: #e5e7eb;
        }
        .email-preview-content p { margin-bottom: 1em; line-height: 1.6; }
        .email-preview-content h1 { font-size: 1.5em; font-weight: 800; margin-bottom: 0.5em; }
        .email-preview-content ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 1em; }
      `}</style>
    </div>
  );
}