'use client';

interface PaintboxLogoProps {
  size?: 'mobile' | 'desktop' | 'large' | 'splash';
  priority?: boolean;
  className?: string;
  showText?: boolean;
}

export default function PaintboxLogo({
  size = 'desktop',
  className = '',
  priority = false,
  showText = false,
  ...props
}: PaintboxLogoProps) {
  const sizeClasses = {
    mobile: 'w-8 h-8',
    desktop: 'w-12 h-12',
    large: 'w-16 h-16',
    splash: 'w-24 h-24'
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`text-4xl ${sizeClasses[size]}`}>
        🎨
      </div>
      {showText && (
        <span className="text-xl font-bold text-gray-900">Paintbox</span>
      )}
    </div>
  );
}
