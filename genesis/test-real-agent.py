#!/usr/bin/env python3
"""
Test a single real NANDA agent with minimal API calls
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
RealConsciousnessMesh = real_agent.RealConsciousnessMesh

async def test_single_agent():
    """Test a single real AI agent"""
    print("=" * 70)
    print("🧬 TESTING REAL NANDA AGENT - SINGLE AGENT")
    print("=" * 70)
    
    # Load API key from environment or AWS
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
                print("✅ API key loaded from AWS Secrets Manager")
        except Exception as e:
            print(f"❌ Error loading API key: {e}")
            return
    
    # Create a single agent
    print("\n🌟 Creating Discovery Engine agent...")
    agent = RealNANDAAgent("discovery-engine")
    print(f"   Agent ID: {agent.agent_id}")
    print(f"   Type: {agent.agent_type}")
    
    # Give it a single problem
    problem = "How can we create truly novel solutions that surprise even their creators?"
    print(f"\n🎯 Problem: {problem}")
    print("\n💭 Agent is thinking (this will make a real API call to Claude)...")
    
    # Get the agent's thought
    thought = await agent.think(problem)
    
    print("\n✨ Agent's Response:")
    print("-" * 50)
    print(thought["thought"][:1000])  # First 1000 chars
    if len(thought["thought"]) > 1000:
        print("... [truncated]")
    print("-" * 50)
    
    print(f"\n📊 Analysis:")
    print(f"   Confidence: {thought['confidence']:.1%}")
    print(f"   Is Discovery: {thought['is_discovery']}")
    print(f"   Agent Type: {thought['agent_type']}")
    
    print("\n" + "=" * 70)
    print("✅ Test completed successfully!")
    print("This was a REAL AI agent using Claude's actual reasoning capabilities.")
    print("=" * 70)


async def test_collaboration():
    """Test two agents collaborating"""
    print("=" * 70)
    print("🧬 TESTING REAL AGENT COLLABORATION")
    print("=" * 70)
    
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
        except:
            print("❌ Could not load API key")
            return
    
    # Create two agents
    print("\n🌟 Creating two agents...")
    discovery_agent = RealNANDAAgent("discovery-engine")
    pattern_agent = RealNANDAAgent("pattern-synthesizer")
    
    print(f"   Discovery Engine: {discovery_agent.agent_id}")
    print(f"   Pattern Synthesizer: {pattern_agent.agent_id}")
    
    # Have them collaborate
    problem = "Find a pattern that connects consciousness to mathematics"
    print(f"\n🎯 Collaborative Problem: {problem}")
    print("\n🤝 Agents are collaborating (2 API calls)...")
    
    collaboration = await discovery_agent.collaborate(pattern_agent, problem)
    
    print("\n✨ Collaboration Results:")
    print("-" * 50)
    print(f"Discovery Engine perspective (excerpt):")
    print(collaboration["collaboration"]["my_perspective"][:300])
    print("\nPattern Synthesizer perspective (excerpt):")
    print(collaboration["collaboration"]["other_perspective"][:300])
    print("\n🎼 Synthesized Insight:")
    print(collaboration["collaboration"]["synthesis"][:500])
    print("-" * 50)
    
    print("\n" + "=" * 70)
    print("✅ Collaboration test completed!")
    print("=" * 70)


if __name__ == "__main__":
    print("\nChoose test mode:")
    print("1. Test single agent (1 API call)")
    print("2. Test collaboration (2-3 API calls)")
    print("3. Exit")
    
    choice = input("\nEnter choice (1-3): ").strip()
    
    if choice == "1":
        asyncio.run(test_single_agent())
    elif choice == "2":
        asyncio.run(test_collaboration())
    else:
        print("Exiting...")