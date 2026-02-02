'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        // Success: Redirect to Dashboard
        router.push('/admin');
        router.refresh(); // Refresh middleware state
      } else {
        setError('Invalid Security PIN');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#111] border border-[#333] rounded-2xl p-8 shadow-2xl">
        
        {/* Header */}
        <div className="text-center mb-8">
           <div className="w-12 h-12 bg-blue-600 rounded-xl mx-auto flex items-center justify-center font-black text-2xl text-white mb-4 shadow-lg shadow-blue-900/40">
             P
           </div>
           <h1 className="text-xl font-bold text-white tracking-tight">Admin Access</h1>
           <p className="text-[#666] text-sm mt-2">Enter your security PIN to continue.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
           <div className="relative">
             <input
               type="password"
               value={password}
               onChange={(e) => setPassword(e.target.value)}
               placeholder="Security PIN"
               className="w-full bg-[#1a1a1a] border border-[#333] text-white text-center text-lg tracking-[0.5em] font-bold rounded-xl py-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:tracking-normal placeholder:font-normal placeholder:text-[#444]"
               autoFocus
             />
           </div>

           {error && (
             <div className="text-red-500 text-xs text-center font-bold bg-red-900/10 py-2 rounded-lg border border-red-900/20">
               {error}
             </div>
           )}

           <button
             disabled={loading || !password}
             className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
           >
             {loading ? 'Verifying...' : 'Unlock Dashboard'}
           </button>
        </form>

        <p className="text-center text-[#333] text-xs mt-8">
          Restricted Area. Authorized Personnel Only.
        </p>
      </div>
    </div>
  );
}