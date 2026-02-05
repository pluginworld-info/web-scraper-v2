'use client';

import { useEffect, useState } from 'react';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats/overview')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => setLoading(false));
  }, []);

  if (loading) return <div className="text-[#666] animate-pulse">Loading Mission Control...</div>;

  return (
    <div className="max-w-7xl mx-auto">
      
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white tracking-tighter">Mission Control</h1>
        <p className="text-[#666] font-medium">Welcome back, Commander.</p>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <KpiCard label="Total Products" value={stats?.products || 0} icon="📦" />
        {/* ✅ DYNAMIC THEME COLOR */}
        <KpiCard label="Active Alerts" value={stats?.alerts || 0} icon="🔔" color="text-primary" />
        <KpiCard label="Total Clicks (Leads)" value={stats?.clicks || 0} icon="🚀" color="text-green-400" />
        <KpiCard label="User Reviews" value={stats?.reviews || 0} icon="⭐" color="text-yellow-400" />
      </div>

      {/* RECENT ACTIVITY SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Recent Alerts */}
        <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-6 shadow-xl">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            {/* ✅ DYNAMIC THEME COLOR */}
            <span className="w-2 h-2 rounded-full bg-primary"></span> Recent Price Alerts
          </h3>
          <div className="space-y-4">
              {stats?.recentAlerts?.length > 0 ? (
                stats.recentAlerts.map((a: any) => (
                  <div key={a.id} className="flex justify-between items-center text-sm border-b border-[#333] pb-2 last:border-0">
                    <span className="text-[#aaa] truncate w-2/3">{a.product.title}</span>
                    <span className="text-white font-mono font-bold">${a.targetPrice}</span>
                  </div>
                ))
              ) : (
                <p className="text-[#444] text-sm italic">No active alerts yet.</p>
              )}
          </div>
        </div>

        {/* System Health */}
        <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-6 shadow-xl">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span> System Health
          </h3>
          <div className="space-y-4">
              <HealthRow label="Database Connection" status="Operational" />
              <HealthRow label="Scraper Engine" status="Idle" />
              <HealthRow label="Email Service" status="Active" />
          </div>
        </div>

      </div>
    </div>
  );
}

// Sub-components
function KpiCard({ label, value, icon, color = "text-white" }: any) {
  return (
    <div className="bg-[#1a1a1a] border border-[#333] p-6 rounded-2xl shadow-lg relative overflow-hidden group hover:border-[#555] transition-colors">
       <div className="relative z-10">
         <div className="flex justify-between items-start mb-4">
            <h3 className="text-[#666] text-xs font-bold uppercase tracking-widest">{label}</h3>
            <span className="text-xl grayscale group-hover:grayscale-0 transition-all">{icon}</span>
         </div>
         <div className={`text-4xl font-black ${color}`}>
           {value}
         </div>
       </div>
    </div>
  );
}

function HealthRow({ label, status }: any) {
  return (
    <div className="flex justify-between items-center bg-[#111] p-3 rounded-lg border border-transparent hover:border-[#333] transition-colors">
      <span className="text-[#aaa] text-sm font-bold">{label}</span>
      <span className="text-green-500 text-xs font-black uppercase tracking-wider bg-green-900/20 px-2 py-1 rounded border border-green-900/50">
        {status}
      </span>
    </div>
  );
}