import React from 'react';
import { Button } from '../ui/Button';
import { ArrowRightIcon, PlayIcon } from '@heroicons/react/24/outline';

export interface HeroProps {
  title?: string;
  subtitle?: string;
  description?: string;
  primaryCTA?: {
    text: string;
    href: string;
    onClick?: () => void;
  };
  secondaryCTA?: {
    text: string;
    href: string;
    onClick?: () => void;
  };
  backgroundImage?: string;
  videoUrl?: string;
  stats?: Array<{
    label: string;
    value: string;
  }>;
}

const Hero: React.FC<HeroProps> = ({
  title = "Practical Automation That Compounds",
  subtitle = "Candlefish.ai",
  description = "Modular AI solutions for SMB operations. Measurable results in 2 weeks. No hype, just operational improvement.",
  primaryCTA = {
    text: "Start Assessment",
    href: "/assessment"
  },
  secondaryCTA = {
    text: "Watch Demo",
    href: "/demo"
  },
  backgroundImage,
  videoUrl,
  stats = [
    { label: "Average ROI", value: "340%" },
    { label: "Implementation Time", value: "2 weeks" },
    { label: "Client Satisfaction", value: "98%" },
    { label: "Processes Automated", value: "1,200+" }
  ]
}) => {
  return (
    <section 
      className="relative overflow-hidden bg-gradient-to-br from-deep-navy via-slate to-deep-navy"
      style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : undefined}
    >
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-sea-glow/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-sea-glow/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            <div className="mb-6">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-sea-glow/10 text-sea-glow border border-sea-glow/20">
                {subtitle}
              </span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foam mb-6 leading-tight">
              {title}
            </h1>
            
            <p className="text-lg text-foam/80 mb-8 max-w-2xl mx-auto lg:mx-0">
              {description}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
              <Button
                size="lg"
                className="group"
                onClick={primaryCTA.onClick}
              >
                {primaryCTA.text}
                <ArrowRightIcon className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                className="border-foam/20 text-foam hover:bg-foam/10"
                onClick={secondaryCTA.onClick}
              >
                <PlayIcon className="mr-2 h-4 w-4" />
                {secondaryCTA.text}
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <div key={index} className="text-center lg:text-left">
                  <div className="text-2xl sm:text-3xl font-bold text-sea-glow mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-foam/60">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual Element */}
          <div className="relative">
            {videoUrl ? (
              <div className="relative aspect-video rounded-lg overflow-hidden shadow-2xl">
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                  poster="/images/hero-video-poster.jpg"
                >
                  <source src={videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <div className="absolute inset-0 bg-gradient-to-t from-deep-navy/20 to-transparent" />
              </div>
            ) : (
              <div className="relative">
                {/* Dashboard Preview */}
                <div className="bg-foam rounded-lg shadow-2xl p-6 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full" />
                      <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                      <div className="w-3 h-3 bg-green-500 rounded-full" />
                    </div>
                    <div className="text-xs text-slate font-medium">
                      Candlefish.ai Dashboard
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="h-4 bg-gradient-to-r from-sea-glow to-sea-glow/60 rounded" />
                    <div className="h-3 bg-mist/30 rounded w-3/4" />
                    <div className="h-3 bg-mist/20 rounded w-1/2" />
                    
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      <div className="h-16 bg-gradient-to-br from-sea-glow/20 to-sea-glow/40 rounded" />
                      <div className="h-16 bg-gradient-to-br from-mist/20 to-mist/40 rounded" />
                      <div className="h-16 bg-gradient-to-br from-slate/20 to-slate/40 rounded" />
                    </div>
                  </div>
                </div>

                {/* Floating Elements */}
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-sea-glow rounded-full flex items-center justify-center animate-bounce">
                  <span className="text-white font-bold">AI</span>
                </div>
                
                <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-foam border-4 border-sea-glow rounded-full flex items-center justify-center">
                  <span className="text-sea-glow font-bold text-sm">ROI</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          className="w-full h-auto"
          viewBox="0 0 1440 74"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 74L60 69.2C120 64.3 240 54.7 360 48.3C480 42 600 39 720 42C840 45 960 54 1080 58.8C1200 63.7 1320 64.3 1380 64.7L1440 65V74H1380C1320 74 1200 74 1080 74C960 74 840 74 720 74C600 74 480 74 360 74C240 74 120 74 60 74H0Z"
            fill="white"
          />
        </svg>
      </div>
    </section>
  );
};

export { Hero };