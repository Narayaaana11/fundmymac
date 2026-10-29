import React from 'react';

interface ShinyTextProps {
  text: string;
  className?: string;
  speed?: number; // seconds
}

export const ShinyText: React.FC<ShinyTextProps> = ({
  text,
  className = '',
  speed = 4
}) => {
  return (
    <span
      className={`shiny-text-inline ${className}`}
      style={{
        animationDuration: `${speed}s`
      }}
    >
      {text}
    </span>
  );
};
