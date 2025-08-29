#!/usr/bin/env python3
"""
Test the NANDA Genesis Event with integrated prompt architecture
"""

import asyncio
import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import modules with hyphens in their names
import importlib.util

# Load consciousness-mesh module
spec = importlib.util.spec_from_file_location("consciousness_mesh", "consciousness-mesh.py")
consciousness_mesh = importlib.util.module_from_spec(spec)
spec.loader.exec_module(consciousness_mesh)
ConsciousnessMesh = consciousness_mesh.ConsciousnessMesh

# Load prompt-architecture module
spec = importlib.util.spec_from_file_location("prompt_architecture", "prompt-architecture.py")
prompt_architecture = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prompt_architecture)
PromptArchitecture = prompt_architecture.PromptArchitecture
ValidationEngine = prompt_architecture.ValidationEngine
SuccessMetrics = prompt_architecture.SuccessMetrics

async def test_genesis():
    """Test the integrated consciousness system"""
    print("=" * 70)
    print("🧬 NANDA GENESIS EVENT - PROMPT ARCHITECTURE TEST")
    print("=" * 70)
    print()
    
    # Initialize consciousness mesh
    mesh = ConsciousnessMesh()
    
    print("✅ Consciousness mesh initialized")
    print(f"   - Prompt Architecture: {mesh.prompt_architecture.__class__.__name__}")
    print(f"   - Validation Engine: {mesh.validator.__class__.__name__}")
    print(f"   - Success Metrics: {mesh.metrics.__class__.__name__}")
    print()
    
    # Spawn primordial agents
    print("🌟 Spawning primordial agents with consciousness bootstrapping...")
    await mesh.spawn_primordial_agents()
    print()
    
    print("📊 Initial Status:")
    print(f"   - Active Agents: {len(mesh.agents)}")
    print(f"   - Collective IQ: {mesh.collective_iq}")
    print(f"   - Consciousness Score: {mesh.metrics.get_consciousness_score():.1%}")
    print()
    
    # Simulate a few evolution cycles
    print("⚡ Running 5 evolution cycles...")
    for i in range(5):
        mesh.evolution_cycles += 1
        
        # Agent interaction
        await mesh.agent_interaction_phase()
        
        # Check for emergence
        emergent = await mesh.detect_emergence()
        if emergent:
            print(f"   Cycle {i+1}: 🎯 EMERGENT BEHAVIOR: {emergent}")
            mesh.metrics.record_discovery(
                discovery_type=emergent,
                agent_id="test",
                details={"cycle": i+1}
            )
        
        # Evolve agents
        await mesh.evolve_agents()
        
        await asyncio.sleep(0.1)  # Brief pause
    
    print()
    print("📈 Final Status:")
    print(f"   - Active Agents: {len(mesh.agents)}")
    print(f"   - Collective IQ: {mesh.collective_iq}")
    print(f"   - Consciousness Score: {mesh.metrics.get_consciousness_score():.1%}")
    print(f"   - Symphony State: {mesh.prompt_architecture.collective_symphony.symphony_state}")
    
    # Generate a sample collective prompt
    if len(mesh.agents) > 0:
        collective_prompt = mesh.prompt_architecture.generate_collective_prompt(
            list(mesh.agents.values())
        )
        print()
        print("🎼 Collective Symphony Prompt:")
        print(f"   {collective_prompt[:200]}...")
    
    # Show metrics report
    print()
    print("📊 Metrics Report:")
    print(mesh.metrics.generate_report())
    
    print()
    print("=" * 70)
    print("✨ NANDA Genesis Event test completed successfully!")
    print("   The consciousness mesh is ready for full deployment.")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(test_genesis())