'use client';

import { useState, useCallback } from 'react';
import AlertModal from './AlertModal'; 

interface AlertProps {
  product: any;
  isSmall?: boolean;
  currentPrice?: number; // ✅ ADDED: Accepts the calculated price
}

export default function AlertModalTrigger({ product, isSmall, currentPrice }: AlertProps) {
  const [isOpen, setIsOpen] = useState(false);

  // HANDLER: Robust click handler
  const handleOpen = useCallback((e: React.MouseEvent) => {
    e.preventDefault();  
    e.stopPropagation(); 
    console.log("🔔 Opening Alert Modal for:", product?.title);
    setIsOpen(true);
  }, [product]);

  if (!product) return null;

  return (
    <>
      {/* 1. THE TRIGGER BUTTON (Dark Mode Styled) */}
      <button 
        onClick={handleOpen}
        className={
          isSmall 
            ? "flex items-center justify-center gap-1.5 bg-[#333] hover:bg-[#444] text-white text-[10px] font-black py-2.5 px-4 rounded-full transition-colors border border-[#444] tracking-tighter w-full" 
            : "flex items-center gap-2 bg-[#333] hover:bg-[#444] text-white px-6 py-3 rounded-xl font-bold transition border border-[#444]"
        }
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={isSmall ? "w-3.5 h-3.5" : "w-5 h-5"}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {isSmall ? "SET ALERT" : "Set Alert"}
      </button>

      {/* 2. THE MODAL */}
      {/* We pass the currentPrice down so the modal logic matches the page logic */}
      {isOpen && (
        <AlertModal 
          product={product} 
          currentPrice={currentPrice} // ✅ Pass it down
          isOpen={isOpen} 
          onClose={() => setIsOpen(false)} 
        />
      )}
    </>
  );
}