'use client';

import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid
} from 'recharts';

interface PricePoint {
  date: string | Date;
  price: number;
}

// ✅ UPDATED: Custom Tooltip uses Primary Color
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#111] backdrop-blur-md text-white p-3 rounded-lg shadow-2xl border border-[#333] text-xs">
        <p className="font-bold text-[#666] mb-1">{label}</p>
        <p className="text-primary font-black text-lg">
          ${payload[0].value.toFixed(2)}
        </p>
      </div>
    );
  }
  return null;
};

export default function PriceChart({ history }: { history: any[] }) {
  const hasEnoughData = history && history.length > 1;

  if (!hasEnoughData) {
    return (
      // ✅ UPDATED: Themed Empty State
      <div className="h-full w-full flex flex-col items-center justify-center bg-[#1a1a1a] rounded-2xl border border-dashed border-[#333] p-6 text-center">
        <div className="w-12 h-12 bg-[#222] rounded-full flex items-center justify-center mb-3 border border-[#333]">
            <span className="text-xl opacity-50">📊</span>
        </div>
        <p className="text-white font-bold text-sm">Awaiting Data Points</p>
        <p className="text-xs text-[#666] mt-1 max-w-[200px]">
          We need a few more price updates to generate a trajectory graph.
        </p>
      </div>
    );
  }

  const data = [...history]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(h => ({
      date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: h.price
    }));

  return (
    <div className="h-full w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
          <defs>
            {/* ✅ DYNAMIC GRADIENT: Uses CSS variable */}
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          
          {/* ✅ DARK MODE GRID */}
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" />
          
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 10, fill: '#555' }} 
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            minTickGap={30} 
          />
          
          <YAxis 
            domain={['auto', 'auto']} 
            tick={{ fontSize: 10, fill: '#555' }} 
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `$${val}`}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Area 
            type="monotone" 
            dataKey="price" 
            // ✅ DYNAMIC STROKE & FILL
            stroke="var(--primary)" 
            strokeWidth={3} 
            fillOpacity={1} 
            fill="url(#colorPrice)" 
            activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--primary)' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}