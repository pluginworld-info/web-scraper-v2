'use client';

import { useState, useEffect } from 'react';
import FeedSyncButton from '@/components/admin/FeedSyncButton'; // Import the Smart Button

// Types matching your Schema
type FeedStatus = 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR';

interface Feed {
  id: string;
  name: string;
  url: string;
  type: 'JSON' | 'CSV' | 'XML';
  status: FeedStatus;
  lastSyncedAt: string | null;
}

interface Retailer {
  id: string;
  name: string;
  role: 'MASTER' | 'SPOKE';
  feeds: Feed[];
}

export default function AdminFeedsPage() {
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [newSiteName, setNewSiteName] = useState('');
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedType, setNewFeedType] = useState('JSON');
  const [isMaster, setIsMaster] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 1. Fetch Data
  const fetchFeeds = async () => {
    try {
      const res = await fetch('/api/admin/feeds');
      const data = await res.json();
      setRetailers(data);
    } catch (error) {
      console.error("Failed to load feeds");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeeds();
    // Keep global polling for new feeds, but Sync status is now handled by the button component
    const interval = setInterval(fetchFeeds, 10000);
    return () => clearInterval(interval);
  }, []);

  // 2. Handle Add Site
  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch('/api/admin/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSiteName,
          url: newFeedUrl,
          type: newFeedType,
          role: isMaster ? 'MASTER' : 'SPOKE'
        }),
      });
      await fetchFeeds(); // Refresh list
      setIsModalOpen(false);
      // Reset form
      setNewSiteName('');
      setNewFeedUrl('');
      setIsMaster(false);
    } catch (error) {
      alert("Failed to add site");
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Handle Delete Feed
  const handleDelete = async (feedId: string) => {
    if (!confirm("Are you sure? This will stop monitoring this feed.")) return;
    await fetch(`/api/admin/feeds?id=${feedId}`, { method: 'DELETE' });
    fetchFeeds();
  };

  // Removed handleSync (Logic moved to FeedSyncButton component)

  if (loading) return <div className="p-10 text-center text-[#aaaaaa]">Loading Dashboard...</div>;

  const masterRetailers = retailers.filter(r => r.role === 'MASTER');
  const competitorRetailers = retailers.filter(r => r.role === 'SPOKE');

  return (
    <main className="min-h-screen bg-[#111] p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter">Feed Monitor</h1>
            <p className="text-[#666] font-medium">Manage external data sources and sync status.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold uppercase text-sm tracking-widest shadow-lg shadow-blue-900/20 transition-all"
          >
            + Add Site
          </button>
        </div>

        {/* SECTION 1: MASTER FEEDS */}
        <div className="mb-12">
           <h2 className="text-[#aaaaaa] font-black uppercase tracking-widest text-sm mb-4">Master Data Sources</h2>
           <div className="space-y-4">
              {masterRetailers.length === 0 && <div className="text-[#444] italic">No master feed configured.</div>}
              {masterRetailers.map(retailer => (
                 retailer.feeds.map(feed => (
                   <FeedCard key={feed.id} retailer={retailer} feed={feed} onDelete={handleDelete} />
                 ))
              ))}
           </div>
        </div>

        {/* SECTION 2: COMPETITOR FEEDS */}
        <div>
           <h2 className="text-[#aaaaaa] font-black uppercase tracking-widest text-sm mb-4">Competitor Sub-Sites</h2>
           <div className="space-y-4">
              {competitorRetailers.length === 0 && <div className="text-[#444] italic">No competitor sites added.</div>}
              {competitorRetailers.map(retailer => (
                 retailer.feeds.map(feed => (
                   <FeedCard key={feed.id} retailer={retailer} feed={feed} onDelete={handleDelete} />
                 ))
              ))}
           </div>
        </div>

      </div>

      {/* ADD SITE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#222] border border-[#333] rounded-2xl w-full max-w-md p-8 shadow-2xl">
            <h2 className="text-2xl font-black text-white mb-6">Add New Source</h2>
            <form onSubmit={handleAddSite} className="space-y-4">
              
              <div>
                <label className="block text-[#666] text-xs font-bold uppercase mb-2">Site Name</label>
                <input 
                  className="w-full bg-[#111] border border-[#333] rounded-lg p-3 text-white focus:outline-none focus:border-blue-600"
                  placeholder="e.g. Plugin Boutique"
                  value={newSiteName}
                  onChange={e => setNewSiteName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-[#666] text-xs font-bold uppercase mb-2">Feed URL (JSON/CSV)</label>
                <input 
                  className="w-full bg-[#111] border border-[#333] rounded-lg p-3 text-white focus:outline-none focus:border-blue-600"
                  placeholder="https://..."
                  value={newFeedUrl}
                  onChange={e => setNewFeedUrl(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-[#666] text-xs font-bold uppercase mb-2">Format</label>
                   <select 
                     className="w-full bg-[#111] border border-[#333] rounded-lg p-3 text-white focus:outline-none"
                     value={newFeedType}
                     onChange={e => setNewFeedType(e.target.value)}
                   >
                     <option value="JSON">JSON</option>
                     <option value="CSV">CSV</option>
                     <option value="XML">XML</option>
                   </select>
                </div>
                <div className="flex items-center pt-6">
                   <input 
                     type="checkbox" 
                     id="isMaster" 
                     checked={isMaster}
                     onChange={e => setIsMaster(e.target.checked)}
                     className="w-5 h-5 rounded bg-[#111] border border-[#333] accent-blue-600"
                   />
                   <label htmlFor="isMaster" className="ml-2 text-white font-bold text-sm">Is Master Feed?</label>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-[#333] hover:bg-[#444] text-white py-3 rounded-xl font-bold uppercase text-xs">Cancel</button>
                <button disabled={submitting} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold uppercase text-xs disabled:opacity-50">
                  {submitting ? 'Saving...' : 'Add Feed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}

// Sub-Component for Clean Code
function FeedCard({ retailer, feed, onDelete }: { retailer: Retailer, feed: Feed, onDelete: (id: string) => void }) {
  return (
    <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-5 flex items-center justify-between hover:border-[#444] transition-colors group">
       <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#222] rounded-lg flex items-center justify-center font-bold text-white border border-[#333]">
             {retailer.name.charAt(0)}
          </div>
          <div>
             <h3 className="text-white font-bold text-lg leading-tight">{retailer.name}</h3>
             <a href={feed.url} target="_blank" className="text-blue-500 text-xs hover:underline truncate max-w-[200px] block">{feed.url}</a>
          </div>
       </div>

       <div className="flex items-center gap-4">
          {/* REPLACED: Status + Sync Button */}
          <FeedSyncButton feed={feed} />
          
          {/* Delete Button */}
          <button 
            onClick={() => onDelete(feed.id)}
            className="p-2 text-[#666] hover:text-red-500 hover:bg-[#333] rounded-lg transition-colors opacity-100 md:opacity-0 group-hover:opacity-100"
            title="Delete Feed"
          >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
       </div>
    </div>
  );
}  