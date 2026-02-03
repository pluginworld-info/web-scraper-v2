'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface FeedSyncButtonProps {
  feed: {
    id: string;
    status: string; // 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR'
    lastSyncedAt: string | Date | null;
  };
}

export default function FeedSyncButton({ feed }: FeedSyncButtonProps) {
  const router = useRouter();
  const [status, setStatus] = useState(feed.status);
  const [loading, setLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(feed.status === 'SYNCING');

  // ✅ AUTO-POLLING: If status is 'SYNCING', check DB every 3 seconds
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPolling) {
      interval = setInterval(async () => {
        try {
          // Fetch just this feed's latest status
          // Note: You might need a simple GET API for a single feed, 
          // or just re-fetch the main feeds list. 
          // For efficiency, here we assume re-fetching the list is okay.
          const res = await fetch('/api/admin/feeds');
          const data = await res.json();
          
          // Find our specific feed
          const currentFeed = data.flatMap((r: any) => r.feeds).find((f: any) => f.id === feed.id);
          
          if (currentFeed) {
            setStatus(currentFeed.status);
            
            // Stop polling if done
            if (currentFeed.status === 'SUCCESS' || currentFeed.status === 'ERROR') {
              setIsPolling(false);
              setLoading(false);
              router.refresh(); // Refresh server data to show new timestamps
            }
          }
        } catch (err) {
          console.error("Polling error", err);
        }
      }, 3000);
    } 

    return () => clearInterval(interval);
  }, [isPolling, feed.id, router]);

  // ✅ MANUAL TRIGGER //
  const handleSync = async () => {
    setLoading(true);
    setStatus('SYNCING');
    setIsPolling(true); // Start watching

    try {
      const res = await fetch('/api/admin/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedId: feed.id }),
      });
      
      if (!res.ok) throw new Error('Failed to start sync');
      
      // We don't wait for the JSON response here because the sync might take 60s+
      // We let the Polling Effect handle the completion.
      
    } catch (error) {
      alert("Failed to start sync");
      setStatus('ERROR');
      setIsPolling(false);
      setLoading(false);
    }
  };

  // --- UI RENDER LOGIC --- //

  if (status === 'SYNCING') {
    return (
      <div className="flex items-center gap-2 text-blue-400 font-mono text-xs animate-pulse">
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>PROCESSING...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* STATUS BADGE */}
      {status === 'SUCCESS' && (
         <span className="text-[10px] text-green-500 font-bold border border-green-500/30 px-2 py-0.5 rounded uppercase tracking-wider">
           Synced
         </span>
      )}
      {status === 'ERROR' && (
         <span className="text-[10px] text-red-500 font-bold border border-red-500/30 px-2 py-0.5 rounded uppercase tracking-wider">
           Failed
         </span>
      )}

      {/* SYNC BUTTON */}
      <button
        onClick={handleSync}
        disabled={loading || status === 'SYNCING'}
        className="group relative p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
        title="Start Sync"
      >
        <svg className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  );
} 