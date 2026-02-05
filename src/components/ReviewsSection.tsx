'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ReviewsSection({ productId, reviews }: { productId: string, reviews: any[] }) {
  const router = useRouter();
  
  // Form State
  const [rating, setRating] = useState(0);
  const [authorName, setAuthorName] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return alert("Please select a star rating.");
    
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/reviews/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          rating,
          comment,
          authorName: authorName.trim() || 'Guest'
        })
      });

      if (!res.ok) throw new Error('Failed to submit');

      setRating(0);
      setComment('');
      setAuthorName('');
      setShowForm(false);
      
      router.refresh(); 

    } catch (error) {
      alert("Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#1a1a1a] rounded-2xl shadow-xl border border-white/5 p-8 mb-16">
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
         <h3 className="font-black text-sm uppercase tracking-widest text-[#888]">
            User Reviews ({reviews.length})
         </h3>
         <button 
           onClick={() => setShowForm(!showForm)}
           // ✅ DYNAMIC: Text color uses Primary brand color
           className={`text-sm font-black uppercase tracking-wider transition-colors ${showForm ? 'text-red-500' : 'text-primary hover:opacity-80'}`}
         >
           {showForm ? 'Cancel' : 'Write a Review'}
         </button>
      </div>

      {/* REVIEW LIST */}
      <div className="space-y-8 mb-10">
        {reviews.length === 0 ? (
           <p className="text-[#555] italic text-sm">No reviews yet. Be the first to review!</p>
        ) : (
           reviews.map((review) => (
            <div key={review.id} className="border-b border-white/5 last:border-0 pb-8 last:pb-0">
              <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-3">
                   {/* ✅ DYNAMIC: Avatar border uses Primary */}
                   <div className="w-8 h-8 rounded-full bg-[#111] flex items-center justify-center font-bold text-xs text-white border border-primary/20">
                      {review.authorName ? review.authorName.charAt(0).toUpperCase() : 'G'}
                   </div>
                   <span className="font-bold text-sm text-white">
                      {review.authorName || "Guest"}
                   </span>
                 </div>
                 <span className="text-[10px] text-[#555] font-black uppercase tracking-tighter">
                    {new Date(review.createdAt).toLocaleDateString()}
                 </span>
              </div>
              
              <div className="flex text-yellow-500 mb-2">
                 {[...Array(5)].map((_, i) => (
                    <svg key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-current' : 'text-[#333] fill-current'}`} viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                 ))}
              </div>
              
              <p className="text-[#888] text-sm leading-relaxed">{review.comment}</p>
            </div>
           ))
        )}
      </div>

      {/* WRITE REVIEW FORM (Toggleable) */}
      {showForm && (
        <div className="bg-[#111] rounded-2xl p-6 border border-white/5 animate-in slide-in-from-top-2 duration-300">
           <h4 className="font-black text-[10px] text-[#555] mb-4 uppercase tracking-[0.2em]">Add your rating</h4>
           
           {/* Star Input */}
           <div className="flex gap-2 mb-6">
             {[1, 2, 3, 4, 5].map((star) => (
                <button 
                  key={star} 
                  onClick={() => setRating(star)}
                  className={`w-8 h-8 ${rating >= star ? 'text-yellow-500' : 'text-[#333]'} hover:text-yellow-400 transition-colors`}
                >
                  <svg className="w-full h-full fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                </button>
             ))}
           </div>

           {/* Name Input */}
           <input 
             type="text"
             value={authorName}
             onChange={(e) => setAuthorName(e.target.value)}
             placeholder="Your Name (Optional)"
             // ✅ DYNAMIC: Focus ring uses Primary brand color
             className="w-full bg-[#1a1a1a] border border-white/5 rounded-xl p-4 text-sm text-white placeholder-[#444] focus:ring-2 focus:ring-primary outline-none mb-4 transition-all"
           />

           {/* Comment Input */}
           <textarea 
             value={comment}
             onChange={(e) => setComment(e.target.value)}
             className="w-full bg-[#1a1a1a] border border-white/5 rounded-xl p-4 text-sm text-white placeholder-[#444] focus:ring-2 focus:ring-primary outline-none mb-6 transition-all" 
             rows={4}
             placeholder="Share your experience with this plugin..."
           ></textarea>
           
           <button 
             onClick={handleSubmit}
             disabled={isSubmitting}
             // ✅ DYNAMIC: Button uses Primary brand color
             className="bg-primary text-white px-6 py-4 rounded-full text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all w-full disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
           >
             {isSubmitting ? 'Submitting...' : 'Post Review'}
           </button>
        </div>
      )}
    </div>
  );
}