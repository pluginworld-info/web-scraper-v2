'use client';
import { useState } from 'react';

// Using a generic 'any' for now to match your project's current state, 
// though defining a proper interface is the "Stable" way to go.
export default function AlertModal({ product, isOpen, onClose }: any) {
  // 🔴 CRITICAL FIX: All hooks must be at the very top, before any 'return' or 'if'
  const salePrice = product?.lowestPrice || 0;
  
  // Use originalPrice from the DB, or fallback to salePrice if missing
  const bestListing = product?.listings?.[0];
  const regularPrice = bestListing?.originalPrice || salePrice;
  
  const [email, setEmail] = useState('');
  const [targetPrice, setTargetPrice] = useState(salePrice);
  const [status, setStatus] = useState('IDLE'); // IDLE, LOADING, SUCCESS

  // Now we can safely perform the early return for the build process
  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('LOADING');
    
    try {
      // 🔔 This will connect to your /api/alerts/create/route.ts endpoint
      const response = await fetch('/api/alerts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          targetPrice,
          productId: product.id,
          productTitle: product.title
        }),
      });

      if (response.ok) {
        setStatus('SUCCESS');
        setTimeout(() => {
          setStatus('IDLE');
          onClose();
        }, 2000);
      } else {
        throw new Error('Failed to set alert');
      }
    } catch (error) {
      console.error("Alert Error:", error);
      setStatus('IDLE');
      alert("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative border border-gray-100 p-8 text-center">
        
        <button 
          onClick={onClose} 
          className="absolute top-4 right-5 text-gray-400 hover:text-gray-900 text-2xl font-bold"
        >
          ✕
        </button>

        <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
          {product.title}
        </h2>
        <p className="text-gray-500 mb-6 text-sm">
          Adjust the slider below to set an email price alert!
        </p>

        {/* 🔴 UPDATED: Real Prices from DB with fallback */}
        <div className="text-lg font-bold text-red-600 mb-6 bg-red-50 py-3 rounded-xl border border-red-100">
          Regular: ${regularPrice.toFixed(2)} 
          <span className="text-gray-300 mx-3">|</span> 
          Sale: ${salePrice.toFixed(2)}
        </div>

        <div className="mb-8 px-2">
          <input 
            type="range" 
            min={0} 
            max={regularPrice} 
            step={1}
            value={targetPrice} 
            onChange={(e) => setTargetPrice(Number(e.target.value))}
            className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="mt-5 text-2xl font-black text-gray-900">
            Alert me at: <span className="text-blue-600">${targetPrice.toFixed(2)}</span>
          </div>
        </div>

        {status === 'SUCCESS' ? (
          <div className="bg-green-100 text-green-800 p-5 rounded-2xl font-bold animate-pulse">
            ✅ Alert Set! Check your inbox soon.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input 
              type="email" 
              required
              placeholder="Enter your email"
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
            
            <button 
              disabled={status === 'LOADING'}
              className="w-full bg-blue-600 text-white font-black text-lg py-4 rounded-full hover:bg-blue-700 transition shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed uppercase tracking-widest"
            >
              {status === 'LOADING' ? 'SECURELY SAVING...' : 'ACTIVATE ALERT'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}