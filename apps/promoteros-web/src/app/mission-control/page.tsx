'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocket } from '@/hooks/useWebSocket';
import { GlassmorphicCard } from '@/components/ui/glassmorphic-card';
import { ViralTrajectoryMap } from '@/components/charts/viral-trajectory';
import { AIRecommendations } from '@/components/ai/recommendations';
import { CompetitorIntelligence } from '@/components/intel/competitor-intelligence';
import { FinancialProjections } from '@/components/finance/projections';
import { SocialPulse } from '@/components/social/pulse-stream';
import { ArtistSpotlight } from '@/components/artist/spotlight';
import { 
  TrendingUp, 
  Brain, 
  DollarSign, 
  Users, 
  Activity,
  Zap,
  AlertCircle,
  Target
} from 'lucide-react';

interface RealtimeData {
  viralArtists: any[];
  aiRecommendations: any[];
  financialProjections: any;
  competitorActivity: any[];
  socialPulse: any[];
  alerts: any[];
  metrics: {
    artistsTracked: number;
    predictionsToday: number;
    accuracyRate: number;
    potentialRevenue: number;
  };
}

export default function MissionControl() {
  const [selectedArtist, setSelectedArtist] = useState<any>(null);
  const { data: realtimeData, isConnected } = useWebSocket<RealtimeData>(
    process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4003/stream'
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute -inset-[10px] opacity-50">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
          <div className="absolute top-0 -right-4 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/10 backdrop-blur-2xl bg-black/20">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  PromoterOS Mission Control
                </h1>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
                  <span className="text-sm text-gray-400">
                    {isConnected ? 'Live' : 'Connecting...'}
                  </span>
                </div>
              </div>
              
              {/* Metrics Bar */}
              <div className="flex items-center space-x-6">
                <MetricBadge
                  icon={<Users className="w-4 h-4" />}
                  label="Tracked"
                  value={realtimeData?.metrics.artistsTracked || 0}
                />
                <MetricBadge
                  icon={<Brain className="w-4 h-4" />}
                  label="Predictions"
                  value={realtimeData?.metrics.predictionsToday || 0}
                />
                <MetricBadge
                  icon={<Target className="w-4 h-4" />}
                  label="Accuracy"
                  value={`${realtimeData?.metrics.accuracyRate || 0}%`}
                />
                <MetricBadge
                  icon={<DollarSign className="w-4 h-4" />}
                  label="Potential"
                  value={`$${(realtimeData?.metrics.potentialRevenue || 0).toLocaleString()}`}
                />
              </div>
            </div>
          </div>
        </header>

        {/* Alert Banner */}
        <AnimatePresence>
          {realtimeData?.alerts && realtimeData.alerts.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-y border-yellow-500/30"
            >
              <div className="px-6 py-3 flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 animate-pulse" />
                <p className="text-sm text-yellow-200">
                  <span className="font-semibold">HOT ALERT:</span> {realtimeData.alerts[0].message}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Grid */}
        <div className="p-6">
          <div className="grid grid-cols-12 gap-6">
            {/* Viral Trajectory Map - Main Focus */}
            <div className="col-span-8 row-span-2">
              <GlassmorphicCard className="h-full">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2 text-purple-400" />
                      Viral Trajectory Analysis
                    </h2>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-400">Live Updates</span>
                      <Activity className="w-4 h-4 text-green-400 animate-pulse" />
                    </div>
                  </div>
                  <ViralTrajectoryMap 
                    data={realtimeData?.viralArtists || []}
                    onArtistSelect={setSelectedArtist}
                    height={500}
                  />
                </div>
              </GlassmorphicCard>
            </div>

            {/* AI Recommendations - Right Panel */}
            <div className="col-span-4">
              <GlassmorphicCard>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white flex items-center">
                      <Brain className="w-5 h-5 mr-2 text-cyan-400" />
                      AI Recommendations
                    </h2>
                    <Zap className="w-4 h-4 text-yellow-400" />
                  </div>
                  <AIRecommendations 
                    recommendations={realtimeData?.aiRecommendations || []}
                    showReasoning={true}
                    onBook={(artist) => console.log('Book:', artist)}
                  />
                </div>
              </GlassmorphicCard>
            </div>

            {/* Financial Projections */}
            <div className="col-span-4">
              <GlassmorphicCard>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white flex items-center">
                      <DollarSign className="w-5 h-5 mr-2 text-green-400" />
                      Financial Projections
                    </h2>
                  </div>
                  <FinancialProjections 
                    projections={realtimeData?.financialProjections}
                    showScenarios={true}
                  />
                </div>
              </GlassmorphicCard>
            </div>

            {/* Competitor Intelligence */}
            <div className="col-span-4">
              <GlassmorphicCard>
                <div className="p-4">
                  <h2 className="text-lg font-semibold text-white mb-4">
                    Competitor Intelligence
                  </h2>
                  <CompetitorIntelligence 
                    activity={realtimeData?.competitorActivity || []}
                    highlightThreats={true}
                  />
                </div>
              </GlassmorphicCard>
            </div>

            {/* Social Pulse Stream - Bottom */}
            <div className="col-span-8">
              <GlassmorphicCard>
                <div className="p-4">
                  <h2 className="text-lg font-semibold text-white mb-4">
                    Social Media Pulse
                  </h2>
                  <SocialPulse 
                    stream={realtimeData?.socialPulse || []}
                    maxItems={5}
                  />
                </div>
              </GlassmorphicCard>
            </div>
          </div>
        </div>
      </div>

      {/* Artist Spotlight Modal */}
      <AnimatePresence>
        {selectedArtist && (
          <ArtistSpotlight
            artist={selectedArtist}
            onClose={() => setSelectedArtist(null)}
            onBook={(artist) => console.log('Book artist:', artist)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function MetricBadge({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-white/5 backdrop-blur-lg border border-white/10">
      <div className="text-gray-400">{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}