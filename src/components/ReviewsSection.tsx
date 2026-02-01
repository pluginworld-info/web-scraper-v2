'use client';

import { useState } from 'react';

// Mock Data (Replace with real DB data via props later)
const MOCK_REVIEWS = [
  { id: 1, user: "Alex P.", rating: 5, date: "2 days ago", comment: "Absolutely essential for any producer. The workflow is unmatched." },
  { id: 2, user: "Sarah M.", rating: 4, date: "1 week ago", comment: "Great sound, but a bit CPU heavy on older machines." },
];

export default function ReviewsSection({ productId }: { productId: string }) {
  const [rating, setRating] = useState(0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-16">
      <div className="flex items-center justify-between mb-8">
         <h3 className="font-black text-lg uppercase tracking-widest text-gray-800">User Reviews</h3>
         <button className="text-sm font-bold text-blue-600 hover:underline">Write a Review</button>
      </div>

      {/* Review List */}
      <div className="space-y-8 mb-10">
        {MOCK_REVIEWS.map((review) => (
          <div key={review.id} className="border-b border-gray-100 last:border-0 pb-8 last:pb-0">
            <div className="flex items-center justify-between mb-2">
               <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-xs text-gray-500">
                    {review.user.charAt(0)}
                 </div>
                 <span className="font-bold text-sm text-gray-900">{review.user}</span>
               </div>
               <span className="text-xs text-gray-400 font-medium">{review.date}</span>
            </div>
            <div className="flex text-yellow-400 mb-2">
               {[...Array(5)].map((_, i) => (
                  <svg key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-gray-200 fill-current'}`} viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
               ))}
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>
          </div>
        ))}
      </div>

      {/* Write Review Form (Visual Only) */}
      <div className="bg-gray-50 rounded-xl p-6">
         <h4 className="font-bold text-sm text-gray-900 mb-4">Add your rating</h4>
         <div className="flex gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
               <button 
                 key={star} 
                 onClick={() => setRating(star)}
                 className={`w-8 h-8 ${rating >= star ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400 transition-colors`}
               >
                 <svg className="w-full h-full fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
               </button>
            ))}
         </div>
         <textarea 
           className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none mb-4" 
           rows={3}
           placeholder="Share your experience with this plugin..."
         ></textarea>
         <button className="bg-black text-white px-6 py-2 rounded-lg text-sm font-bold uppercase hover:bg-gray-800 transition">
           Submit Review
         </button>
      </div>
    </div>
  );
}