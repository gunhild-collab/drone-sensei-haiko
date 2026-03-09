export default function HaikoLogo({ className }: { className?: string }) {
  return (
    <svg width="120" height="36" viewBox="0 0 120 36" className={className} style={{ minHeight: 36 }}>
      <defs>
        <linearGradient id="hg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff66c4"/>
          <stop offset="100%" stopColor="#6858f8"/>
        </linearGradient>
      </defs>
      <polygon points="16,4 30,16 28,16 28,28 20,28 20,20 12,20 12,28 4,28 4,16 2,16" fill="url(#hg)"/>
      <rect x="11" y="20" width="10" height="9" fill="url(#hg)" opacity="0.6"/>
      <text x="36" y="26" fontFamily="Poppins, sans-serif" fontWeight="700" fontSize="22" fill="#1c0059">haiko</text>
    </svg>
  );
}
