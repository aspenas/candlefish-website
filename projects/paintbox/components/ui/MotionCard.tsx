"use client";
import React from 'react';
import { useSpring, animated } from '@react-spring/web';
import { cn } from '@/lib/utils';

interface MotionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverLift?: boolean;
}

export const MotionCard: React.FC<MotionCardProps> = ({
  className = '',
  hoverLift = true,
  children,
  ...rest
}) => {
  const [isHover, setIsHover] = React.useState(false);
  const style = useSpring({
    y: hoverLift && isHover ? -4 : 0,
    boxShadow: hoverLift && isHover ? '0 16px 40px rgba(16,28,44,0.16)' : 'var(--shadow-paintbox)'
  });

  return (
    <animated.div
      style={style as any}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      className={cn('paintbox-card', className)}
      {...rest}
    >
      {children}
    </animated.div>
  );
};
