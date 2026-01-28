'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function PriceChart({ history }: { history: any[] }) {
  // Logic: Need at least 5 data points over 3 days to show a meaningful graph
  const hasEnoughData = history.length > 5;

  if (!hasEnoughData) {
    return (
      <div className="h-64 flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
        <span className="text-4xl mb-2">📉</span>
        <p className="text-gray-500 font-medium">Gathering Price Data...</p>
        <p className="text-sm text-gray-400">Check back in a few days to see trends!</p>
      </div>
    );
  }

  // Format data for Recharts
  const data = history.map(h => ({
    date: new Date(h.date).toLocaleDateString(),
    price: h.price
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" hide />
          <YAxis domain={['auto', 'auto']} />
          <Tooltip 
            formatter={(value: any) => [`$${value}`, "Price"]}
            labelStyle={{ color: '#333' }}
          />
          <Line 
            type="monotone" 
            dataKey="price" 
            stroke="#2563eb" 
            strokeWidth={3} 
            dot={false} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}