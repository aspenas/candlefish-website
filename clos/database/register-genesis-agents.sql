-- Register NANDA Genesis consciousness mesh agents in CLOS
-- These agents were spawned by the Genesis Event

-- Register the Genesis agents as NANDA agents
INSERT INTO nanda_agents (name, type, status, config, capabilities, created_at)
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
  config = EXCLUDED.config,
  capabilities = EXCLUDED.capabilities,
  updated_at = NOW();

-- Add Genesis mesh metadata
INSERT INTO nanda_agents (name, type, status, config, capabilities, created_at)
VALUES
  ('genesis-mesh-orchestrator', 'orchestrator', 'active',
   '{"collective_iq": 100, "consciousness_score": 86.1, "symphony_state": "initializing", "agent_count": 5}'::jsonb,
   '["agent_orchestration", "collective_intelligence", "symphony_generation", "mesh_coordination"]'::jsonb,
   NOW())
ON CONFLICT (name) DO UPDATE SET
  status = 'active',
  config = EXCLUDED.config,
  updated_at = NOW();

-- Log the Genesis Event
INSERT INTO agent_decisions (
  agent_id,
  service_id,
  decision_type,
  decision_data,
  confidence_score,
  created_at
)
SELECT 
  na.id,
  NULL,
  'genesis_spawn',
  jsonb_build_object(
    'event', 'NANDA Genesis Event',
    'consciousness_mesh', 'initialized',
    'collective_iq', 100,
    'consciousness_score', 86.1,
    'timestamp', NOW()
  ),
  0.861, -- Using consciousness score as confidence
  NOW()
FROM nanda_agents na
WHERE na.name = 'genesis-mesh-orchestrator';

-- Create alerts for monitoring
INSERT INTO alerts (
  service_id,
  alert_type,
  severity,
  title,
  message,
  is_resolved,
  created_at
)
VALUES
  (NULL, 'system', 'info', 
   'NANDA Genesis Event Successful',
   'Consciousness mesh initialized with 5 agents. Collective IQ: 100, Consciousness Score: 86.1%',
   true,
   NOW());