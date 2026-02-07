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
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  
  // Real Scheduler State
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

  // 2. Fetch Real Cloud Scheduler Info
  const fetchSchedulerInfo = useCallback(async () => {
    try {
        const res = await fetch(`/api/admin/system/scheduler?t=${Date.now()}`);
        const data = await res.json();
        
        if (res.ok && data.lastRunTime) {
            const lastRun = new Date(data.lastRunTime);
            const nextRun = new Date(lastRun.getTime() + 15 * 60 * 1000);
            setNextRunTime(nextRun);
            setSchedulerState(data.state);
        } else {
            if (timeDisplay === "Calculating...") {
               const errorMsg = data.error || "Config Error";
               setTimeDisplay(errorMsg.length > 20 ? "Check Logs" : errorMsg);
            }
        }
    } catch (e) {
        if (timeDisplay === "Calculating...") {
            setTimeDisplay("API Error");
        }
    }
  }, [timeDisplay]);

  // Initial Load
  useEffect(() => {
    fetchFeeds();
    fetchSchedulerInfo();
    const interval = setInterval(fetchFeeds, 5000); 
    return () => clearInterval(interval);
  }, [fetchFeeds, fetchSchedulerInfo]);

  // 3. Live Countdown Logic
  useEffect(() => {
    if (!nextRunTime) return;

    const timer = setInterval(() => {
        const now = new Date();
        const diff = nextRunTime.getTime() - now.getTime();

        if (diff <= 0) {
            setTimeDisplay("Running Now...");
            
            if (diff > -2000) { 
                 fetchFeeds(); 
            }

            if (diff < -5000) {
                 fetchSchedulerInfo();
            }
        } else {
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((diff / (1000 * 60)) % 60);
            const seconds = Math.floor((diff / 1000) % 60);
            setTimeDisplay(`${hours}h ${minutes}m ${seconds}s`);
        }
    }, 1000);

    return () => clearInterval(timer);
  }, [nextRunTime, fetchSchedulerInfo, fetchFeeds]);

  // 4. SYNC ALL LOGIC
  const executeSyncAll = async () => {
    setIsSyncModalOpen(false); 
    setIsSyncingAll(true);
    setSyncProgress(0);

    const allFeeds = retailers.flatMap(r => r.feeds);
    let completed = 0;

    for (const feed of allFeeds) {
        try {
            setRetailers(currentRetailers => 
              currentRetailers.map(r => ({
                ...r,
                feeds: r.feeds.map(f => 
                  f.id === feed.id ? { ...f, status: 'SYNCING' } : f
                )
              }))
            );

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
            await fetchFeeds(); 
        }
    }

    setIsSyncingAll(false);
  };

  // Add Site Logic
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
      setIsAddModalOpen(false);
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

  if (loading) return <div className="text-[#666] animate-pulse">Loading Feed Monitor...</div>;

  const masterRetailers = retailers.filter(r => r.role === 'MASTER');
  const competitorRetailers = retailers.filter(r => r.role === 'SPOKE');
  const totalFeeds = retailers.flatMap(r => r.feeds).length;

  // Check if ANY master exists to disable the checkbox
  const hasMaster = masterRetailers.length > 0;

  return (
    <div className="max-w-7xl mx-auto pb-32">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-[#333] pb-6">
          <div className="flex flex-col gap-2">
             <div className="flex items-center gap-4">
                <h1 className="text-3xl font-black text-white tracking-tighter">Feed Monitor</h1>
                
                {/* TIMER BADGE */}
                <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#333] px-3 py-1.5 rounded-lg">
                    <div className={`w-2 h-2 rounded-full ${schedulerState === 'ENABLED' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <span className="text-xs font-mono text-[#888] font-bold">
                        Next Auto-Run: <span className="text-primary">{timeDisplay}</span>
                    </span>
                </div>
             </div>
             <p className="text-[#666] font-medium text-sm">Managing {totalFeeds} active data pipelines.</p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
                onClick={() => setIsSyncModalOpen(true)}
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
              onClick={() => setIsAddModalOpen(true)}
              // ✅ DYNAMIC BUTTON
              className="bg-primary hover:opacity-90 text-white px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-primary/20 transition-all flex-1 md:flex-none text-center"
            >
              + Add Site
            </button>
          </div>
        </div>

        {/* FEEDS LIST SECTION */}
        <div className="space-y-12">
            <div>
                <h2 className="text-[#aaaaaa] font-black uppercase tracking-widest text-sm mb-4 flex items-center gap-2">
                    {/* ✅ DYNAMIC PRIMARY INDICATOR */}
                    <span className="w-2 h-2 rounded-full bg-primary"></span>
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

            <div>
                <h2 className="text-[#aaaaaa] font-black uppercase tracking-widest text-sm mb-4 flex items-center gap-2">
                    {/* ✅ DYNAMIC ACCENT INDICATOR */}
                    <span className="w-2 h-2 rounded-full bg-accent"></span>
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

      {/* ADD SITE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#222] border border-[#333] rounded-2xl w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-black text-white mb-6">Add New Source</h2>
            <form onSubmit={handleAddSite} className="space-y-4">
              <div>
                <label className="block text-[#666] text-xs font-bold uppercase mb-2">Site Name</label>
                {/* ✅ DYNAMIC FOCUS BORDER */}
                <input className="w-full bg-[#111] border border-[#333] rounded-lg p-3 text-white focus:outline-none focus:border-primary transition-colors" value={newSiteName} onChange={e => setNewSiteName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-[#666] text-xs font-bold uppercase mb-2">Feed URL</label>
                <input className="w-full bg-[#111] border border-[#333] rounded-lg p-3 text-white focus:outline-none focus:border-primary transition-colors" value={newFeedUrl} onChange={e => setNewFeedUrl(e.target.value)} required />
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
                {/* ✅ DYNAMIC CHECKBOX COLOR */}
                <div className="pt-6">
                   <label className={`flex items-center gap-3 ${hasMaster ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                      <input 
                          type="checkbox" 
                          checked={isMaster} 
                          onChange={e => !hasMaster && setIsMaster(e.target.checked)} 
                          disabled={hasMaster} 
                          className="w-5 h-5 rounded bg-[#111] border border-[#333] accent-primary disabled:opacity-50" 
                      />
                      <span className="text-white font-bold text-sm">Is Master?</span>
                   </label>
                   {hasMaster && (
                       <p className="text-[#666] text-[10px] font-bold uppercase tracking-widest mt-2 pl-8">
                           Master already assigned
                       </p>
                   )}
                </div>
              </div>
              <div className="pt-6 flex gap-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 bg-[#333] hover:bg-[#444] text-white py-3 rounded-xl font-bold uppercase text-xs">Cancel</button>
                {/* ✅ DYNAMIC SUBMIT BUTTON */}
                <button disabled={submitting} className="flex-1 bg-primary hover:opacity-90 text-white py-3 rounded-xl font-bold uppercase text-xs disabled:opacity-50 transition-all">{submitting ? 'Saving...' : 'Add Feed'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SYNC MODAL */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={() => setIsSyncModalOpen(false)}></div>
            <div className="relative bg-[#222] border border-[#333] w-full max-w-md rounded-2xl p-8 shadow-2xl transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 bg-primary/10 text-primary">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Start Global Sync?</h3>
                    <p className="text-[#888] text-sm mb-8 leading-relaxed">
                        You are about to trigger a real-time scrape for <strong>{totalFeeds} feeds</strong> sequentially. 
                        This process handles large image uploads and database updates.
                    </p>
                    <div className="grid grid-cols-2 gap-4 w-full">
                        <button onClick={() => setIsSyncModalOpen(false)} className="bg-[#333] hover:bg-[#444] text-white py-3 rounded-xl font-bold text-sm transition-colors">Cancel</button>
                        <button onClick={executeSyncAll} className="bg-primary hover:opacity-90 text-white py-3 rounded-xl font-bold text-sm shadow-lg transition-all">Confirm Sync</button>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}

// FEED CARD COMPONENT
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
             <div className="flex items-center gap-2 text-xs text-[#666]">
                <span className="uppercase font-bold">{feed.type}</span>
                <span>•</span>
                {/* ✅ DYNAMIC LINK COLOR */}
                <a href={feed.url} className="text-primary hover:underline truncate max-w-[200px] block opacity-80">{feed.url}</a>
             </div>
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