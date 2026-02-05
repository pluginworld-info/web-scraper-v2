'use client';

interface TrackedLinkProps {
  url: string;
  productId: string;
  retailerId: string;
  className?: string;
  children: React.ReactNode;
}

export default function TrackedLink({ url, productId, retailerId, className, children }: TrackedLinkProps) {
  const handleClick = () => {
    if (typeof window !== 'undefined') {
       const guestId = localStorage.getItem('guest_user_id') || 'anonymous';
       
       fetch('/api/track/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          retailerId,
          guestId
        })
      }).catch(err => console.error("Tracking failed", err));
    }
  };

  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
      onClick={handleClick}
      // ✅ REFINED: Added "transition-all duration-300" 
      // This ensures that the dynamic primary/accent colors 
      // fade in/out smoothly when the user hovers.
      className={`transition-all duration-300 ease-in-out ${className}`}
    >
      {children}
    </a>
  );
}