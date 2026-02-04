'use client';

import { useState, useEffect, useCallback } from 'react';
import FeedSyncButton from '@/components/admin/FeedSyncButton'; 

// Types matching your Schema
type FeedStatus = 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR';

interface Feed {
  id: string;
  name: string;
  url: string;
  type: 'JSON' | 'CSV' | 'XML';
  status: FeedStatus;
  lastSyncedAt: string | null;
  errorMessage: string | null;
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
  
  // ✅ REAL SCHEDULER STATE
  const [nextRunTime, setNextRunTime] = useState<Date | null>(null);
  const [timeDisplay, setTimeDisplay] = useState("Calculating...");
  const [schedulerState, setSchedulerState] = useState<string>("UNKNOWN");

  // Sync State
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0); 
  
  // Form State
  const [newSiteName, setNewSiteName] = useState('');
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedType, setNewFeedType] = useState('JSON');
  const [isMaster, setIsMaster] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 1. Fetch Feeds Data
  const fetchFeeds = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/feeds');
      const data = await res.json();
      setRetailers(data);
    } catch (error) {
      console.error("Failed to load feeds");
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. ✅ FETCH REAL CLOUD SCHEDULER INFO
  const fetchSchedulerInfo = useCallback(async () => {
    try {
        const res = await fetch('/api/admin/system/scheduler');
        if (res.ok) {
            const data = await res.json();
            if (data.nextRunTime) {
                setNextRunTime(new Date(data.nextRunTime));
                setSchedulerState(data.state);
            }
        }
    } catch (e) {
        console.warn("Scheduler info unavailable");
    }
  }, []);

  // Initial Load
  useEffect(() => {
    fetchFeeds();
    fetchSchedulerInfo();
    // Poll feeds status every 5s (but not scheduler info, that's static until run)
    const interval = setInterval(fetchFeeds, 5000); 
    return () => clearInterval(interval);
  }, [fetchFeeds, fetchSchedulerInfo]);

  // 3. ✅ LIVE COUNTDOWN LOGIC
  useEffect(() => {
    if (!nextRunTime) return;

    const timer = setInterval(() => {
        const now = new Date();
        const diff = nextRunTime.getTime() - now.getTime();

        if (diff <= 0) {
            setTimeDisplay("Running Now...");
            fetchSchedulerInfo(); // Refresh to get next slot
        } else {
            // Format HH:MM:SS
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((diff / (1000 * 60)) % 60);
            const seconds = Math.floor((diff / 1000) % 60);
            setTimeDisplay(`${hours}h ${minutes}m ${seconds}s`);
        }
    }, 1000);

    return () => clearInterval(timer);
  }, [nextRunTime, fetchSchedulerInfo]);

  // 4. ✅ REAL SYNC ALL LOGIC
  const handleSyncAll = async () => {
    if (!confirm("This will trigger a REAL scrape for every feed. Continue?")) return;
    
    setIsSyncingAll(true);
    setSyncProgress(0);

    const allFeeds = retailers.flatMap(r => r.feeds);
    let completed = 0;

    for (const feed of allFeeds) {
        try {
            // CALL THE REAL SYNC ENDPOINT
            await fetch('/api/admin/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ feedId: feed.id }),
            });
        } catch (e) {
            console.error(`Failed to sync ${feed.name}`);
        } finally {
            completed++;
            setSyncProgress(Math.round((completed / allFeeds.length) * 100));
            await fetchFeeds(); // Update UI immediately to show 'SYNCING' status
        }
    }

    setIsSyncingAll(false);
  };

  // ... (Keep handleAddSite and handleDelete exactly as before) ...
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
      await fetchFeeds(); 
      setIsModalOpen(false);
      setNewSiteName('');
      setNewFeedUrl('');
      setIsMaster(false);
    } catch (error) {
      alert("Failed to add site");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (feedId: string) => {
    if (!confirm("Are you sure? This will stop monitoring this feed.")) return;
    await fetch(`/api/admin/feeds?id=${feedId}`, { method: 'DELETE' });
    fetchFeeds();
  };

  if (loading) return <div className="p-10 text-center text-[#aaaaaa] animate-pulse">Loading Feed Monitor...</div>;

  const masterRetailers = retailers.filter(r => r.role === 'MASTER');
  const competitorRetailers = retailers.filter(r => r.role === 'SPOKE');

  return (
    <main className="min-h-screen bg-[#111] p-8 font-sans pb-32">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-[#333] pb-6">
          <div className="flex flex-col gap-2">
             <div className="flex items-center gap-4">
                <h1 className="text-3xl font-black text-white tracking-tighter">Feed Monitor</h1>
                
                {/* ✅ REAL TIMER BADGE */}
                <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#333] px-3 py-1.5 rounded-lg">
                    <div className={`w-2 h-2 rounded-full ${schedulerState === 'ENABLED' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <span className="text-xs font-mono text-[#888] font-bold">
                        Next Auto-Run: <span className="text-blue-400">{timeDisplay}</span>
                    </span>
                </div>
             </div>
             <p className="text-[#666] font-medium text-sm">Managing {retailers.flatMap(r => r.feeds).length} active data pipelines.</p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* ✅ SYNC ALL BUTTON */}
            <button 
                onClick={handleSyncAll}
                disabled={isSyncingAll}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold uppercase text-xs tracking-wider border transition-all ${
                    isSyncingAll 
                        ? 'bg-yellow-600/20 text-yellow-500 border-yellow-600/50 cursor-not-allowed' 
                        : 'bg-[#222] text-[#aaa] border-[#333] hover:bg-[#333] hover:text-white'
                }`}
            >
                {isSyncingAll ? (
                    <>
                       <div className="w-4 h-4 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin"></div>
                       <span>Processing... {syncProgress}%</span>
                    </>
                ) : (
                    <>
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                       Sync All Feeds
                    </>
                )}
            </button>

            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-blue-900/20 transition-all flex-1 md:flex-none text-center"
            >
              + Add Site
            </button>
          </div>
        </div>

        {/* SECTION 1: MASTER FEEDS */}
        <div className="mb-12">
           <h2 className="text-[#aaaaaa] font-black uppercase tracking-widest text-sm mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Master Data Sources
           </h2>
           <div className="grid grid-cols-1 gap-4">
              {masterRetailers.map(retailer => (
                 retailer.feeds.map(feed => (
                   <FeedCard key={feed.id} retailer={retailer} feed={feed} onDelete={handleDelete} />
                 ))
              ))}
           </div>
        </div>

        {/* SECTION 2: COMPETITOR FEEDS */}
        <div>
           <h2 className="text-[#aaaaaa] font-black uppercase tracking-widest text-sm mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              Competitor Sub-Sites
           </h2>
           <div className="grid grid-cols-1 gap-4">
              {competitorRetailers.map(retailer => (
                 retailer.feeds.map(feed => (
                   <FeedCard key={feed.id} retailer={retailer} feed={feed} onDelete={handleDelete} />
                 ))
              ))}
           </div>
        </div>

      </div>
      
      {/* ... Add Site Modal (Same as before) ... */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#222] border border-[#333] rounded-2xl w-full max-w-md p-8 shadow-2xl">
            <h2 className="text-2xl font-black text-white mb-6">Add New Source</h2>
            <form onSubmit={handleAddSite} className="space-y-4">
              {/* Inputs... (Same as previous code) */}
              <div>
                <label className="block text-[#666] text-xs font-bold uppercase mb-2">Site Name</label>
                <input className="w-full bg-[#111] border border-[#333] rounded-lg p-3 text-white focus:outline-none focus:border-blue-600" value={newSiteName} onChange={e => setNewSiteName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-[#666] text-xs font-bold uppercase mb-2">Feed URL</label>
                <input className="w-full bg-[#111] border border-[#333] rounded-lg p-3 text-white focus:outline-none focus:border-blue-600" value={newFeedUrl} onChange={e => setNewFeedUrl(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-[#666] text-xs font-bold uppercase mb-2">Format</label>
                   <select className="w-full bg-[#111] border border-[#333] rounded-lg p-3 text-white" value={newFeedType} onChange={e => setNewFeedType(e.target.value)}>
                     <option value="JSON">JSON</option>
                     <option value="CSV">CSV</option>
                     <option value="XML">XML</option>
                   </select>
                </div>
                <div className="flex items-center pt-6">
                   <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={isMaster} onChange={e => setIsMaster(e.target.checked)} className="w-5 h-5 rounded bg-[#111] border border-[#333] accent-blue-600" /><span className="text-white font-bold text-sm">Is Master?</span></label>
                </div>
              </div>
              <div className="pt-6 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-[#333] hover:bg-[#444] text-white py-3 rounded-xl font-bold uppercase text-xs">Cancel</button>
                <button disabled={submitting} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold uppercase text-xs disabled:opacity-50">{submitting ? 'Saving...' : 'Add Feed'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

// ... FeedCard Component (Same as before) ...
function FeedCard({ retailer, feed, onDelete }: { retailer: Retailer, feed: Feed, onDelete: (id: string) => void }) {
  return (
    <div className={`bg-[#1a1a1a] border rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between transition-colors group gap-4 ${feed.status === 'ERROR' ? 'border-red-900/50 bg-red-900/10' : 'border-[#333] hover:border-[#444]'}`}>
       <div className="flex items-start gap-4 flex-1 w-full">
          <div className="w-12 h-12 bg-[#222] rounded-xl flex items-center justify-center font-black text-xl text-white border border-[#333] shadow-inner">{retailer.name.charAt(0)}</div>
          <div className="flex-1 min-w-0">
             <div className="flex flex-wrap items-center gap-3 mb-1">
                <h3 className="text-white font-bold text-lg leading-tight">{retailer.name}</h3>
                {feed.status === 'ERROR' && <span className="text-[10px] bg-red-500 text-black font-black px-2 py-0.5 rounded uppercase">Error</span>}
                {feed.status === 'SYNCING' && <span className="text-[10px] bg-yellow-500 text-black font-black px-2 py-0.5 rounded uppercase animate-pulse">Syncing</span>}
                {feed.status === 'SUCCESS' && <span className="text-[10px] bg-green-500 text-black font-black px-2 py-0.5 rounded uppercase">Active</span>}
             </div>
             <div className="flex items-center gap-2 text-xs text-[#666]"><span className="uppercase font-bold">{feed.type}</span><span>•</span><a href={feed.url} className="text-blue-500 hover:underline truncate max-w-[200px] block opacity-80">{feed.url}</a></div>
             {feed.status === 'ERROR' && feed.errorMessage && <div className="mt-3 text-xs text-red-200 bg-red-500/10 border border-red-500/20 p-3 rounded-lg font-mono break-all"><strong className="text-red-400">DIAGNOSTICS:</strong> {feed.errorMessage}</div>}
          </div>
       </div>
       <div className="flex items-center gap-3 w-full md:w-auto pl-0 md:pl-4 border-t md:border-t-0 md:border-l border-[#333] pt-4 md:pt-0 mt-2 md:mt-0">
          <div className="flex-1 md:flex-none"><FeedSyncButton feed={feed} /></div>
          <button onClick={() => onDelete(feed.id)} className="p-3 text-[#666] hover:text-red-500 hover:bg-[#333] rounded-lg transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
       </div>
    </div>
  );
}