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
  affiliateTag: string | null; 
  totalItems: number;      
  processedItems: number;  
}

interface Retailer {
  id: string;
  name: string;
  role: 'MASTER' | 'SPOKE';
  feeds: Feed[];
}

// ⚡ Custom hook to poll for progress when syncing
function useFeedProgress(feedId: string, isSyncing: boolean) {
  const [progress, setProgress] = useState({ totalItems: 0, processedItems: 0 });

  useEffect(() => {
    if (!isSyncing) return;

    const fetchProgress = async () => {
      try {
        const res = await fetch(`/api/admin/feeds/${feedId}/progress`);
        if (res.ok) {
          const data = await res.json();
          setProgress({ totalItems: data.totalItems, processedItems: data.processedItems });
        }
      } catch (e) {
        // Silently fail polling
      }
    };

    // Poll every 2 seconds
    fetchProgress();
    const interval = setInterval(fetchProgress, 2000);
    return () => clearInterval(interval);
  }, [feedId, isSyncing]);

  return progress;
}

export default function AdminFeedsPage() {
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [feedToDelete, setFeedToDelete] = useState<string | null>(null); 
  
  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [feedToEdit, setFeedToEdit] = useState<Feed | null>(null);

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
  const [newAffiliateTag, setNewAffiliateTag] = useState(''); 
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

  // 2. Fetch Real Cloud Scheduler Info (⚡ FIX: Stabilized to stop DB drain)
  const fetchSchedulerInfo = useCallback(async () => {
    try {
        const res = await fetch(`/api/admin/system/scheduler?t=${Date.now()}`);
        const data = await res.json();
        
        if (res.ok && data.nextRunTime) {
            setNextRunTime(new Date(data.nextRunTime));
            setSchedulerState(data.state);
        } else {
            // Uses functional update to prevent React from re-triggering the loop
            setTimeDisplay(prev => prev === "Calculating..." ? (data.error?.length > 20 ? "Check Logs" : (data.error || "Config Error")) : prev);
        }
    } catch (e) {
        setTimeDisplay(prev => prev === "Calculating..." ? "API Error" : prev);
    }
  }, []); // <-- Empty dependency array keeps it completely stable

  // Initial Load
  useEffect(() => {
    fetchFeeds();
    fetchSchedulerInfo();
    const interval = setInterval(fetchFeeds, 15000); 
    return () => clearInterval(interval);
  }, [fetchFeeds, fetchSchedulerInfo]);

  // 3. Live Countdown Logic (⚡ FIX: Stopped zero-second spam)
  useEffect(() => {
    if (!nextRunTime) return;

    const timer = setInterval(() => {
        const now = new Date();
        const diff = nextRunTime.getTime() - now.getTime();

        if (diff <= 0) {
            setTimeDisplay("Running Now...");
            // Removed aggressive API fetching here. 
            // The 5-second interval above handles it safely now!
        } else {
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((diff / (1000 * 60)) % 60);
            const seconds = Math.floor((diff / 1000) % 60);
            setTimeDisplay(`${hours}h ${minutes}m ${seconds}s`);
        }
    }, 1000);

    return () => clearInterval(timer);
  }, [nextRunTime]); // <-- Removed fetch dependencies to keep it stable

  // 4. SYNC ALL LOGIC (Robust Sequential Polling)
  const executeSyncAll = async () => {
    setIsSyncModalOpen(false); 
    setIsSyncingAll(true);
    setSyncProgress(0);

    const allFeeds = retailers.flatMap(r => r.feeds);
    let completed = 0;

    for (const feed of allFeeds) {
        try {
            // Optimistically update UI to show syncing state for the current feed
            setRetailers(currentRetailers => 
              currentRetailers.map(r => ({
                ...r,
                feeds: r.feeds.map(f => 
                  f.id === feed.id ? { ...f, status: 'SYNCING' } : f
                )
              }))
            );

            // 1. Trigger the sync process for the current feed
            // We use 'no-store' to ensure we don't get a cached response,
            // but we don't 'await' its full completion here to avoid browser timeouts.
            fetch('/api/admin/sync', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Cache-Control': 'no-store'
                },
                body: JSON.stringify({ feedId: feed.id }),
            }).catch(e => console.error(`Trigger failed for ${feed.name}:`, e));

            // 2. Start polling to check when the database marks it as finished
            let isCurrentFeedDone = false;
            let pollingAttempts = 0;
            const MAX_POLLING_ATTEMPTS = 600; // 30 minutes total (600 attempts * 3 seconds)

            while (!isCurrentFeedDone && pollingAttempts < MAX_POLLING_ATTEMPTS) {
                // Wait for 3 seconds before checking status
                await new Promise(resolve => setTimeout(resolve, 3000));
                pollingAttempts++;

                try {
                    // Fetch fresh feed data to check the status column
                    const checkRes = await fetch('/api/admin/feeds', { cache: 'no-store' });
                    if (checkRes.ok) {
                        const freshRetailers: Retailer[] = await checkRes.json();
                        
                        // Find our specific feed in the fresh data
                        for (const r of freshRetailers) {
                            const freshFeed = r.feeds.find(f => f.id === feed.id);
                            if (freshFeed) {
                                // If status is no longer SYNCING (e.g., SUCCESS, ERROR, or IDLE via abort), it's done.
                                if (freshFeed.status !== 'SYNCING') {
                                    isCurrentFeedDone = true;
                                }
                                break; // Found the feed, break out of the retailer loop
                            }
                        }
                    }
                } catch (pollError) {
                    console.warn(`Polling attempt ${pollingAttempts} failed, retrying...`, pollError);
                }
            }

            if (!isCurrentFeedDone) {
                 console.error(`Feed sync timed out waiting for completion: ${feed.name}`);
                 // Optionally handle timeout failure (e.g., mark as error in UI)
            }

        } catch (e) {
            console.error(`Unexpected error handling feed ${feed.name}:`, e);
        } finally {
            completed++;
            setSyncProgress(Math.round((completed / allFeeds.length) * 100));
            await fetchFeeds(); // Refresh the final UI state for this feed
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
          role: isMaster ? 'MASTER' : 'SPOKE',
          affiliateTag: newAffiliateTag || null 
        }),
      });
      await fetchFeeds(); 
      setIsAddModalOpen(false);
      
      // Reset Form
      setNewSiteName('');
      setNewFeedUrl('');
      setNewAffiliateTag(''); 
      setIsMaster(false);
    } catch (error) {
      alert("Failed to add site");
    } finally {
      setSubmitting(false);
    }
  };

  // Edit Site Logic
  const initiateEdit = (feed: Feed, retailerName: string) => {
    setFeedToEdit(feed);
    setNewSiteName(retailerName);
    setNewFeedUrl(feed.url);
    setNewFeedType(feed.type);
    setNewAffiliateTag(feed.affiliateTag || '');
    setIsEditModalOpen(true);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedToEdit) return;
    
    setSubmitting(true);
    try {
        await fetch('/api/admin/feeds', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: feedToEdit.id,
                name: newSiteName, 
                url: newFeedUrl,
                type: newFeedType,
                affiliateTag: newAffiliateTag || null 
            }),
        });
        await fetchFeeds();
        setIsEditModalOpen(false);
        setFeedToEdit(null);
        
        // Reset fields
        setNewSiteName('');
        setNewFeedUrl('');
        setNewAffiliateTag('');
    } catch (error) {
        alert("Failed to update feed");
    } finally {
        setSubmitting(false);
    }
  };

  // Opens the styled modal instead of the ugly browser alert
  const initiateDelete = (feedId: string) => {
    setFeedToDelete(feedId);
  };

  // Actually executes the delete when they click "Confirm" in the modal
  const confirmDelete = async () => {
    if (!feedToDelete) return;
    try {
      await fetch(`/api/admin/feeds?id=${feedToDelete}`, { method: 'DELETE' });
      await fetchFeeds();
    } catch (err) {
      console.error("Failed to delete feed");
    } finally {
      setFeedToDelete(null); // Close the modal
    }
  };

  // Safely aborts a running sync
  const handleAbort = async (feedId: string) => {
    try {
      await fetch(`/api/admin/feeds/${feedId}/abort`, { method: 'POST' });
      await fetchFeeds(); // Instantly refresh UI to show IDLE state
    } catch (error) {
      console.error("Failed to abort sync");
    }
  };

  if (loading) return <div className="text-[#666] animate-pulse">Loading Feed Monitor...</div>;

  const masterRetailers = retailers.filter(r => r.role === 'MASTER');
  const competitorRetailers = retailers.filter(r => r.role === 'SPOKE');
  const totalFeeds = retailers.flatMap(r => r.feeds).length;

  // SMART LOCK: Only lock if a Master exists AND you aren't typing its exact name
  const existingMaster = masterRetailers[0];
  const isTypingExistingMaster = existingMaster && newSiteName.trim().toLowerCase() === existingMaster.name.toLowerCase();
  const isMasterLocked = masterRetailers.length > 0 && !isTypingExistingMaster;

  return (
    <div className="max-w-7xl mx-auto pb-32">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-[#333] pb-6">
          <div className="flex flex-col gap-2">
             <div className="flex items-center gap-4">
                <h1 className="text-3xl font-black text-white tracking-tighter">Feed Monitor</h1>
                
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
              onClick={() => {
                setNewSiteName('');
                setNewFeedUrl('');
                setNewAffiliateTag('');
                setIsAddModalOpen(true);
              }}
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
                    <span className="w-2 h-2 rounded-full bg-primary"></span>
                    Master Data Sources
                </h2>
                <div className="grid grid-cols-1 gap-4">
                    {masterRetailers.map(retailer => (
                        retailer.feeds.map(feed => (
                        <FeedCard key={feed.id} retailer={retailer} feed={feed} onDelete={initiateDelete} onAbort={handleAbort} onEdit={initiateEdit} />
                        ))
                    ))}
                </div>
            </div>

            <div>
                <h2 className="text-[#aaaaaa] font-black uppercase tracking-widest text-sm mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent"></span>
                    Competitor Sub-Sites
                </h2>
                <div className="grid grid-cols-1 gap-4">
                    {competitorRetailers.map(retailer => (
                        retailer.feeds.map(feed => (
                        <FeedCard key={feed.id} retailer={retailer} feed={feed} onDelete={initiateDelete} onAbort={handleAbort} onEdit={initiateEdit} />
                        ))
                    ))}
                </div>
            </div>
        </div>

      {/* ADD/EDIT SITE MODAL */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#222] border border-[#333] rounded-2xl w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-black text-white mb-6">
                {isEditModalOpen ? 'Edit Data Source' : 'Add New Source'}
            </h2>
            <form onSubmit={isEditModalOpen ? handleEditSave : handleAddSite} className="space-y-4">
              <div>
                <label className="block text-[#666] text-xs font-bold uppercase mb-2">Site Name</label>
                <input 
                    className="w-full bg-[#111] border border-[#333] rounded-lg p-3 text-white focus:outline-none focus:border-primary transition-colors disabled:opacity-50" 
                    value={newSiteName} 
                    onChange={e => setNewSiteName(e.target.value)} 
                    required 
                    disabled={isEditModalOpen} 
                />
                {isEditModalOpen && <p className="text-[10px] text-[#666] mt-1">Site name cannot be changed while editing.</p>}
              </div>
              
              <div>
                <label className="block text-[#666] text-xs font-bold uppercase mb-2">Feed URL</label>
                <input className="w-full bg-[#111] border border-[#333] rounded-lg p-3 text-white focus:outline-none focus:border-primary transition-colors" value={newFeedUrl} onChange={e => setNewFeedUrl(e.target.value)} required />
              </div>

              <div>
                <label className="block text-[#666] text-xs font-bold uppercase mb-2">Affiliate Tag (Optional)</label>
                <input 
                  className="w-full bg-[#111] border border-[#333] rounded-lg p-3 text-white focus:outline-none focus:border-primary transition-colors font-mono text-sm placeholder:text-[#444]" 
                  value={newAffiliateTag} 
                  onChange={e => setNewAffiliateTag(e.target.value)} 
                  placeholder="e.g. a_aid=12345" 
                />
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
                {!isEditModalOpen && (
                    <div className="pt-6">
                       <label className={`flex items-center gap-3 ${isMasterLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                          <input 
                              type="checkbox" 
                              // Auto-checks the box if they type the master's name to prevent demotion
                              checked={isMaster || (isTypingExistingMaster || false)} 
                              onChange={e => !isMasterLocked && setIsMaster(e.target.checked)} 
                              disabled={isMasterLocked} 
                              className="w-5 h-5 rounded bg-[#111] border border-[#333] accent-primary disabled:opacity-50" 
                          />
                          <span className="text-white font-bold text-sm">Is Master?</span>
                       </label>
                       {isMasterLocked && (
                           <p className="text-[#666] text-[10px] font-bold uppercase tracking-widest mt-2 pl-8">
                               Master already assigned
                           </p>
                       )}
                    </div>
                )}
              </div>
              <div className="pt-6 flex gap-3">
                <button type="button" onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); setFeedToEdit(null); }} className="flex-1 bg-[#333] hover:bg-[#444] text-white py-3 rounded-xl font-bold uppercase text-xs">Cancel</button>
                <button disabled={submitting} className="flex-1 bg-primary hover:opacity-90 text-white py-3 rounded-xl font-bold uppercase text-xs disabled:opacity-50 transition-all">{submitting ? 'Saving...' : (isEditModalOpen ? 'Save Changes' : 'Add Feed')}</button>
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

      {/* SLEEK DELETE CONFIRMATION MODAL */}
      {feedToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={() => setFeedToDelete(null)}></div>
            <div className="relative bg-[#222] border border-red-900/50 w-full max-w-md rounded-2xl p-8 shadow-[0_0_40px_rgba(220,38,38,0.15)] transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 bg-red-500/10 text-red-500 border border-red-500/20">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Delete Feed?</h3>
                    <p className="text-[#888] text-sm mb-8 leading-relaxed">
                        Are you sure you want to delete this feed? This will permanently stop monitoring and syncing price data from this source.
                    </p>
                    <div className="grid grid-cols-2 gap-4 w-full">
                        <button onClick={() => setFeedToDelete(null)} className="bg-[#333] hover:bg-[#444] text-white py-3 rounded-xl font-bold text-sm transition-colors">Cancel</button>
                        <button onClick={confirmDelete} className="bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all">Delete Feed</button>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}

// FEED CARD COMPONENT
function FeedCard({ retailer, feed, onDelete, onAbort, onEdit }: { retailer: Retailer, feed: Feed, onDelete: (id: string) => void, onAbort: (id: string) => void, onEdit: (feed: Feed, retailerName: string) => void }) {
  const isSyncing = feed.status === 'SYNCING';
  
  // Use our new hook to get live progress ONLY when syncing
  const liveProgress = useFeedProgress(feed.id, isSyncing);
  
  // Calculate percentage safely
  const currentTotal = isSyncing ? Math.max(liveProgress.totalItems, feed.totalItems || 1) : 1;
  const currentProcessed = isSyncing ? Math.max(liveProgress.processedItems, feed.processedItems || 0) : 0;
  const percentComplete = isSyncing && currentTotal > 0 
    ? Math.min(Math.round((currentProcessed / currentTotal) * 100), 100) 
    : 0;

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
                
                {/* THE BLUE BADGE - Proof that the tag is saved in the DB */}
                {feed.affiliateTag && (
                  <span className="text-[10px] bg-blue-900/40 text-blue-400 font-mono font-bold px-2 py-0.5 rounded border border-blue-900/50" title="Affiliate Tag">
                    {feed.affiliateTag}
                  </span>
                )}
             </div> 
             <div className="flex items-center gap-2 text-xs text-[#666]">
                <span className="uppercase font-bold">{feed.type}</span>
                <span>•</span>
                <a href={feed.url} className="text-primary hover:underline truncate max-w-[200px] block opacity-80">{feed.url}</a>
             </div>
             {feed.status === 'ERROR' && feed.errorMessage && <div className="mt-3 text-xs text-red-200 bg-red-500/10 border border-red-500/20 p-3 rounded-lg font-mono break-all"><strong className="text-red-400">DIAGNOSTICS:</strong> {feed.errorMessage}</div>}
             
             {/* SLEEK PROGRESS BAR (Only shows when syncing) */}
             {isSyncing && (
                <div className="mt-4 w-full max-w-md">
                   <div className="flex justify-between text-[10px] text-[#888] font-bold uppercase mb-1.5 px-1">
                      <span>Scanning Database & Feed...</span>
                      <span>{percentComplete}%</span>
                   </div>
                   <div className="h-2.5 w-full bg-[#111] rounded-full border border-[#333] overflow-hidden relative">
                      <div 
                         className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full transition-all duration-500 ease-out relative"
                         style={{ width: `${percentComplete}%` }}
                      >
                         {/* Glowing effect on the tip of the bar */}
                         <div className="absolute top-0 right-0 bottom-0 w-4 bg-white/30 blur-[2px] rounded-full"></div>
                      </div>
                   </div>
                   <div className="text-[10px] text-[#555] mt-1.5 px-1 font-mono">
                      Processed {currentProcessed.toLocaleString()} of {currentTotal.toLocaleString()} items
                   </div>
                </div>
             )}
          </div>
       </div>
       <div className="flex items-center gap-2 w-full md:w-auto pl-0 md:pl-4 border-t md:border-t-0 md:border-l border-[#333] pt-4 md:pt-0 mt-2 md:mt-0">
          <div className="flex-1 md:flex-none mr-2"><FeedSyncButton feed={feed} /></div>
          
          {/* ABORT BUTTON (Only shows when syncing) */}
          {isSyncing && (
             <button 
                 onClick={() => onAbort(feed.id)} 
                 title="Abort Sync"
                 className="p-3 text-yellow-500 hover:text-white hover:bg-yellow-600/20 rounded-lg transition-colors"
             >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
             </button>
          )}

          {/* EDIT BUTTON (Disabled while syncing) */}
          <button 
              onClick={() => !isSyncing && onEdit(feed, retailer.name)} 
              disabled={isSyncing}
              title={isSyncing ? "Cannot edit while syncing" : "Edit Feed"}
              className={`p-3 rounded-lg transition-colors ${
                  isSyncing 
                      ? 'text-[#444] cursor-not-allowed opacity-50' 
                      : 'text-[#666] hover:text-blue-500 hover:bg-[#333]'
              }`}
          >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>

          {/* DELETE BUTTON */}
          <button 
              onClick={() => !isSyncing && onDelete(feed.id)} 
              disabled={isSyncing}
              title={isSyncing ? "Cannot delete while syncing" : "Delete Feed"}
              className={`p-3 rounded-lg transition-colors ${
                  isSyncing 
                      ? 'text-[#444] cursor-not-allowed opacity-50' 
                      : 'text-[#666] hover:text-red-500 hover:bg-[#333]'
              }`}
          >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
       </div>
    </div>
  );
}