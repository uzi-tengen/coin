import React from 'react';

export const CoinIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="12" cy="12" r="10" />
      <text x="12" y="17" fontSize="12" fill="#1e140a" textAnchor="middle" style={{ fontFamily: '"Press Start 2P", sans-serif', fontWeight: 'bold' }}>$</text>
    </svg>
);
