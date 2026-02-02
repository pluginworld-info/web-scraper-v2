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

      // Reset Form
      setRating(0);
      setComment('');
      setAuthorName('');
      setShowForm(false);
      
      // Refresh the page data to show new review
      router.refresh(); 

    } catch (error) {
      alert("Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#222222] rounded-2xl shadow-sm border border-[#333] p-8 mb-16">
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
         <h3 className="font-black text-lg uppercase tracking-widest text-[#aaaaaa]">
            User Reviews ({reviews.length})
         </h3>
         <button 
           onClick={() => setShowForm(!showForm)}
           className="text-sm font-bold text-blue-500 hover:text-white transition-colors uppercase tracking-wider"
         >
           {showForm ? 'Cancel' : 'Write a Review'}
         </button>
      </div>

      {/* REVIEW LIST */}
      <div className="space-y-8 mb-10">
        {reviews.length === 0 ? (
           <p className="text-[#666] italic text-sm">No reviews yet. Be the first to review!</p>
        ) : (
           reviews.map((review) => (
            <div key={review.id} className="border-b border-[#333] last:border-0 pb-8 last:pb-0">
              <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2">
                   <div className="w-8 h-8 rounded-full bg-[#333] flex items-center justify-center font-bold text-xs text-white border border-[#444]">
                      {review.authorName ? review.authorName.charAt(0).toUpperCase() : 'G'}
                   </div>
                   <span className="font-bold text-sm text-white">
                      {review.authorName || "Guest"}
                   </span>
                 </div>
                 <span className="text-xs text-[#666] font-medium">
                    {new Date(review.createdAt).toLocaleDateString()}
                 </span>
              </div>
              
              <div className="flex text-yellow-500 mb-2">
                 {[...Array(5)].map((_, i) => (
                    <svg key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-[#444] fill-current'}`} viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                 ))}
              </div>
              
              <p className="text-[#aaaaaa] text-sm leading-relaxed">{review.comment}</p>
            </div>
           ))
        )}
      </div>

      {/* WRITE REVIEW FORM (Toggleable) */}
      {showForm && (
        <div className="bg-[#2a2a2a] rounded-xl p-6 border border-[#333] animate-in slide-in-from-top-2 duration-300">
           <h4 className="font-bold text-sm text-white mb-4 uppercase tracking-wider">Add your rating</h4>
           
           {/* Star Input */}
           <div className="flex gap-1 mb-6">
             {[1, 2, 3, 4, 5].map((star) => (
                <button 
                  key={star} 
                  onClick={() => setRating(star)}
                  className={`w-8 h-8 ${rating >= star ? 'text-yellow-500' : 'text-[#444]'} hover:text-yellow-400 transition-colors`}
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
             className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-3 text-sm text-white placeholder-[#666] focus:ring-2 focus:ring-blue-500 outline-none mb-3"
           />

           {/* Comment Input */}
           <textarea 
             value={comment}
             onChange={(e) => setComment(e.target.value)}
             className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-3 text-sm text-white placeholder-[#666] focus:ring-2 focus:ring-blue-500 outline-none mb-4" 
             rows={3}
             placeholder="Share your experience with this plugin..."
           ></textarea>
           
           <button 
             onClick={handleSubmit}
             disabled={isSubmitting}
             className="bg-blue-600 text-white border border-blue-500 px-6 py-3 rounded-lg text-sm font-black uppercase hover:bg-blue-700 transition w-full disabled:opacity-50 disabled:cursor-not-allowed"
           >
             {isSubmitting ? 'Submitting...' : 'Post Review'}
           </button>
        </div>
      )}
    </div>
  );
}