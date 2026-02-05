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
  // --- 1. CALCULATE VALUES FIRST (Safe logic) ---
  const salePrice = currentPrice 
    || product?.minPrice 
    || product?.listings?.[0]?.price 
    || 0;

  const regularPrice = product?.maxRegularPrice 
    || product?.listings?.[0]?.originalPrice 
    || salePrice;

  // --- 2. DEFINE ALL HOOKS UNCONDITIONALLY ---
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [targetPrice, setTargetPrice] = useState(salePrice);
  const [status, setStatus] = useState('IDLE'); 

  // Initialize/Reset price when modal opens
  useEffect(() => {
    if (isOpen) {
        setTargetPrice(salePrice);
    }
  }, [isOpen, salePrice]);

  // Handle side effects (Body scroll lock)
  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = 'hidden'; 
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

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

  // --- 3. CONDITIONAL RENDER ---
  if (!isOpen || !mounted) return null;

  // --- 4. RENDER PORTAL ---
  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
      
      {/* LAYER 1: The Dark Overlay */}
      <div 
        className="fixed inset-0 bg-black opacity-90" 
        onClick={onClose}
      ></div>

      {/* LAYER 2: The Modal Content */}
      <div className="relative bg-[#1a1a1a] rounded-3xl w-full max-w-lg border border-[#333] p-8 text-center shadow-2xl">
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-5 text-[#666] hover:text-white text-2xl font-bold transition-colors"
        >
          ✕
        </button>

        {/* Header */}
        <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
          {product.title}
        </h2>
        <p className="text-[#888] mb-6 text-sm font-medium">
          Adjust the slider below to set an email price alert!
        </p>

        {/* Price Display */}
        <div className="text-sm font-bold text-red-400 mb-6 bg-red-900/10 py-3 rounded-xl border border-red-900/20">
          Regular: ${regularPrice.toFixed(2)} 
          <span className="text-[#333] mx-3">|</span> 
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
            // ✅ DYNAMIC SLIDER ACCENT
            className="w-full h-2 bg-[#111] rounded-lg appearance-none cursor-pointer accent-primary border border-[#333]"
          />
          <div className="mt-5 text-2xl font-black text-white">
            {/* ✅ DYNAMIC TEXT COLOR */}
            Alert me at: <span className="text-primary">${targetPrice.toFixed(2)}</span>
          </div>
        </div>

        {/* Form Logic */}
        {status === 'SUCCESS' ? (
          <div className="bg-green-900/20 border border-green-900/50 text-green-400 p-5 rounded-2xl font-bold flex flex-col items-center gap-2">
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
              // ✅ DYNAMIC FOCUS RING
              className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-4 text-base text-white placeholder-[#555] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
            
            <button 
              disabled={status === 'LOADING'}
              // ✅ DYNAMIC BUTTON COLOR
              className="w-full bg-primary text-white font-black text-lg py-4 rounded-full hover:opacity-90 transition shadow-lg shadow-primary/20 disabled:bg-[#333] disabled:text-[#666] disabled:cursor-not-allowed uppercase tracking-widest"
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