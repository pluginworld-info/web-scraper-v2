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
    // Send beacon (fire and forget)
    // We check for window to ensure we are on client
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
      }).catch(err => console.error("Tracking failed", err)); // Silently fail if tracker is down
    }
  };

  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
      onClick={handleClick}
      className={className}
    >
      {children}
    </a>
  );
}