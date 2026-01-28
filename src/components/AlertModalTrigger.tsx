'use client';

import { useState } from 'react';

interface AlertProps {
  product: {
    title: string;
    listings: { url: string; price: number }[];
  };
}

export default function AlertModalTrigger({ product }: AlertProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Use the best available URL (listing with lowest price, or just the first one)
  const productUrl = product.listings[0]?.url || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const res = await fetch('/api/alerts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_title: product.title,
          product_url: productUrl,
          target_price: parseFloat(targetPrice),
          email: email
        })
      });

      if (!res.ok) throw new Error('Failed to create alert');

      setStatus('success');
      setTimeout(() => {
        setIsOpen(false);
        setStatus('idle');
        setEmail('');
        setTargetPrice('');
      }, 2000);

    } catch (err) {
      setStatus('error');
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2"
      >
        🔔 Set Alert
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full animate-in fade-in zoom-in duration-200">
            
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Set Price Alert</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <p className="text-gray-600 mb-4 text-sm">
              We will email you when <strong>{product.title}</strong> drops below your target price.
            </p>

            {status === 'success' ? (
              <div className="text-center py-8 text-green-600">
                <p className="text-4xl mb-2">✅</p>
                <p className="font-bold">Alert Set Successfully!</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Email</label>
                  <input 
                    type="email" 
                    required 
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Price ($)</label>
                  <input 
                    type="number" 
                    required 
                    step="0.01"
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    value={targetPrice}
                    onChange={e => setTargetPrice(e.target.value)}
                    placeholder="29.99"
                  />
                </div>

                {status === 'error' && <p className="text-red-500 text-sm">Something went wrong. Please try again.</p>}

                <button 
                  type="submit" 
                  disabled={status === 'loading'}
                  className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {status === 'loading' ? 'Saving...' : 'Create Alert'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}