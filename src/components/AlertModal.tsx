'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface AlertModalProps {
  product: any;
  currentPrice?: number; 
  isOpen: boolean;
  onClose: () => void;
}

export default function AlertModal({ product, currentPrice, isOpen, onClose }: AlertModalProps) {
  const [mounted, setMounted] = useState(false);

  // 1. Wait for mount to access 'document'
  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = 'hidden'; // Lock scroll
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // Don't render until client-side matches
  if (!isOpen || !mounted) return null;

  const salePrice = currentPrice 
    || product?.minPrice 
    || product?.listings?.[0]?.price 
    || 0;

  const regularPrice = product?.maxRegularPrice 
    || product?.listings?.[0]?.originalPrice 
    || salePrice;

  const [email, setEmail] = useState('');
  const [targetPrice, setTargetPrice] = useState(salePrice);
  const [status, setStatus] = useState('IDLE'); 

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('LOADING');
    
    try {
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

  // 2. SAFE PORTAL RENDER
  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
      
      {/* LAYER 1: The Backdrop (z-10) */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm z-10" 
        onClick={onClose}
      />

      {/* LAYER 2: The Content (z-20) - Must be higher than backdrop */}
      <div className="relative z-20 bg-[#222222] rounded-3xl w-full max-w-lg overflow-hidden border border-[#333] p-8 text-center shadow-2xl shadow-black/50">
        
        <button 
          onClick={onClose} 
          className="absolute top-4 right-5 text-[#666] hover:text-white text-2xl font-bold transition-colors z-50"
        >
          ✕
        </button>

        <h2 className="text-2xl font-extrabold text-white mb-2 tracking-tight">
          {product.title}
        </h2>
        <p className="text-[#aaaaaa] mb-6 text-sm">
          Adjust the slider below to set an email price alert!
        </p>

        {/* Price Display */}
        <div className="text-lg font-bold text-red-400 mb-6 bg-red-900/20 py-3 rounded-xl border border-red-900/30">
          Regular: ${regularPrice.toFixed(2)} 
          <span className="text-[#444] mx-3">|</span> 
          Current: ${salePrice.toFixed(2)}
        </div>

        {/* Slider Section */}
        <div className="mb-8 px-2">
          <input 
            type="range" 
            min={0} 
            max={regularPrice * 1.1} 
            step={1}
            value={targetPrice} 
            onChange={(e) => setTargetPrice(Number(e.target.value))}
            className="w-full h-3 bg-[#1a1a1a] rounded-lg appearance-none cursor-pointer accent-blue-600 border border-[#333]"
          />
          <div className="mt-5 text-2xl font-black text-white">
            Alert me at: <span className="text-blue-500">${targetPrice.toFixed(2)}</span>
          </div>
        </div>

        {/* Status / Form */}
        {status === 'SUCCESS' ? (
          <div className="bg-green-900/30 border border-green-800 text-green-400 p-5 rounded-2xl font-bold flex flex-col items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 4.365-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
            </svg>
            <span>Alert Set! Check your inbox soon.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input 
              type="email" 
              required
              placeholder="Enter your email"
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-4 text-base text-white placeholder-[#666] focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
            
            <button 
              disabled={status === 'LOADING'}
              className="w-full bg-blue-600 text-white font-black text-lg py-4 rounded-full hover:bg-blue-700 transition shadow-lg shadow-blue-900/20 disabled:bg-[#333] disabled:text-[#666] disabled:cursor-not-allowed uppercase tracking-widest"
            >
              {status === 'LOADING' ? 'SECURELY SAVING...' : 'ACTIVATE ALERT'}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}