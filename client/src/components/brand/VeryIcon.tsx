import React, { useId } from "react";

interface VeryIconProps {
  size?: number;
  className?: string;
}

export const VeryIcon: React.FC<VeryIconProps> = ({ 
  size = 40, 
  className = "" 
}) => {
  const gradientId = useId();
  
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EC4899" stopOpacity="1" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="1" />
        </linearGradient>
      </defs>
      
      {/* Speech bubble shape */}
      <path
        d="M8 4C5.79086 4 4 5.79086 4 8V24C4 26.2091 5.79086 28 8 28H16L20 32L24 28H32C34.2091 28 36 26.2091 36 24V8C36 5.79086 34.2091 4 32 4H8Z"
        fill={`url(#${gradientId})`}
      />
      
      {/* White V letter */}
      <path
        d="M14 12L20 20L26 12H23L20 16.5L17 12H14Z"
        fill="white"
      />
      
      {/* Speech bubble tail */}
      <path
        d="M16 28L20 32L24 28H16Z"
        fill={`url(#${gradientId})`}
      />
    </svg>
  );
};

