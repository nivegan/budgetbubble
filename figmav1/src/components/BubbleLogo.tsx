interface BubbleLogoProps {
  size?: number;
}

export function BubbleLogo({ size = 40 }: BubbleLogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Large bubble */}
      <circle cx="40" cy="35" r="30" fill="#69d2bb" opacity="0.3" />
      <circle cx="40" cy="35" r="28" fill="#69d2bb" stroke="#5bc4ab" strokeWidth="3" />
      
      {/* Large bubble highlight - curved shine */}
      <path
        d="M 25 22 Q 30 18, 38 20 Q 42 21, 45 26"
        stroke="white"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        opacity="0.6"
      />
      
      {/* Large bubble small highlight */}
      <circle cx="50" cy="28" r="4" fill="white" opacity="0.5" />
      
      {/* Medium bubble */}
      <circle cx="68" cy="65" r="22" fill="#69d2bb" opacity="0.3" />
      <circle cx="68" cy="65" r="20" fill="#69d2bb" stroke="#5bc4ab" strokeWidth="2.5" />
      
      {/* Medium bubble highlight */}
      <path
        d="M 58 56 Q 61 53, 66 54 Q 69 55, 71 58"
        stroke="white"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.6"
      />
      
      {/* Medium bubble small highlight */}
      <circle cx="75" cy="60" r="3" fill="white" opacity="0.5" />
      
      {/* Small bubble */}
      <circle cx="75" cy="25" r="15" fill="#69d2bb" opacity="0.3" />
      <circle cx="75" cy="25" r="13.5" fill="#69d2bb" stroke="#5bc4ab" strokeWidth="2" />
      
      {/* Small bubble highlight */}
      <path
        d="M 68 18 Q 70 16, 73 17 Q 75 18, 76 20"
        stroke="white"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        opacity="0.6"
      />
      
      {/* Small bubble tiny highlight */}
      <circle cx="79" cy="21" r="2" fill="white" opacity="0.5" />
    </svg>
  );
}
