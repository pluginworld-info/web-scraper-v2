'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';

import 'react-quill-new/dist/quill.snow.css';
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

export default function EmailTemplatePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState({
    subject: '',
    bodyHtml: '',
    headerImageUrl: '',
    footerImageUrl: ''
  });

  // 1. LOAD DATA
  useEffect(() => {
    fetch('/api/admin/email-template')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setTemplate(data);
        setLoading(false);
      });
  }, []);

  // 2. SAVE DATA
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/email-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      });
      if (res.ok) alert("Template saved successfully!");
    } catch (err) {
      alert("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-white animate-pulse">Loading Editor...</div>;

  return (
    <main className="min-h-screen bg-[#111] text-white p-4 md:p-12">
      <div className="max-w-[1600px] mx-auto">
        
        <div className="flex justify-between items-end mb-10 border-b border-white/5 pb-8">
          <div>
            <h1 className="text-4xl font-black tracking-tighter">Email <span className="text-primary">Template</span></h1>
            <p className="text-[#666] mt-2 font-medium">Design the automated price alert mailer.</p>
          </div>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-white px-10 py-4 rounded-full font-black uppercase text-xs tracking-widest hover:opacity-90 transition-all shadow-xl shadow-primary/20 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Template'}
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          
          {/* --- LEFT COLUMN: THE EDITOR --- */}
          <div className="space-y-8">
            
            {/* SUBJECT LINE */}
            <div className="bg-[#1a1a1a] p-6 rounded-3xl border border-white/5">
              <label className="block text-[10px] font-black uppercase tracking-widest text-[#555] mb-3">Email Subject</label>
              <input 
                type="text"
                value={template.subject}
                onChange={(e) => setTemplate({...template, subject: e.target.value})}
                className="w-full bg-[#111] border border-white/5 rounded-xl p-4 text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                placeholder="Use {{product_name}} for dynamic title"
              />
            </div>

            {/* HEADER IMAGE */}
            <div className="bg-[#1a1a1a] p-6 rounded-3xl border border-white/5">
              <label className="block text-[10px] font-black uppercase tracking-widest text-[#555] mb-3">Header Banner (URL)</label>
              <div className="flex gap-4">
                <input 
                  type="text"
                  value={template.headerImageUrl || ''}
                  onChange={(e) => setTemplate({...template, headerImageUrl: e.target.value})}
                  className="flex-grow bg-[#111] border border-white/5 rounded-xl p-4 text-white focus:ring-2 focus:ring-primary outline-none transition-all text-sm"
                  placeholder="Paste image URL here..."
                />
                {template.headerImageUrl && (
                  <button onClick={() => setTemplate({...template, headerImageUrl: ''})} className="text-red-500 text-xs font-bold uppercase underline">Remove</button>
                )}
              </div>
            </div>

            {/* RICH TEXT BODY */}
            <div className="bg-[#1a1a1a] p-6 rounded-3xl border border-white/5">
              <label className="block text-[10px] font-black uppercase tracking-widest text-[#555] mb-3">Email Body Content</label>
              <div className="bg-white rounded-xl overflow-hidden text-black">
                <ReactQuill 
                  theme="snow" 
                  value={template.bodyHtml} 
                  onChange={(content) => setTemplate({...template, bodyHtml: content})}
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      ['link', 'clean']
                    ],
                  }}
                />
              </div>
              <div className="mt-4 flex gap-2 flex-wrap">
                {['product_name', 'current_price', 'target_price', 'url'].map(tag => (
                  <span key={tag} className="bg-primary/10 text-primary text-[9px] font-black px-2 py-1 rounded-md border border-primary/20">
                    {'{{'}{tag}{'}}'}
                  </span>
                ))}
              </div>
            </div>

            {/* FOOTER IMAGE */}
            <div className="bg-[#1a1a1a] p-6 rounded-3xl border border-white/5">
              <label className="block text-[10px] font-black uppercase tracking-widest text-[#555] mb-3">Footer Image / Signature (URL)</label>
              <div className="flex gap-4">
                <input 
                  type="text"
                  value={template.footerImageUrl || ''}
                  onChange={(e) => setTemplate({...template, footerImageUrl: e.target.value})}
                  className="flex-grow bg-[#111] border border-white/5 rounded-xl p-4 text-white focus:ring-2 focus:ring-primary outline-none transition-all text-sm"
                  placeholder="Paste image URL here..."
                />
                {template.footerImageUrl && (
                  <button onClick={() => setTemplate({...template, footerImageUrl: ''})} className="text-red-500 text-xs font-bold uppercase underline">Remove</button>
                )}
              </div>
            </div>
          </div>

          {/* --- RIGHT COLUMN: LIVE PREVIEW --- */}
          <div className="sticky top-12 h-fit">
             <label className="block text-[10px] font-black uppercase tracking-widest text-[#555] mb-4">Inbox Preview (Simulated)</label>
             <div className="bg-white rounded-[40px] p-2 shadow-2xl border-[8px] border-[#222] overflow-hidden w-full max-w-[400px] mx-auto min-h-[700px] flex flex-col">
                <div className="bg-gray-100 p-4 text-black text-center border-b border-gray-200">
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Subject Line</p>
                   <p className="text-sm font-bold truncate">
                      {template.subject.replace('{{product_name}}', 'Serum Synthesizer').replace('{{current_price}}', '$99.00')}
                   </p>
                </div>
                
                <div className="bg-white flex-grow p-6 text-black flex flex-col overflow-y-auto custom-scrollbar-light">
                   {/* Preview Header */}
                   {template.headerImageUrl && (
                     <div className="relative w-full h-24 mb-6">
                        <img src={template.headerImageUrl} alt="Header" className="w-full h-full object-contain" />
                     </div>
                   )}

                   {/* Preview Body */}
                   <div 
                    className="prose prose-sm max-w-none text-black mb-8 email-body-preview"
                    dangerouslySetInnerHTML={{ __html: template.bodyHtml
                      .replace(/{{product_name}}/g, '<strong>Serum Synthesizer</strong>')
                      .replace(/{{current_price}}/g, '<span style="color:red; font-weight:bold">$99.00</span>')
                      .replace(/{{target_price}}/g, '<strong>$100.00</strong>')
                    }} 
                   />

                   {/* Call to Action Button (Static Preview) */}
                   <div className="bg-primary text-white text-center py-3 rounded-lg font-black text-sm uppercase mb-10">
                      View Deal Now
                   </div>

                   {/* Preview Footer */}
                   {template.footerImageUrl && (
                     <div className="mt-auto border-t border-gray-100 pt-6">
                        <img src={template.footerImageUrl} alt="Footer" className="w-full h-auto object-contain max-h-20" />
                     </div>
                   )}
                </div>
             </div>
          </div>

        </div>
      </div>
    </main>
  );
}