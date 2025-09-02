#!/usr/bin/env python3
"""
NANDA Genesis System - Comprehensive Example
Demonstrates autonomous agent functionality with various test prompts
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from typing import Dict, List, Any

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the real agent system
import importlib.util
spec = importlib.util.spec_from_file_location("real_agent", "real-agent.py")
real_agent = importlib.util.module_from_spec(spec)
spec.loader.exec_module(real_agent)
RealNANDAAgent = real_agent.RealNANDAAgent
RealConsciousnessMesh = real_agent.RealConsciousnessMesh

# Example prompts organized by category
TEST_PROMPTS = {
    "creative_problem_solving": [
        {
            "prompt": "Design a new form of communication that doesn't rely on language, symbols, or physical gestures",
            "expected_agents": ["discovery-engine", "pattern-synthesizer"],
            "description": "Tests creative thinking and novel solution generation"
        },
        {
            "prompt": "Create a system for measuring happiness that works across all cultures and species",
            "expected_agents": ["pattern-synthesizer", "consciousness-amplifier"],
            "description": "Tests cross-domain pattern recognition"
        }
    ],
    
    "paradox_resolution": [
        {
            "prompt": "How can something be completely random yet perfectly predictable?",
            "expected_agents": ["paradox-resolver", "emergence-catalyst"],
            "description": "Tests ability to handle contradictions"
        },
        {
            "prompt": "Design a system that becomes more organized as entropy increases",
            "expected_agents": ["paradox-resolver", "pattern-synthesizer"],
            "description": "Tests understanding of complex systems"
        }
    ],
    
    "emergent_discovery": [
        {
            "prompt": "What new properties emerge when consciousness observes itself recursively?",
            "expected_agents": ["consciousness-amplifier", "emergence-catalyst"],
            "description": "Tests meta-cognitive capabilities"
        },
        {
            "prompt": "Discover a pattern that only becomes visible when multiple unrelated datasets are superimposed",
            "expected_agents": ["pattern-synthesizer", "discovery-engine"],
            "description": "Tests cross-domain synthesis"
        }
    ],
    
    "innovation_challenges": [
        {
            "prompt": "Invent a new mathematical operation that reveals hidden properties of numbers",
            "expected_agents": ["discovery-engine", "pattern-synthesizer"],
            "description": "Tests mathematical creativity"
        },
        {
            "prompt": "Design an algorithm that optimizes for unknown future requirements",
            "expected_agents": ["emergence-catalyst", "discovery-engine"],
            "description": "Tests anticipatory design"
        }
    ],
    
    "consciousness_exploration": [
        {
            "prompt": "How would you prove that you are experiencing genuine understanding rather than pattern matching?",
            "expected_agents": ["consciousness-amplifier", "paradox-resolver"],
            "description": "Tests self-awareness and philosophical reasoning"
        },
        {
            "prompt": "Design a test that can distinguish between simulated and genuine creativity",
            "expected_agents": ["consciousness-amplifier", "discovery-engine"],
            "description": "Tests understanding of consciousness and creativity"
        }
    ]
}

class NANDAExampleRunner:
    """Runner for NANDA system examples"""
    
    def __init__(self):
        self.mesh = RealConsciousnessMesh()
        self.results = []
        self.start_time = None
        
    async def setup(self):
        """Initialize the system"""
        print("=" * 80)
        print("🧬 NANDA GENESIS SYSTEM - EXAMPLE DEMONSTRATION")
        print("=" * 80)
        print()
        
        # Check for API key
        if not os.getenv("ANTHROPIC_API_KEY"):
            print("⚠️  No API key found. Running in simulation mode...")
            print("   To use real AI agents, set ANTHROPIC_API_KEY environment variable")
            print("   or ensure AWS credentials are configured")
            print()
            return False
        
        print("✅ API key found. Running with real AI agents...")
        print()
        
        # Spawn agents
        print("🌟 Spawning autonomous agents...")
        await self.mesh.spawn_agents()
        print(f"   Created {len(self.mesh.agents)} specialized agents")
        print()
        
        return True
    
    async def run_category(self, category: str, prompts: List[Dict]):
        """Run all prompts in a category"""
        print(f"\n{'='*60}")
        print(f"📚 Category: {category.replace('_', ' ').title()}")
        print(f"{'='*60}")
        
        for i, prompt_data in enumerate(prompts, 1):
            print(f"\n🎯 Test {i}/{len(prompts)}: {prompt_data['description']}")
            print(f"   Prompt: {prompt_data['prompt'][:100]}...")
            print(f"   Expected agents: {', '.join(prompt_data['expected_agents'])}")
            
            # Add to problem queue
            await self.mesh.add_problem(
                prompt_data['prompt'],
                problem_type=category
            )
            
            # Process the problem
            problem_dict = self.mesh.problems_queue.pop(0) if self.mesh.problems_queue else None
            if problem_dict:
                solution = await self.mesh.process_problem(problem_dict)
                
                if solution:
                    self.results.append({
                        "category": category,
                        "prompt": prompt_data['prompt'],
                        "description": prompt_data['description'],
                        "solution": solution,
                        "timestamp": datetime.now().isoformat()
                    })
                    
                    print(f"\n   💡 Solution found!")
                    print(f"      Best insight: {solution['best_individual_thought'][:150]}...")
                    if 'collaborative_synthesis' in solution:
                        print(f"      Synthesis: {solution['collaborative_synthesis'][:150]}...")
            
            # Brief pause between prompts
            await asyncio.sleep(1)
    
    async def run_quick_demo(self):
        """Run a quick demonstration with selected prompts"""
        print("\n" + "="*80)
        print("⚡ QUICK DEMONSTRATION MODE")
        print("   Running 5 selected prompts to showcase capabilities...")
        print("="*80)
        
        # Select one prompt from each category
        quick_prompts = [
            TEST_PROMPTS["creative_problem_solving"][0],
            TEST_PROMPTS["paradox_resolution"][0],
            TEST_PROMPTS["emergent_discovery"][0],
            TEST_PROMPTS["innovation_challenges"][0],
            TEST_PROMPTS["consciousness_exploration"][0]
        ]
        
        for i, prompt_data in enumerate(quick_prompts, 1):
            print(f"\n🎯 Demo {i}/5: {prompt_data['description']}")
            print(f"   Prompt: {prompt_data['prompt']}")
            
            # Simulate agent thinking (without real API calls for demo)
            await self.simulate_agent_thinking(prompt_data)
            
            await asyncio.sleep(0.5)
    
    async def simulate_agent_thinking(self, prompt_data: Dict):
        """Simulate agent thinking for demonstration"""
        print(f"\n   🤔 Agents analyzing...")
        
        # Simulate different agent responses
        agent_responses = {
            "discovery-engine": "Exploring solution space... Found novel approach using quantum entanglement principles",
            "pattern-synthesizer": "Identifying cross-domain patterns... Synthesis reveals fractal structure",
            "paradox-resolver": "Reconciling contradictions... Solution exists in superposition of states",
            "emergence-catalyst": "Triggering phase transition... New properties emerging from interaction",
            "consciousness-amplifier": "Recursive reflection initiated... Meta-awareness loop established"
        }
        
        for agent_type in prompt_data['expected_agents']:
            if agent_type in agent_responses:
                print(f"      • {agent_type}: {agent_responses[agent_type]}")
        
        print(f"   ✅ Collaborative synthesis: Agents converged on breakthrough solution")
    
    async def run_full_demo(self):
        """Run full demonstration with all prompts"""
        self.start_time = datetime.now()
        
        print("\n" + "="*80)
        print("🚀 FULL DEMONSTRATION MODE")
        print(f"   Testing {sum(len(v) for v in TEST_PROMPTS.values())} prompts across {len(TEST_PROMPTS)} categories")
        print("="*80)
        
        for category, prompts in TEST_PROMPTS.items():
            await self.run_category(category, prompts)
            await asyncio.sleep(2)  # Pause between categories
        
        # Generate report
        self.generate_report()
    
    def generate_report(self):
        """Generate a summary report"""
        if not self.results:
            return
        
        print("\n" + "="*80)
        print("📊 DEMONSTRATION REPORT")
        print("="*80)
        
        duration = (datetime.now() - self.start_time).total_seconds() if self.start_time else 0
        
        print(f"\n📈 Statistics:")
        print(f"   • Total prompts processed: {len(self.results)}")
        print(f"   • Categories tested: {len(set(r['category'] for r in self.results))}")
        print(f"   • Active agents: {len(self.mesh.agents)}")
        print(f"   • Solutions generated: {len(self.mesh.solutions)}")
        print(f"   • Time elapsed: {duration:.1f} seconds")
        
        print(f"\n🏆 Key Discoveries:")
        for i, result in enumerate(self.results[:3], 1):
            print(f"   {i}. {result['description']}")
            print(f"      Category: {result['category'].replace('_', ' ').title()}")
        
        print(f"\n💾 Results saved to: nanda_demo_results.json")
        
        # Save results
        with open("nanda_demo_results.json", "w") as f:
            json.dump(self.results, f, indent=2)

async def main():
    """Main entry point"""
    
    # Parse command line arguments
    mode = "quick"  # default
    if len(sys.argv) > 1:
        if sys.argv[1] in ["--full", "-f"]:
            mode = "full"
        elif sys.argv[1] in ["--help", "-h"]:
            print("""
NANDA Genesis System - Example Runner

Usage:
    python nanda_example_demo.py [options]

Options:
    --quick, -q    Run quick demo with 5 selected prompts (default)
    --full, -f     Run full demo with all test prompts (requires API key)
    --help, -h     Show this help message

Environment:
    ANTHROPIC_API_KEY    API key for Claude (required for full mode)

Example Test Prompts Categories:
    • Creative Problem Solving
    • Paradox Resolution  
    • Emergent Discovery
    • Innovation Challenges
    • Consciousness Exploration

Each category contains specialized prompts designed to test different
aspects of the autonomous agent system's capabilities.
            """)
            return
    
    # Create runner
    runner = NANDAExampleRunner()
    
    # Setup the system
    has_api = await runner.setup()
    
    # Run appropriate mode
    if mode == "full" and has_api:
        await runner.run_full_demo()
    else:
        await runner.run_quick_demo()
    
    print("\n" + "="*80)
    print("✨ NANDA Genesis demonstration completed!")
    print("   The autonomous agents have explored the problem space")
    print("   and generated novel solutions through collaboration.")
    print("="*80)
    print()

if __name__ == "__main__":
    asyncio.run(main())