'use client';
import { useState } from 'react';

export default function AlertModal({ product, isOpen, onClose }: any) {
  if (!isOpen) return null;

  // 1. Get Prices
  // Note: Since our DB currently only has 'price' (sale price), 
  // we estimate a "Regular" price for the UI demo. 
  // Later, we can add an 'originalPrice' field to the schema.
  const salePrice = product.listings[0]?.price || 0;
  const regularPrice = salePrice * 1.5; // Placeholder logic
  
  const [email, setEmail] = useState('');
  const [targetPrice, setTargetPrice] = useState(salePrice);
  const [status, setStatus] = useState('IDLE'); // IDLE, LOADING, SUCCESS

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('LOADING');
    
    // Simulate API Call (We will connect this to your mailer.ts logic later)
    console.log(`🔔 Creating Alert: ${email} wants ${product.title} at $${targetPrice}`);
    await new Promise(r => setTimeout(r, 1500));
    
    setStatus('SUCCESS');
    setTimeout(() => {
      setStatus('IDLE');
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
      {/* Modal Container */}
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative border border-gray-100 p-8 text-center">
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-5 text-gray-400 hover:text-gray-900 text-2xl font-bold"
        >
          ✕
        </button>

        {/* Header */}
        <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
          {product.title}
        </h2>
        <p className="text-gray-500 mb-6">
          Adjust the slider below to set an email price alert!
        </p>

        {/* Price Display (Red Text like Screenshot) */}
        <div className="text-xl font-bold text-red-600 mb-6">
          Regular: $ {regularPrice.toFixed(2)} <span className="text-gray-300 mx-2">|</span> Sale: $ {salePrice.toFixed(2)}
        </div>

        {/* The Slider */}
        <div className="mb-6 px-2">
          <input 
            type="range" 
            min={0} 
            max={regularPrice} 
            step={1}
            value={targetPrice} 
            onChange={(e) => setTargetPrice(Number(e.target.value))}
            className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
          <div className="mt-4 text-xl font-bold text-red-700">
            Alert me when price is: {targetPrice.toFixed(2)}
          </div>
        </div>

        {/* Form Area */}
        {status === 'SUCCESS' ? (
          <div className="bg-green-100 text-green-800 p-4 rounded-xl font-bold animate-pulse">
            ✅ Alert Set! Check your inbox.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input 
              type="email" 
              required
              placeholder="Your email address"
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            />
            
            <button 
              disabled={status === 'LOADING'}
              className="w-full bg-black text-white font-bold text-lg py-4 rounded-full hover:bg-gray-800 transition shadow-lg disabled:opacity-50"
            >
              {status === 'LOADING' ? 'Submitting...' : 'Submit Alert'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}