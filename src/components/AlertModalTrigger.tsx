'use client';

import { useState } from 'react';
import AlertModal from './AlertModal'; 

interface AlertProps {
  product: {
    title: string;
    listings: { url: string; price: number; originalPrice?: number }[];
  };
  isSmall?: boolean; // ✅ Added prop to toggle between Grid style and Product Page style
}

export default function AlertModalTrigger({ product, isSmall }: AlertProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* 1. THE TRIGGER BUTTON */}
      <button 
        onClick={() => setIsOpen(true)}
        className={
          isSmall 
            ? "flex items-center justify-center gap-1.5 bg-white hover:bg-gray-100 text-black text-[10px] font-black py-2.5 px-4 rounded-full transition-colors shadow-sm tracking-tighter w-full" 
            : "flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 px-6 py-3 rounded-xl font-bold transition shadow-sm border border-gray-200"
        }
      >
        {/* Simple Bell Icon */}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={isSmall ? "w-3.5 h-3.5" : "w-5 h-5"}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {isSmall ? "SET ALERT" : "Set Alert"}
      </button>

      {/* 2. THE SEPARATE MODAL COMPONENT */}
      <AlertModal 
        product={product} 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </>
  );
}