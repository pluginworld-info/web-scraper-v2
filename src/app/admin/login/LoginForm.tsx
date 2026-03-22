'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Turnstile } from '@marsidev/react-turnstile';

export default function LoginForm({ siteKey }: { siteKey: string }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  // 🔍 DIAGNOSTIC LOG: Now checks the prop passed from the server
  useEffect(() => {
    if (!siteKey) {
      console.error("🚨 [DEBUG] TURNSTILE_SITE_KEY is missing. Check Cloud Run variables.");
      fetch('/api/admin/auth', { 
        method: 'POST', 
        body: JSON.stringify({ debug_issue: "Missing Site Key on Frontend" }) 
      }).catch(() => {});
    } else {
      console.log("✅ [DEBUG] Turnstile Site Key injected successfully at runtime.");
    }
  }, [siteKey]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Block if Turnstile isn't ready
    if (!token) {
      setError("Please complete the security check.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          password,
          cf_token: token 
        }),
      });

      if (res.ok) {
        // ✅ Preserve your existing auth logic
        sessionStorage.setItem('admin_authenticated', 'true');
        window.dispatchEvent(new Event('admin-auth-change'));

        router.push('/admin');
        router.refresh(); 
      } else {
        const data = await res.json();
        setError(data.error || 'Invalid Security PIN');
        setToken(null); // Reset Turnstile on failure
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#111] border border-[#333] rounded-2xl p-8 shadow-2xl relative z-50">
        
        {/* Header */}
        <div className="text-center mb-8">
           <div className="w-12 h-12 bg-primary rounded-xl mx-auto flex items-center justify-center font-black text-2xl text-white mb-4 shadow-lg shadow-primary/40">
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
               className="w-full bg-[#1a1a1a] border border-[#333] text-white text-center text-lg tracking-[0.5em] font-bold rounded-xl py-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:tracking-normal placeholder:font-normal placeholder:text-[#444]"
               autoFocus
             />
           </div>

           {/* ⚡ CLOUDFLARE TURNSTILE WIDGET */}
           <div className="flex justify-center py-2 min-h-[65px]">
             {/* Only render if the server successfully passed the key */}
             {siteKey ? (
               <Turnstile 
                 siteKey={siteKey} 
                 onSuccess={(token) => setToken(token)}
                 onExpire={() => setToken(null)}
                 onError={() => setToken(null)}
                 options={{ theme: 'dark' }}
               />
             ) : (
               <div className="text-red-500 text-xs">Waiting for Security Module...</div>
             )}
           </div>

           {error && (
             <div className="text-red-500 text-xs text-center font-bold bg-red-900/10 py-2 rounded-lg border border-red-900/20">
               {error}
             </div>
           )}

           <button
             type="submit"
             disabled={loading || !password || !token}
             className="w-full bg-primary text-white font-bold py-4 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
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