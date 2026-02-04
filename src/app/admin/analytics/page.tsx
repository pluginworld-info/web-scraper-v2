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
  Legend
} from 'recharts';

// Consistent colors for specific retailers (You can expand this list)
const RETAILER_COLORS: Record<string, string> = {
  'Plugin Boutique': '#3b82f6', // Blue
  'ADSR Sounds': '#8b5cf6',     // Purple
  'Best Service': '#f59e0b',    // Amber
  'Waves': '#ef4444',           // Red
  'Loopmasters': '#10b981',     // Emerald
  'Default': '#64748b'          // Slate (Fallback)
};

const getColor = (name: string) => RETAILER_COLORS[name] || RETAILER_COLORS['Default'];

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

  if (loading) return <div className="p-20 text-center text-[#666] animate-pulse">Loading Intelligence...</div>;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      
      {/* HEADER */}
      <div className="border-b border-[#333] pb-6">
        <h1 className="text-3xl font-black text-white tracking-tighter">Traffic Intelligence</h1>
        <p className="text-[#888] font-medium mt-1">Breakdown of clicks by retailer and product performance.</p>
      </div>

      {/* STACKED BAR CHART SECTION */}
      <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-bold flex items-center gap-3">
               <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
               </div>
               Traffic by Source (30 Days)
            </h3>
            
            {/* Legend Helper */}
            <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider">
                {data?.retailers?.slice(0, 4).map((r: string) => (
                    <div key={r} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: getColor(r) }}></span>
                        <span className="text-[#666]">{r}</span>
                    </div>
                ))}
            </div>
        </div>
        
        <div className="h-[400px] w-full">
           <ResponsiveContainer width="100%" height="100%">
             <BarChart data={data?.graphData || []} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#555" 
                  fontSize={11} 
                  tickMargin={12} 
                  tickFormatter={(val) => val.replace('-', '/')} 
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis stroke="#555" fontSize={11} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#333', opacity: 0.2 }}
                  contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                
                {/* Dynamically create a Bar for each Retailer found in the data */}
                {data?.retailers?.map((retailer: string) => (
                    <Bar 
                        key={retailer} 
                        dataKey={retailer} 
                        stackId="a" 
                        fill={getColor(retailer)} 
                        radius={[0, 0, 0, 0]} // No radius for middle stacks
                        maxBarSize={50}
                    />
                ))}
             </BarChart>
           </ResponsiveContainer>
        </div>
      </div>

      {/* TOP PRODUCTS TABLE */}
      <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-[#333] flex items-center gap-3">
           <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
           </div>
           <div>
               <h3 className="text-white font-bold">Top Performing Products</h3>
               <p className="text-[#666] text-xs mt-0.5">Which products are driving clicks and where they are going.</p>
           </div>
        </div>
        
        <table className="w-full text-left border-collapse">
           <thead className="bg-[#151515] text-[#666] text-[10px] uppercase font-bold tracking-wider">
              <tr>
                 <th className="px-6 py-4">Product Name</th>
                 <th className="px-6 py-4 text-center">Total Clicks</th>
                 <th className="px-6 py-4 w-[40%]">Retailer Distribution</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-[#2a2a2a]">
              {data?.topProducts?.map((product: any, index: number) => (
                 <tr key={index} className="hover:bg-[#222] transition-colors group">
                    <td className="px-6 py-4">
                        <div className="text-white font-bold text-sm group-hover:text-blue-400 transition-colors">{product.title}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                        <span className="bg-[#222] border border-[#333] px-3 py-1 rounded text-white font-mono text-xs font-bold">
                            {product.totalClicks}
                        </span>
                    </td>
                    <td className="px-6 py-4">
                       {/* VISUAL DISTRIBUTION BAR */}
                       <div className="flex flex-col gap-2">
                           {/* The Bar */}
                           <div className="h-2 w-full bg-[#111] rounded-full overflow-hidden flex">
                               {Object.entries(product.breakdown).map(([retailer, count]: any) => {
                                   const width = (count / product.totalClicks) * 100;
                                   return (
                                       <div 
                                          key={retailer}
                                          style={{ width: `${width}%`, backgroundColor: getColor(retailer) }}
                                          className="h-full hover:opacity-80 transition-opacity"
                                          title={`${retailer}: ${count} clicks`}
                                       ></div>
                                   );
                               })}
                           </div>
                           
                           {/* The Labels (Mini Legend) */}
                           <div className="flex flex-wrap gap-3">
                               {Object.entries(product.breakdown).map(([retailer, count]: any) => (
                                   <div key={retailer} className="flex items-center gap-1.5 text-[10px] text-[#888]">
                                       <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getColor(retailer) }}></div>
                                       <span>{retailer} <strong className="text-white">({count})</strong></span>
                                   </div>
                               ))}
                           </div>
                       </div>
                    </td>
                 </tr>
              ))}
              
              {(!data?.topProducts || data.topProducts.length === 0) && (
                 <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-[#444] italic">
                       No data recorded yet.
                    </td>
                 </tr>
              )}
           </tbody>
        </table>
      </div>
    </div>
  );
}