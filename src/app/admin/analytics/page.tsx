'use client';

import { useEffect, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
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

  // ✅ CALCULATE TRAFFIC SHARE 
  // We sum up the clicks shown to determine the percentage for each row
  const totalClicks = data?.topProducts?.reduce((acc: number, curr: any) => acc + curr.count, 0) || 0;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      {/* HEADER */}
      <div className="border-b border-[#333] pb-6">
        <h1 className="text-3xl font-black text-white tracking-tighter">Traffic Intelligence</h1>
        <p className="text-[#888] font-medium mt-1">Real-time analysis of outbound clicks and user engagement.</p>
      </div>

      {/* GRAPH SECTION */}
      <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-bold flex items-center gap-3">
               <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                  {/* Chart Icon */}
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
               </div>
               Traffic Volume (30 Days)
            </h3>
            <div className="text-xs font-mono text-[#666] bg-[#111] px-3 py-1 rounded border border-[#333]">
                TOTAL: {data?.graphData?.reduce((a: any, b: any) => a + b.count, 0) || 0} CLICKS
            </div>
        </div>
        
        <div className="h-[350px] w-full">
           <ResponsiveContainer width="100%" height="100%">
             <BarChart data={data?.graphData || []}>
                <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#2563eb" stopOpacity={0.6}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#555" 
                  fontSize={11} 
                  tickMargin={12} 
                  tickFormatter={(val) => val.slice(5).replace('-', '/')} 
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis stroke="#555" fontSize={11} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#333', opacity: 0.2 }}
                  contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                  labelStyle={{ color: '#888', marginBottom: '5px', fontSize: '10px', textTransform: 'uppercase' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={50} fill="url(#colorGradient)">
                    {data?.graphData?.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill="url(#colorGradient)" />
                    ))}
                </Bar>
             </BarChart>
           </ResponsiveContainer>
        </div>
      </div>

      {/* TOP PRODUCTS TABLE (Improved) */}
      <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-[#333] flex items-center gap-3">
           <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
               {/* Star Icon */}
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
           </div>
           <div>
               <h3 className="text-white font-bold">Top Performing Products</h3>
               <p className="text-[#666] text-xs mt-0.5">Products driving the most outbound traffic.</p>
           </div>
        </div>
        
        <table className="w-full text-left border-collapse">
           <thead className="bg-[#151515] text-[#666] text-[10px] uppercase font-bold tracking-wider">
              <tr>
                 <th className="px-6 py-4">Product Name</th>
                 <th className="px-6 py-4 text-center">Click Volume</th>
                 <th className="px-6 py-4 w-1/3">Traffic Share</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-[#2a2a2a]">
              {data?.topProducts?.map((product: any, index: number) => {
                 // Calculate Share Percentage
                 const percentage = totalClicks > 0 ? ((product.count / totalClicks) * 100).toFixed(1) : "0";
                 
                 return (
                    <tr key={index} className="hover:bg-[#222] transition-colors group">
                       <td className="px-6 py-4">
                           <div className="text-white font-bold text-sm group-hover:text-blue-400 transition-colors">{product.title}</div>
                       </td>
                       <td className="px-6 py-4 text-center">
                           <span className="bg-[#222] border border-[#333] px-3 py-1 rounded text-white font-mono text-xs font-bold">
                               {product.count}
                           </span>
                       </td>
                       <td className="px-6 py-4">
                          {/* ✅ REPLACED EST. EARNINGS WITH VISUAL BAR */}
                          <div className="flex items-center gap-3">
                             <div className="flex-1 h-2 bg-[#222] rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-blue-600 rounded-full transition-all duration-500" 
                                    style={{ width: `${percentage}%` }}
                                ></div>
                             </div>
                             <span className="text-[#888] text-xs font-mono w-12 text-right">{percentage}%</span>
                          </div>
                       </td>
                    </tr>
                 );
              })}
              
              {(!data?.topProducts || data.topProducts.length === 0) && (
                 <tr>
                    <td colSpan={3} className="px-6 py-12 text-center">
                       <div className="text-[#444] italic mb-2">No traffic data recorded yet</div>
                       <div className="text-[#333] text-xs">Clicks on "Get Deal" will appear here</div>
                    </td>
                 </tr>
              )}
           </tbody>
        </table>
      </div>
    </div>
  );
}