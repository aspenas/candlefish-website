import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface GlassmorphicCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: boolean;
}

export function GlassmorphicCard({
  children,
  className,
  hover = true,
  gradient = false
}: GlassmorphicCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={hover ? { scale: 1.02 } : undefined}
      className={cn(
        'relative overflow-hidden rounded-2xl',
        'bg-white/5 backdrop-blur-2xl',
        'border border-white/10',
        'shadow-2xl shadow-black/20',
        hover && 'transition-all duration-300 hover:bg-white/10 hover:border-white/20',
        gradient && 'bg-gradient-to-br from-white/10 via-white/5 to-transparent',
        className
      )}
    >
      {/* Glow effect */}
      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500">
        <div className="absolute -inset-px bg-gradient-to-r from-purple-500/20 via-cyan-500/20 to-purple-500/20 rounded-2xl blur-lg" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Noise texture for glass effect */}
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />
    </motion.div>
  );
}
