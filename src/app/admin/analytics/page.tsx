'use client';

import { useEffect, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats/analytics')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => setLoading(false));
  }, []);

  if (loading) return <div className="text-[#666] animate-pulse p-8">Loading Analytics Data...</div>;

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tighter">Traffic & Leads</h1>
        <p className="text-[#666] font-medium">Monitoring outbound clicks to affiliate stores.</p>
      </div>

      {/* GRAPH SECTION */}
      <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-6">
        <h3 className="text-white font-bold mb-6 flex items-center gap-2">
           <span className="w-2 h-2 rounded-full bg-blue-500"></span> 30-Day Click Performance
        </h3>
        <div className="h-[350px] w-full">
           <ResponsiveContainer width="100%" height="100%">
             <BarChart data={data?.graphData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#666" 
                  fontSize={12} 
                  tickMargin={10} 
                  tickFormatter={(val) => val.slice(5)} // Show MM-DD
                />
                <YAxis stroke="#666" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#222', borderColor: '#333', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                  cursor={{ fill: '#333', opacity: 0.4 }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
             </BarChart>
           </ResponsiveContainer>
        </div>
      </div>

      {/* TOP PRODUCTS TABLE */}
      <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-[#333]">
           <h3 className="text-white font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span> Top Performing Products
           </h3>
        </div>
        <table className="w-full text-left">
           <thead className="bg-[#222] text-[#888] text-xs uppercase font-bold">
              <tr>
                 <th className="px-6 py-4">Product Name</th>
                 <th className="px-6 py-4 text-right">Total Clicks</th>
                 <th className="px-6 py-4 text-right">Est. Earnings</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-[#333]">
              {data?.topProducts?.map((product: any, index: number) => (
                <tr key={index} className="hover:bg-[#222] transition-colors">
                   <td className="px-6 py-4 text-white font-medium">{product.title}</td>
                   <td className="px-6 py-4 text-right text-blue-400 font-bold">{product.count}</td>
                   <td className="px-6 py-4 text-right text-[#666] text-sm">
                      {/* Rough estimation logic just for display */}
                      ~${(product.count * 0.5).toFixed(2)}
                   </td>
                </tr>
              ))}
              {(!data?.topProducts || data.topProducts.length === 0) && (
                 <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-[#666] italic">
                       No click data recorded yet.
                    </td>
                 </tr>
              )}
           </tbody>
        </table>
      </div>
    </div>
  );
}