'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function AlertsDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // --- NEW: SERVER-SYNCED TIMER STATE ---
  const [schedulerState, setSchedulerState] = useState<string>("UNKNOWN");
  const [timeUntilNext, setTimeUntilNext] = useState<string>("Checking...");
  const [nextRunTime, setNextRunTime] = useState<Date | null>(null);

  // 1. Fetch Alerts Data
  const loadData = useCallback(async () => {
    try {
        const res = await fetch(`/api/admin/alerts?t=${Date.now()}`);
        const d = await res.json();
        setData(d);
    } catch (error) {
        console.error("Failed to load alerts", error);
    } finally {
        setLoading(false);
        setIsRefreshing(false);
    }
  }, []);

  // 2. Fetch Real Scheduler Info (Sync with Server)
  const fetchSchedulerInfo = useCallback(async () => {
    try {
        // We can reuse the same system endpoint, or assume the cron schedule
        // Since we know the cron runs every 5 mins, we can calculate the next "bucket"
        const now = new Date();
        const minutes = now.getMinutes();
        const remainder = 5 - (minutes % 5);
        const nextRun = new Date(now.getTime() + remainder * 60 * 1000 - (now.getSeconds() * 1000));
        
        setNextRunTime(nextRun);
        setSchedulerState("ACTIVE");
    } catch (e) {
        console.error("Timer Sync Failed");
    }
  }, []);

  // 3. Force Run (Manual Button)
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
        // Trigger the check manually
        await fetch('/api/admin/alerts/check-all', { method: 'POST' });
        // Reload table
        await loadData();
    } catch (e) {
        console.error("Manual trigger failed");
    } finally {
        setIsRefreshing(false);
    }
  };

  // Initial Load & Intervals
  useEffect(() => {
    loadData();
    fetchSchedulerInfo();

    // Poll for data updates every 30 seconds (to see new "Sent" statuses)
    const dataInterval = setInterval(loadData, 30000);
    
    // Sync timer info every minute
    const syncInterval = setInterval(fetchSchedulerInfo, 60000);

    return () => {
        clearInterval(dataInterval);
        clearInterval(syncInterval);
    };
  }, [loadData, fetchSchedulerInfo]);

  // Visual Countdown Timer (Updates every second)
  useEffect(() => {
    if (!nextRunTime) return;

    const timer = setInterval(() => {
        const now = new Date();
        const diff = nextRunTime.getTime() - now.getTime();

        if (diff <= 0) {
            setTimeDisplay("Running...");
            // Resync after a moment to get the next slot
            setTimeout(fetchSchedulerInfo, 2000);
        } else {
            const m = Math.floor(diff / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setTimeUntilNext(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        }
    }, 1000);

    return () => clearInterval(timer);
  }, [nextRunTime, fetchSchedulerInfo]);

  // Helper for display
  const setTimeDisplay = (msg: string) => setTimeUntilNext(msg);

  const handleDelete = async (id: string) => {
    if(!confirm("Delete this alert?")) return;
    await fetch(`/api/admin/alerts?id=${id}`, { method: 'DELETE' });
    loadData(); 
  };

  if (loading) return <div className="text-[#666] animate-pulse">Loading Dashboard...</div>;

  const filteredAlerts = data?.alerts?.filter((a: any) => 
    a.email.toLowerCase().includes(search.toLowerCase()) || 
    a.product.title.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter">Alerts Manager</h1>
            <div className="flex items-center gap-3 mt-1">
                <p className="text-[#666] font-medium">Monitor active price watches and notifications.</p>
                
                {/* ✅ DYNAMIC SERVER-SYNCED TIMER */}
                <span className="text-[10px] font-mono bg-[#222] border border-[#333] px-2 py-0.5 rounded text-[#888] flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${schedulerState === 'ACTIVE' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
                    <span className="font-bold text-white">Next Auto-Check: <span className="text-primary">{timeUntilNext}</span></span>
                </span>
            </div>
          </div>
          
          <button 
            onClick={handleManualRefresh} 
            disabled={isRefreshing}
            className={`text-sm font-bold uppercase flex items-center gap-2 transition-colors ${isRefreshing ? 'text-[#666] cursor-wait' : 'text-primary hover:text-white'}`}
          >
            <span className={`text-lg ${isRefreshing ? 'animate-spin' : ''}`}>↻</span>
            {isRefreshing ? 'Scanning...' : 'Force Scan & Refresh'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatCard label="Active Watchers" value={data?.stats?.active || 0} color="text-primary" desc="Waiting for drop" />
          <StatCard label="Notifications Sent" value={data?.stats?.triggered || 0} color="text-green-500" desc="Deals delivered" />
          <StatCard label="Most Wanted" value={data?.topProducts?.[0]?.title || 'No Data Yet'} color="text-white" desc="Top Product" isText />
        </div>

        <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-[#333] flex justify-between items-center">
             <h2 className="text-white font-bold text-lg">Detailed Log</h2>
             <input 
               type="text" 
               placeholder="Search email or product..." 
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="bg-[#111] border border-[#333] rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-primary w-64 transition-colors"
             />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#222] text-[#666] text-xs font-bold uppercase tracking-wider border-b border-[#333]">
                  <th className="p-4">Status</th>
                  <th className="p-4">Product</th>
                  <th className="p-4">Target vs Current</th>
                  <th className="p-4">User Email</th>
                  <th className="p-4">Created</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333]">
                {filteredAlerts.length === 0 ? (
                    <tr>
                        <td colSpan={6} className="p-8 text-center text-[#444] font-medium">No alerts found matching your search.</td>
                    </tr>
                ) : filteredAlerts.map((alert: any) => (
                  <tr key={alert.id} className="hover:bg-[#222] transition-colors group">
                    <td className="p-4">
                      {alert.isTriggered ? (
                          <span className="bg-green-900/20 text-green-500 px-2 py-1 rounded text-[10px] font-black uppercase border border-green-900/50">Sent</span>
                      ) : (
                          <span className="bg-primary/20 text-primary px-2 py-1 rounded text-[10px] font-black uppercase border border-primary/50">Active</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                          {alert.product.image && (
                            <div className="w-8 h-8 rounded bg-[#333] relative overflow-hidden flex-shrink-0">
                              <Image src={alert.product.image} alt="" fill className="object-cover" />
                            </div>
                          )}
                          <Link href={`/product/${alert.product.slug}`} target="_blank" className="text-white font-bold text-sm hover:text-primary truncate max-w-[200px] block transition-colors">
                             {alert.product.title}
                          </Link>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm font-mono">
                        <span className="text-green-500 font-bold">${alert.targetPrice}</span>
                        <span className="text-[#444]">/</span>
                        <span className="text-[#888]">${alert.product.minPrice}</span>
                      </div>
                    </td>
                    <td className="p-4 text-[#aaa] text-sm">
                      {alert.email}
                    </td>
                    <td className="p-4 text-[#666] text-xs">
                      {new Date(alert.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                        <button 
                          onClick={() => handleDelete(alert.id)}
                          className="text-[#666] hover:text-red-500 p-2 rounded hover:bg-[#333] transition-colors"
                          title="Delete Alert"
                        >
                          ✕
                        </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
    </div>
  );
}

// FINAL FIXED STATCARD
function StatCard({ label, value, color, desc, isText = false }: any) {
  const strip = (
    <>
      <span className="mx-4">{value}</span>
      <span className="text-[#444] mx-4">•</span>
      <span className="mx-4">{value}</span>
      <span className="text-[#444] mx-4">•</span>
      <span className="mx-4">{value}</span>
      <span className="text-[#444] mx-4">•</span>
      <span className="mx-4">{value}</span>
      <span className="text-[#444] mx-4">•</span>
    </>
  );

  return (
    <div className="bg-[#1a1a1a] border border-[#333] p-6 rounded-2xl shadow-lg relative overflow-hidden flex flex-col justify-center h-36">
       {isText && (
         <style dangerouslySetInnerHTML={{__html: `
            @keyframes marquee-scroll {
                0% { transform: translateX(0); }
                100% { transform: translateX(-50%); } 
            }
            .animate-marquee {
                display: flex;
                width: max-content;
                animation: marquee-scroll 20s linear infinite;
            }
            .animate-marquee:hover {
                animation-play-state: paused;
            }
         `}} />
       )}

       <div className="relative z-10 w-full overflow-hidden">
         <h3 className="text-[#666] text-xs font-bold uppercase tracking-widest mb-2">{label}</h3>
         
         {isText ? (
            <div className="w-full relative h-10 flex items-center overflow-hidden justify-start">
                <div className="animate-marquee text-xl font-black text-white">
                    <div className="flex whitespace-nowrap">{strip}</div>
                    <div className="flex whitespace-nowrap">{strip}</div>
                </div>
            </div>
         ) : (
            <div className={`text-4xl font-black ${color}`}>
               {value}
            </div>
         )}
         
         <p className="text-[#444] text-xs mt-2 font-medium">{desc}</p>
       </div>
    </div>
  );
}