'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';

export default function ReviewsManager() {
  const [data, setData] = useState<any>({ products: [], reviews: [] });
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [spamIds, setSpamIds] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  // 1. Fetch Data
  const loadData = async () => {
    try {
      const res = await fetch(`/api/admin/reviews?t=${Date.now()}`);
      const d = await res.json();
      setData(d);
    } catch (e) {
      console.error("Failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // 2. Heuristic "AI" Spam Detection Logic
  const runSpamCheck = () => {
    setIsScanning(true);
    setTimeout(() => {
        const suspiciousIds = data.reviews.filter((r: any) => {
            const text = r.comment.toLowerCase();
            const isTooShort = text.length < 5;
            const hasBadWords = text.includes('scam') || text.includes('fake') || text.includes('$$$');
            const isAllCaps = r.comment === r.comment.toUpperCase() && r.comment.length > 5;
            return isTooShort || hasBadWords || isAllCaps;
        }).map((r: any) => r.id);

        setSpamIds(suspiciousIds);
        setIsScanning(false);
    }, 1500); // Fake a 1.5s "processing" delay for effect
  };

  // 3. Delete Logic
  const handleDelete = async (id: string) => {
    if (!confirm("Permanently delete this review?")) return;
    
    // Optimistic Update
    setData((prev: any) => ({
        ...prev,
        reviews: prev.reviews.filter((r: any) => r.id !== id)
    }));

    await fetch(`/api/admin/reviews?id=${id}`, { method: 'DELETE' });
  };

  // 4. Filtering Logic
  const filteredReviews = useMemo(() => {
    let list = data.reviews;
    if (selectedProductId) {
        list = list.filter((r: any) => r.productId === selectedProductId);
    }
    return list;
  }, [data.reviews, selectedProductId]);

  if (loading) return <div className="p-20 text-center text-[#444] animate-pulse">Loading Review Hub...</div>;

  return (
    <main className="min-h-screen bg-[#111] p-8 font-sans h-screen flex flex-col">
      
      {/* HEADER */}
      <div className="flex justify-between items-end mb-8 shrink-0">
        <div>
           <h1 className="text-3xl font-black text-white tracking-tighter">Review Intelligence</h1>
           <p className="text-[#666] font-medium">Manage, moderate, and analyze user feedback.</p>
        </div>
        <div className="flex gap-3">
             {/* SPAM BUTTON */}
             <button 
                onClick={runSpamCheck}
                disabled={isScanning}
                className={`px-5 py-2 rounded-lg font-bold uppercase text-xs tracking-wider transition-all flex items-center gap-2 ${spamIds.length > 0 ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'bg-[#222] text-[#888] hover:bg-[#333] hover:text-white border border-[#333]'}`}
             >
                {isScanning ? (
                    <>
                        <div className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                        Scanning Content...
                    </>
                ) : (
                    <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        {spamIds.length > 0 ? `${spamIds.length} Issues Detected` : 'Run AI Spam Check'}
                    </>
                )}
             </button>
             
             <button onClick={() => loadData()} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg font-bold uppercase text-xs tracking-widest shadow-lg shadow-blue-900/20">
                Refresh
             </button>
        </div>
      </div>

      <div className="flex flex-1 gap-8 min-h-0">
         
         {/* LEFT SIDEBAR: PRODUCT LIST */}
         <div className="w-1/4 bg-[#1a1a1a] border border-[#333] rounded-2xl overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-[#333] bg-[#222]">
                <h3 className="text-[#888] text-xs font-black uppercase tracking-widest">Products ({data.products.length})</h3>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                <button 
                    onClick={() => setSelectedProductId(null)}
                    className={`w-full text-left p-3 rounded-xl flex justify-between items-center transition-all ${!selectedProductId ? 'bg-blue-600 text-white shadow-lg' : 'text-[#888] hover:bg-[#222] hover:text-white'}`}
                >
                    <span className="font-bold text-sm">All Reviews</span>
                    <span className="bg-black/20 px-2 py-0.5 rounded text-xs font-mono">{data.reviews.length}</span>
                </button>
                
                {data.products.map((p: any) => (
                    <button 
                        key={p.id}
                        onClick={() => setSelectedProductId(p.id)}
                        className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all ${selectedProductId === p.id ? 'bg-blue-600 text-white shadow-lg' : 'text-[#888] hover:bg-[#222] hover:text-white'}`}
                    >
                        <div className="w-8 h-8 rounded bg-black/40 relative overflow-hidden flex-shrink-0 border border-white/10">
                            {p.image && <Image src={p.image} alt="" fill className="object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm truncate">{p.title}</div>
                        </div>
                        <span className="bg-black/20 px-2 py-0.5 rounded text-xs font-mono">{p.count}</span>
                    </button>
                ))}
            </div>
         </div>

         {/* RIGHT MAIN: REVIEWS TABLE */}
         <div className="w-3/4 bg-[#1a1a1a] border border-[#333] rounded-2xl overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-[#333] bg-[#222] flex justify-between items-center">
                <h3 className="text-[#888] text-xs font-black uppercase tracking-widest">
                    {selectedProductId ? 'Product Feed' : 'Global Feed'}
                </h3>
                <span className="text-[#444] text-xs font-bold uppercase">{filteredReviews.length} entries</span>
            </div>

            <div className="overflow-y-auto flex-1 custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#1a1a1a] z-10 shadow-sm">
                        <tr className="text-[#555] text-[10px] font-black uppercase tracking-widest border-b border-[#333]">
                            <th className="p-4 w-20">Rating</th>
                            <th className="p-4">Comment</th>
                            <th className="p-4 w-32">Date</th>
                            <th className="p-4 w-20 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#333]">
                        {filteredReviews.length === 0 ? (
                            <tr><td colSpan={4} className="p-10 text-center text-[#444]">No reviews found.</td></tr>
                        ) : filteredReviews.map((review: any) => {
                            const isSpam = spamIds.includes(review.id);
                            return (
                                <tr key={review.id} className={`group transition-colors ${isSpam ? 'bg-red-900/10 hover:bg-red-900/20' : 'hover:bg-[#222]'}`}>
                                    <td className="p-4 align-top">
                                        <div className={`flex items-center gap-1 font-bold ${review.rating >= 4 ? 'text-green-500' : review.rating >= 3 ? 'text-yellow-500' : 'text-red-500'}`}>
                                            <span className="text-lg">★</span> {review.rating}
                                        </div>
                                    </td>
                                    <td className="p-4 align-top">
                                        {/* Spam Badge */}
                                        {isSpam && (
                                            <div className="mb-2 inline-flex items-center gap-2 bg-red-500/20 border border-red-500/50 text-red-400 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                Potential Spam
                                            </div>
                                        )}
                                        <p className="text-gray-300 text-sm leading-relaxed mb-1">{review.comment}</p>
                                        <p className="text-[#555] text-xs font-medium flex items-center gap-2">
                                            on <span className="text-[#777]">{review.product?.title || 'Unknown Product'}</span>
                                        </p>
                                    </td>
                                    <td className="p-4 align-top text-[#666] text-xs font-mono">
                                        {new Date(review.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 align-top text-right">
                                        <button 
                                            onClick={() => handleDelete(review.id)}
                                            className="text-[#555] hover:text-red-500 hover:bg-[#333] p-2 rounded-lg transition-colors"
                                            title="Delete Review"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
         </div>
      </div>
    </main>
  );
}