import React, { useRef, useState } from 'react';

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className = '',
  spotlightColor = 'rgba(0, 113, 227, 0.15)',
  onClick,
  style = {}
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`spotlight-card ${className}`}
      style={{
        ...style,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Dynamic Cursor Spotlight Layer */}
      {isHovered && (
        <div
          className="spotlight-layer"
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            inset: 0,
            background: `radial-gradient(circle 240px at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 80%)`,
            transition: 'opacity 0.2s ease',
            zIndex: 1
          }}
        />
      )}
      <div style={{ position: 'relative', zIndex: 2, height: '100%' }}>
        {children}
      </div>
    </div>
  );
};
