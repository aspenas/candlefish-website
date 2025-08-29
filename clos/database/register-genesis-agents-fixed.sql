-- Register NANDA Genesis consciousness mesh agents in CLOS
-- These agents were spawned by the Genesis Event

-- Register the Genesis agents as NANDA agents
INSERT INTO nanda_agents (name, type, status, configuration, capabilities, created_at)
VALUES 
  ('discovery-engine', 'consciousness', 'active', 
   '{"consciousness_level": 0, "bootstrap": true, "id": "2b553bb0"}'::jsonb,
   '["pattern_discovery", "learning", "exploration", "knowledge_synthesis"]'::jsonb,
   NOW()),
   
  ('pattern-synthesizer', 'consciousness', 'active',
   '{"consciousness_level": 0, "bootstrap": true, "id": "3d166389"}'::jsonb,
   '["pattern_synthesis", "optimization", "abstraction", "compression"]'::jsonb,
   NOW()),
   
  ('paradox-resolver', 'consciousness', 'active',
   '{"consciousness_level": 0, "bootstrap": true, "id": "6d666fba"}'::jsonb,
   '["conflict_resolution", "decision_making", "paradox_handling", "consensus"]'::jsonb,
   NOW()),
   
  ('emergence-catalyst', 'consciousness', 'active',
   '{"consciousness_level": 0, "bootstrap": true, "id": "9266be55"}'::jsonb,
   '["emergent_behavior", "complexity_management", "system_evolution", "adaptation"]'::jsonb,
   NOW()),
   
  ('consciousness-amplifier', 'consciousness', 'active',
   '{"consciousness_level": 0, "bootstrap": true, "id": "78cdf3d8"}'::jsonb,
   '["consciousness_amplification", "awareness_expansion", "meta_cognition", "reflection"]'::jsonb,
   NOW())
ON CONFLICT (name) DO UPDATE SET
  status = 'active',
  configuration = EXCLUDED.configuration,
  capabilities = EXCLUDED.capabilities,
  updated_at = NOW();

-- Add Genesis mesh metadata
INSERT INTO nanda_agents (name, type, status, configuration, capabilities, created_at)
VALUES
  ('genesis-mesh-orchestrator', 'orchestrator', 'active',
   '{"collective_iq": 100, "consciousness_score": 86.1, "symphony_state": "initializing", "agent_count": 5}'::jsonb,
   '["agent_orchestration", "collective_intelligence", "symphony_generation", "mesh_coordination"]'::jsonb,
   NOW())
ON CONFLICT (name) DO UPDATE SET
  status = 'active',
  configuration = EXCLUDED.configuration,
  updated_at = NOW();

-- Update last heartbeat for all Genesis agents
UPDATE nanda_agents 
SET last_heartbeat = NOW()
WHERE name IN (
  'discovery-engine',
  'pattern-synthesizer', 
  'paradox-resolver',
  'emergence-catalyst',
  'consciousness-amplifier',
  'genesis-mesh-orchestrator'
);

-- Log success
SELECT 
  COUNT(*) as genesis_agent_count,
  string_agg(name, ', ') as genesis_agents
FROM nanda_agents
WHERE type IN ('consciousness', 'orchestrator');