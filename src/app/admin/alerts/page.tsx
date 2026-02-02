'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function AlertsDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = () => {
    fetch('/api/admin/alerts')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      });
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (id: string) => {
    if(!confirm("Delete this alert?")) return;
    await fetch(`/api/admin/alerts?id=${id}`, { method: 'DELETE' });
    loadData(); 
  };

  if (loading) return <div className="p-20 text-center text-[#666] animate-pulse">Loading Dashboard...</div>;

  const filteredAlerts = data.alerts.filter((a: any) => 
    a.email.toLowerCase().includes(search.toLowerCase()) || 
    a.product.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-[#111] p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter">Alerts Manager</h1>
            <p className="text-[#666] font-medium">Monitor active price watches and notifications.</p>
          </div>
          <button onClick={loadData} className="text-blue-500 hover:text-white text-sm font-bold uppercase">
            ↻ Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatCard label="Active Watchers" value={data.stats.active} color="text-blue-500" desc="Waiting for drop" />
          <StatCard label="Notifications Sent" value={data.stats.triggered} color="text-green-500" desc="Deals delivered" />
          <StatCard label="Most Wanted" value={data.topProducts[0]?.title || 'N/A'} color="text-white" desc="Top Product" isText />
        </div>

        <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-[#333] flex justify-between items-center">
             <h2 className="text-white font-bold text-lg">Detailed Log</h2>
             <input 
               type="text" 
               placeholder="Search email or product..." 
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="bg-[#111] border border-[#333] rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-600 w-64"
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
                {filteredAlerts.map((alert: any) => (
                  <tr key={alert.id} className="hover:bg-[#222] transition-colors group">
                    <td className="p-4">
                      {alert.isTriggered ? (
                         <span className="bg-green-900/20 text-green-500 px-2 py-1 rounded text-[10px] font-black uppercase border border-green-900/50">Sent</span>
                      ) : (
                         <span className="bg-blue-900/20 text-blue-500 px-2 py-1 rounded text-[10px] font-black uppercase border border-blue-900/50">Active</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                         {alert.product.image && (
                           <div className="w-8 h-8 rounded bg-[#333] relative overflow-hidden flex-shrink-0">
                             <Image src={alert.product.image} alt="" fill className="object-cover" />
                           </div>
                         )}
                         <Link href={`/product/${alert.product.slug}`} target="_blank" className="text-white font-bold text-sm hover:text-blue-500 truncate max-w-[200px] block">
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
    </main>
  );
}

function StatCard({ label, value, color, desc, isText = false }: any) {
  return (
    <div className="bg-[#1a1a1a] border border-[#333] p-6 rounded-2xl shadow-lg relative overflow-hidden">
       <div className="relative z-10">
         <h3 className="text-[#666] text-xs font-bold uppercase tracking-widest mb-2">{label}</h3>
         <div className={`text-4xl font-black ${color} ${isText ? 'text-2xl mt-2 line-clamp-1' : ''}`}>
           {value}
         </div>
         <p className="text-[#444] text-xs mt-2 font-medium">{desc}</p>
       </div>
    </div>
  );
}