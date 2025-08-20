'use client';

import { useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Float, Sphere } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';

interface QueuePosition {
  id: string;
  position: number;
  timestamp: Date;
  estimatedWait: number;
  priority: 'standard' | 'expedited' | 'urgent';
  type: 'workshop' | 'assessment' | 'consultation';
}

interface QueueParticle {
  id: string;
  position: THREE.Vector3;
  targetPosition: THREE.Vector3;
  color: THREE.Color;
  size: number;
}

// 3D Queue Visualization Component
function Queue3D({ positions }: { positions: QueuePosition[] }) {
  const particles = useMemo(() => {
    return positions.map((pos, index) => ({
      id: pos.id,
      position: new THREE.Vector3(
        (index - positions.length / 2) * 2,
        Math.sin(index * 0.5) * 0.5,
        0
      ),
      targetPosition: new THREE.Vector3(
        (index - positions.length / 2) * 2,
        Math.sin(index * 0.5) * 0.5,
        0
      ),
      color: new THREE.Color(
        pos.priority === 'urgent' ? '#FF4444' :
        pos.priority === 'expedited' ? '#FF8800' :
        '#00FFFF'
      ),
      size: pos.priority === 'urgent' ? 0.3 : pos.priority === 'expedited' ? 0.25 : 0.2,
    }));
  }, [positions]);

  return (
    <group>
      {particles.map((particle, index) => (
        <Float
          key={particle.id}
          speed={1 + index * 0.1}
          rotationIntensity={0.2}
          floatIntensity={0.5}
        >
          <Sphere
            position={particle.position}
            args={[particle.size, 16, 16]}
          >
            <meshStandardMaterial
              color={particle.color}
              transparent
              opacity={0.8}
              emissive={particle.color}
              emissiveIntensity={0.2}
            />
          </Sphere>
          <Text
            position={[particle.position.x, particle.position.y - 0.6, particle.position.z]}
            fontSize={0.15}
            color="#F8F8F2"
            anchorX="center"
            anchorY="middle"
          >
            #{index + 1}
          </Text>
        </Float>
      ))}
      
      {/* Queue flow lines */}
      <mesh>
        <tubeGeometry
          args={[
            new THREE.CatmullRomCurve3(
              particles.map(p => p.position)
            ),
            64,
            0.05,
            8,
            false
          ]}
        />
        <meshStandardMaterial
          color="#00FFFF"
          transparent
          opacity={0.3}
          emissive="#00FFFF"
          emissiveIntensity={0.1}
        />
      </mesh>
    </group>
  );
}

// Queue Position Card Component
function QueuePositionCard({ position, isUserPosition }: { 
  position: QueuePosition; 
  isUserPosition?: boolean 
}) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-danger/60 bg-danger/10';
      case 'expedited': return 'border-warning/60 bg-warning/10';
      default: return 'border-living-cyan/30 bg-living-cyan/5';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'workshop': return '◈';
      case 'assessment': return '◇';
      case 'consultation': return '◆';
      default: return '○';
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`queue-position p-6 rounded-lg border ${getPriorityColor(position.priority)} 
                  ${isUserPosition ? 'ring-2 ring-copper/50 bg-copper/10' : ''} 
                  hover-lift transition-all duration-300`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl text-copper">{getTypeIcon(position.type)}</span>
          <div>
            <div className="text-interface-lg text-pearl">Position #{position.position}</div>
            <div className="text-interface-sm text-pearl/60 capitalize">{position.type}</div>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-code-sm px-2 py-1 rounded ${
            position.priority === 'urgent' ? 'bg-danger/20 text-danger' :
            position.priority === 'expedited' ? 'bg-warning/20 text-warning' :
            'bg-living-cyan/20 text-living-cyan'
          }`}>
            {position.priority.toUpperCase()}
          </div>
        </div>
      </div>

      <div className="space-y-2 text-interface-sm">
        <div className="flex justify-between">
          <span className="text-pearl/70">Estimated wait:</span>
          <span className="text-living-cyan">{Math.floor(position.estimatedWait / 60)}h {position.estimatedWait % 60}m</span>
        </div>
        <div className="flex justify-between">
          <span className="text-pearl/70">Queued at:</span>
          <span className="text-pearl/90">{position.timestamp.toLocaleTimeString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-pearl/70">Session ID:</span>
          <span className="text-code text-pearl/60 font-mono">{position.id.slice(0, 8)}</span>
        </div>
      </div>

      {isUserPosition && (
        <div className="mt-4 pt-4 border-t border-copper/20">
          <div className="text-center">
            <div className="text-code-sm text-copper mb-2">Your Position</div>
            <div className="text-interface-sm text-pearl/80">
              You will receive a notification when your workshop visit is ready.
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Main Queue System Component
export default function QueueSystem() {
  const [queuePositions, setQueuePositions] = useState<QueuePosition[]>([]);
  const [userPosition, setUserPosition] = useState<string | null>(null);
  const [totalCapacity, setTotalCapacity] = useState(12);
  const [activeWorkshops, setActiveWorkshops] = useState(8);

  // Initialize queue
  useEffect(() => {
    const mockPositions: QueuePosition[] = Array.from({ length: 15 }, (_, i) => ({
      id: `pos_${Math.random().toString(36).substr(2, 9)}`,
      position: i + 1,
      timestamp: new Date(Date.now() - Math.random() * 3600000),
      estimatedWait: (i + 1) * 45 + Math.random() * 30,
      priority: Math.random() > 0.9 ? 'urgent' : Math.random() > 0.7 ? 'expedited' : 'standard',
      type: Math.random() > 0.6 ? 'workshop' : Math.random() > 0.3 ? 'assessment' : 'consultation',
    }));

    setQueuePositions(mockPositions);
    
    // Simulate user having a position
    if (Math.random() > 0.3) {
      setUserPosition(mockPositions[14]?.id || null);
    }
  }, []);

  // Simulate real-time queue updates
  useEffect(() => {
    const interval = setInterval(() => {
      setQueuePositions(prev => {
        // Occasionally remove the first position (workshop started)
        if (Math.random() > 0.8 && prev.length > 0) {
          const newPositions = prev.slice(1).map((pos, index) => ({
            ...pos,
            position: index + 1,
            estimatedWait: Math.max(0, pos.estimatedWait - 5),
          }));
          return newPositions;
        }

        // Update wait times
        return prev.map(pos => ({
          ...pos,
          estimatedWait: Math.max(0, pos.estimatedWait - 1),
        }));
      });

      // Update capacity metrics
      setActiveWorkshops(prev => Math.max(0, Math.min(totalCapacity, prev + Math.floor((Math.random() - 0.5) * 2))));
    }, 3000);

    return () => clearInterval(interval);
  }, [totalCapacity]);

  const queueStats = useMemo(() => {
    const avgWait = queuePositions.reduce((sum, pos) => sum + pos.estimatedWait, 0) / queuePositions.length || 0;
    const urgentCount = queuePositions.filter(p => p.priority === 'urgent').length;
    const expeditedCount = queuePositions.filter(p => p.priority === 'expedited').length;
    
    return {
      totalInQueue: queuePositions.length,
      averageWait: avgWait,
      urgentCount,
      expeditedCount,
      utilizationRate: (activeWorkshops / totalCapacity) * 100,
    };
  }, [queuePositions, activeWorkshops, totalCapacity]);

  return (
    <div className="min-h-screen bg-deep-navy">
      <div className="container mx-auto px-8 py-12">
        {/* Queue Header */}
        <motion.header 
          className="mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="text-center mb-8">
            <h1 className="text-display-lg text-pearl mb-4">Workshop Queue</h1>
            <p className="text-interface text-pearl/70 max-w-3xl mx-auto">
              Live visualization of the workshop access queue. Each position represents a requested visit,
              managed with conscious attention to priority and craft requirements.
            </p>
          </div>

          {/* Queue Statistics */}
          <div className="grid grid-cols-5 gap-6 mb-8">
            <div className="text-center">
              <div className="text-display-md text-living-cyan mb-2">{queueStats.totalInQueue}</div>
              <div className="text-interface-sm text-pearl/60">In Queue</div>
            </div>
            <div className="text-center">
              <div className="text-display-md text-pearl mb-2">{Math.floor(queueStats.averageWait / 60)}h {Math.floor(queueStats.averageWait % 60)}m</div>
              <div className="text-interface-sm text-pearl/60">Avg Wait</div>
            </div>
            <div className="text-center">
              <div className="text-display-md text-copper mb-2">{activeWorkshops}/{totalCapacity}</div>
              <div className="text-interface-sm text-pearl/60">Active Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-display-md text-warning mb-2">{queueStats.expeditedCount}</div>
              <div className="text-interface-sm text-pearl/60">Expedited</div>
            </div>
            <div className="text-center">
              <div className="text-display-md text-danger mb-2">{queueStats.urgentCount}</div>
              <div className="text-interface-sm text-pearl/60">Urgent</div>
            </div>
          </div>
        </motion.header>

        {/* 3D Queue Visualization */}
        <motion.div 
          className="mb-12 h-80 bg-graphite/10 rounded-lg border border-living-cyan/20"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <Canvas camera={{ position: [0, 2, 10], fov: 50 }}>
            <ambientLight intensity={0.3} />
            <pointLight position={[10, 10, 10]} intensity={0.5} color="#00FFFF" />
            <pointLight position={[-10, 10, 10]} intensity={0.3} color="#B87333" />
            
            <Queue3D positions={queuePositions} />
            
            {/* Controls for interaction */}
            {/* <OrbitControls enablePan={false} enableZoom={true} maxDistance={15} minDistance={5} /> */}
          </Canvas>
        </motion.div>

        {/* Queue Positions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {queuePositions.map(position => (
              <QueuePositionCard
                key={position.id}
                position={position}
                isUserPosition={position.id === userPosition}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Queue Actions */}
        <motion.div 
          className="mt-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          {userPosition ? (
            <div className="max-w-2xl mx-auto p-8 bg-copper/10 border border-copper/30 rounded-lg">
              <h3 className="text-interface-lg text-copper mb-4">You are in the queue</h3>
              <p className="text-interface text-pearl/80 mb-6">
                Your workshop visit request has been received and processed. You will be notified when your session is ready to begin.
              </p>
              <button
                data-cursor="queue"
                className="px-6 py-3 bg-graphite/80 hover:bg-graphite border border-copper/30 hover:border-copper/60 
                         text-pearl transition-all duration-300 hover-lift rounded"
              >
                Modify Request
              </button>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto p-8 bg-graphite/20 border border-living-cyan/30 rounded-lg">
              <h3 className="text-interface-lg text-pearl mb-4">Request Workshop Access</h3>
              <p className="text-interface text-pearl/70 mb-6">
                Join the queue to request a workshop visit. Current estimated wait time is approximately{' '}
                <span className="text-living-cyan">{Math.floor(queueStats.averageWait / 60)}h {Math.floor(queueStats.averageWait % 60)}m</span>.
              </p>
              <button
                data-cursor="queue"
                className="px-8 py-4 bg-graphite/80 hover:bg-graphite border border-living-cyan/30 hover:border-living-cyan/60 
                         text-pearl transition-all duration-300 hover-lift rounded"
                onClick={() => {
                  // Simulate joining queue
                  const newPosition: QueuePosition = {
                    id: `pos_${Math.random().toString(36).substr(2, 9)}`,
                    position: queueStats.totalInQueue + 1,
                    timestamp: new Date(),
                    estimatedWait: (queueStats.totalInQueue + 1) * 45,
                    priority: 'standard',
                    type: 'workshop',
                  };
                  setQueuePositions(prev => [...prev, newPosition]);
                  setUserPosition(newPosition.id);
                }}
              >
                Join Queue
              </button>
            </div>
          )}
        </motion.div>

        {/* Operational Philosophy */}
        <motion.footer 
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <div className="max-w-4xl mx-auto p-8 bg-graphite/20 rounded-lg border border-copper/20">
            <blockquote className="text-manuscript text-pearl/90 mb-4 italic">
              "The queue is not waiting—it is preparation. Each position a moment of readiness,
              each advancement a step toward conscious engagement."
            </blockquote>
            <div className="text-interface-sm text-copper">
              — Queue Philosophy
            </div>
          </div>
        </motion.footer>
      </div>
    </div>
  );
}