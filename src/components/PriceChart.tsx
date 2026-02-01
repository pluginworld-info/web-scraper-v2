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

// Custom Tooltip Component for a sleek look
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900/95 backdrop-blur-sm text-white p-3 rounded-lg shadow-xl border border-gray-700 text-xs">
        <p className="font-bold mb-1">{label}</p>
        <p className="text-blue-400 font-black text-lg">
          ${payload[0].value.toFixed(2)}
        </p>
      </div>
    );
  }
  return null;
};

export default function PriceChart({ history }: { history: any[] }) {
  // Logic: We need at least 2 points to draw a line. 
  const hasEnoughData = history && history.length > 1;

  if (!hasEnoughData) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200 p-6 text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
            <span className="text-xl opacity-50">📊</span>
        </div>
        <p className="text-gray-900 font-bold text-sm">Not enough data yet</p>
        <p className="text-xs text-gray-500 mt-1 max-w-[200px]">
          We need a few more price updates to generate a trajectory graph.
        </p>
      </div>
    );
  }

  // Format data: Sort by date ASC, then format string
  const data = [...history]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(h => ({
      // Format: "Jan 24"
      date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: h.price
    }));

  return (
    <div className="h-full w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
          {/* We use standard HTML/SVG tags here, no import needed */}
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
          
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 10, fill: '#9ca3af' }} 
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            minTickGap={30} 
          />
          
          <YAxis 
            domain={['auto', 'auto']} 
            tick={{ fontSize: 10, fill: '#9ca3af' }} 
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `$${val}`}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Area 
            type="monotone" 
            dataKey="price" 
            stroke="#2563eb" 
            strokeWidth={3} 
            fillOpacity={1} 
            fill="url(#colorPrice)" 
            activeDot={{ r: 6, strokeWidth: 0, fill: '#2563eb' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
} 