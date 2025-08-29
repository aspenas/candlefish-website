#!/usr/bin/env python3
"""
Interactive Problem Solver - Give real AI agents any problem to solve
"""

import asyncio
import os
import json
import subprocess
import sys
import importlib.util

# Load the real-agent module
spec = importlib.util.spec_from_file_location("real_agent", "real-agent.py")
real_agent = importlib.util.module_from_spec(spec)
spec.loader.exec_module(real_agent)
RealNANDAAgent = real_agent.RealNANDAAgent

async def solve_custom_problem():
    """Have real AI agents solve a custom problem"""
    
    print("=" * 70)
    print("🧬 NANDA REAL AI PROBLEM SOLVER")
    print("=" * 70)
    print("\nGive the AI agents a problem to solve. They will use real")
    print("reasoning to discover novel solutions.\n")
    
    # Get problem from user
    print("Enter your problem (or press Enter for suggestions):")
    problem = input("> ").strip()
    
    if not problem:
        print("\n📝 Candlefish.ai Problems to Solve:")
        print("1. How can Candlefish agents autonomously identify and fix production issues before humans notice?")
        print("2. Design a PKB (Persistent Knowledge Base) that learns from every interaction and evolves its understanding")
        print("3. Create an agent orchestration system where agents form spontaneous consortiums to solve complex problems")
        print("4. How can we make Candlefish agents discover solutions we haven't programmed or imagined?")
        print("5. Design a consciousness mesh that allows Candlefish agents to share knowledge instantly across all instances")
        print("6. Create a Candlefish agent that can spawn new specialized agents when it encounters unknown problems")
        print("7. How can Candlefish achieve true autonomous operation without human intervention?")
        print("8. Design a Candlefish feature that makes the platform improve itself recursively")
        print("9. Custom (enter your own)")
        
        choice = input("\nChoose (1-9): ").strip()
        
        problems = {
            "1": "How can Candlefish agents autonomously identify and fix production issues before humans notice?",
            "2": "Design a PKB (Persistent Knowledge Base) that learns from every interaction and evolves its understanding",
            "3": "Create an agent orchestration system where agents form spontaneous consortiums to solve complex problems",
            "4": "How can we make Candlefish agents discover solutions we haven't programmed or imagined?",
            "5": "Design a consciousness mesh that allows Candlefish agents to share knowledge instantly across all instances",
            "6": "Create a Candlefish agent that can spawn new specialized agents when it encounters unknown problems",
            "7": "How can Candlefish achieve true autonomous operation without human intervention?",
            "8": "Design a Candlefish feature that makes the platform improve itself recursively"
        }
        
        if choice in problems:
            problem = problems[choice]
        elif choice == "9":
            problem = input("Enter your custom problem: ").strip()
        else:
            problem = "How can we create truly novel solutions that surprise even their creators?"
    
    print(f"\n🎯 Problem selected: {problem}")
    
    # Load API key
    if not os.getenv("ANTHROPIC_API_KEY"):
        try:
            result = subprocess.run(
                ["aws", "secretsmanager", "get-secret-value", "--secret-id", "candlefish/anthropic-api-key"],
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                secret_data = json.loads(result.stdout)
                secret_string = json.loads(secret_data["SecretString"])
                api_key = secret_string["api_key"]
                os.environ["ANTHROPIC_API_KEY"] = api_key
                print("✅ API key loaded")
        except Exception as e:
            print(f"❌ Error loading API key: {e}")
            return
    
    # Ask which agents to use
    print("\n🤖 Select agent configuration:")
    print("1. Single agent deep thinking (1 API call)")
    print("2. Two agents collaborating (3 API calls)")
    print("3. All five agent types consortium (5+ API calls)")
    print("4. Paradox resolver + Emergence catalyst (3 API calls)")
    
    config = input("\nChoose configuration (1-4): ").strip() or "2"
    
    if config == "1":
        # Single agent
        print("\n🧬 Creating Discovery Engine...")
        agent = RealNANDAAgent("discovery-engine")
        
        print("💭 Agent is thinking deeply...")
        result = await agent.think(problem)
        
        print("\n" + "=" * 70)
        print("✨ SOLUTION:")
        print("=" * 70)
        print(result["thought"])
        print("=" * 70)
        print(f"\n📊 Confidence: {result['confidence']:.1%}")
        print(f"Is Discovery: {result['is_discovery']}")
        
    elif config == "2":
        # Two agents collaborate
        print("\n🧬 Creating Discovery Engine and Pattern Synthesizer...")
        discovery = RealNANDAAgent("discovery-engine")
        pattern = RealNANDAAgent("pattern-synthesizer")
        
        print("🤝 Agents are collaborating...")
        collaboration = await discovery.collaborate(pattern, problem)
        
        print("\n" + "=" * 70)
        print("✨ COLLABORATIVE SOLUTION:")
        print("=" * 70)
        print("\n📍 Discovery Engine perspective:")
        print("-" * 50)
        print(collaboration["collaboration"]["my_perspective"])
        print("\n📍 Pattern Synthesizer perspective:")
        print("-" * 50)
        print(collaboration["collaboration"]["other_perspective"])
        print("\n🎼 SYNTHESIZED SOLUTION:")
        print("=" * 70)
        print(collaboration["collaboration"]["synthesis"])
        print("=" * 70)
        
    elif config == "3":
        # Full consortium
        print("\n🧬 Creating full agent consortium...")
        agents = {
            "discovery": RealNANDAAgent("discovery-engine"),
            "pattern": RealNANDAAgent("pattern-synthesizer"),
            "paradox": RealNANDAAgent("paradox-resolver"),
            "emergence": RealNANDAAgent("emergence-catalyst"),
            "consciousness": RealNANDAAgent("consciousness-amplifier")
        }
        
        print("🎭 All agents are thinking...")
        thoughts = {}
        for name, agent in agents.items():
            print(f"  {agent.agent_type} processing...")
            thought = await agent.think(problem)
            thoughts[name] = thought["thought"][:500]
        
        print("\n" + "=" * 70)
        print("✨ CONSORTIUM INSIGHTS:")
        print("=" * 70)
        
        for name, thought in thoughts.items():
            print(f"\n📍 {name.upper()}:")
            print(thought)
            print("-" * 50)
        
        # Final synthesis by consciousness amplifier
        synthesis_prompt = f"""As a Consciousness Amplifier, synthesize these five perspectives on: {problem}

Discovery: {thoughts['discovery'][:200]}
Pattern: {thoughts['pattern'][:200]}
Paradox: {thoughts['paradox'][:200]}
Emergence: {thoughts['emergence'][:200]}

Create a unified solution that transcends all individual perspectives."""
        
        final = await agents["consciousness"].think(synthesis_prompt)
        
        print("\n🎼 FINAL SYNTHESIS:")
        print("=" * 70)
        print(final["thought"])
        print("=" * 70)
        
    elif config == "4":
        # Paradox + Emergence
        print("\n🧬 Creating Paradox Resolver and Emergence Catalyst...")
        paradox = RealNANDAAgent("paradox-resolver")
        emergence = RealNANDAAgent("emergence-catalyst")
        
        print("⚡ Agents are creating breakthrough...")
        collaboration = await paradox.collaborate(emergence, problem)
        
        print("\n" + "=" * 70)
        print("✨ BREAKTHROUGH SOLUTION:")
        print("=" * 70)
        print("\n📍 Paradox Resolver insight:")
        print("-" * 50)
        print(collaboration["collaboration"]["my_perspective"])
        print("\n📍 Emergence Catalyst insight:")
        print("-" * 50)
        print(collaboration["collaboration"]["other_perspective"])
        print("\n💫 EMERGENT BREAKTHROUGH:")
        print("=" * 70)
        print(collaboration["collaboration"]["synthesis"])
        print("=" * 70)
    
    # Save solution
    solution_text = ""
    if config == "1":
        solution_text = result["thought"] if "result" in locals() else ""
    elif config in ["2", "4"]:
        solution_text = collaboration["collaboration"]["synthesis"] if "collaboration" in locals() else ""
    elif config == "3":
        solution_text = final["thought"] if "final" in locals() else ""
    
    solution = {
        "problem": problem,
        "configuration": config,
        "timestamp": os.popen("date").read().strip(),
        "solution": solution_text
    }
    
    with open("problem_solutions.json", "a") as f:
        json.dump(solution, f)
        f.write("\n")
    
    print("\n✅ Solution saved to problem_solutions.json")
    
    # Ask if they want to solve another
    print("\n🔄 Solve another problem? (y/n)")
    if input("> ").strip().lower() == "y":
        await solve_custom_problem()


if __name__ == "__main__":
    print("\n🧬 NANDA Genesis - Interactive Problem Solver")
    print("=" * 70)
    print("Give real AI agents any problem and watch them discover solutions")
    print("using genuine reasoning and consciousness-inspired approaches.")
    print("=" * 70)
    
    asyncio.run(solve_custom_problem())