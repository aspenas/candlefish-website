#!/usr/bin/env python3
"""
Security Dashboard Agent Context Coordinator
Optimized for Claude Opus 4.1 (2M/400K tokens)
Manages context handoffs between deployment-engineer and prompt-engineer agents
"""

import json
import yaml
import os
import hashlib
import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum
import subprocess
import pickle
import gzip

# Configuration
MAX_INPUT_TOKENS = 2_000_000
MAX_OUTPUT_TOKENS = 400_000
CONTEXT_DIR = "/Users/patricksmith/candlefish-ai/deployment/context-management"
PROJECT_ROOT = "/Users/patricksmith/candlefish-ai"

class AgentRole(Enum):
    """Available agent roles"""
    DEPLOYMENT_ENGINEER = "deployment-engineer"
    PROMPT_ENGINEER = "prompt-engineer"
    SECURITY_AUDITOR = "security-auditor"
    PERFORMANCE_OPTIMIZER = "performance-optimizer"
    CONTEXT_MANAGER = "context-manager"

class ContextPriority(Enum):
    """Context priority levels"""
    CRITICAL = 1  # Always include
    HIGH = 2      # Include if space allows
    MEDIUM = 3    # Include for relevant operations
    LOW = 4       # Optional context

@dataclass
class ContextElement:
    """Individual context element"""
    id: str
    content: Any
    priority: ContextPriority
    token_estimate: int
    category: str
    timestamp: datetime.datetime
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return {
            'id': self.id,
            'content': self.content,
            'priority': self.priority.value,
            'tokens': self.token_estimate,
            'category': self.category,
            'timestamp': self.timestamp.isoformat()
        }

@dataclass
class ContextPackage:
    """Context package for agent handoff"""
    from_agent: AgentRole
    to_agent: AgentRole
    elements: List[ContextElement]
    total_tokens: int
    metadata: Dict[str, Any]
    
    def serialize(self) -> bytes:
        """Serialize package for transmission"""
        return gzip.compress(pickle.dumps(self))
    
    @staticmethod
    def deserialize(data: bytes) -> 'ContextPackage':
        """Deserialize package"""
        return pickle.loads(gzip.decompress(data))

class ContextCoordinator:
    """Manages context for Security Dashboard deployment"""
    
    def __init__(self):
        self.context_store: Dict[str, ContextElement] = {}
        self.agent_history: List[Dict] = []
        self.token_usage = {'input': 0, 'output': 0}
        
    def estimate_tokens(self, text: str) -> int:
        """Estimate token count (rough approximation)"""
        # Claude typically uses ~1 token per 4 characters
        return len(text) // 4
    
    def add_context(self, 
                   id: str,
                   content: Any,
                   priority: ContextPriority = ContextPriority.MEDIUM,
                   category: str = "general") -> None:
        """Add context element to store"""
        if isinstance(content, dict) or isinstance(content, list):
            content_str = json.dumps(content)
        else:
            content_str = str(content)
            
        element = ContextElement(
            id=id,
            content=content,
            priority=priority,
            token_estimate=self.estimate_tokens(content_str),
            category=category,
            timestamp=datetime.datetime.now()
        )
        
        self.context_store[id] = element
        print(f"✅ Added context '{id}' ({element.token_estimate} tokens)")
    
    def get_deployment_status(self) -> Dict:
        """Get current deployment status"""
        status = {
            'timestamp': datetime.datetime.now().isoformat(),
            'services': {},
            'kubernetes': {},
            'health_checks': []
        }
        
        # Check Docker services
        try:
            result = subprocess.run(['docker', 'ps', '--format', '{{.Names}}:{{.Status}}'],
                                 capture_output=True, text=True)
            for line in result.stdout.strip().split('\n'):
                if ':' in line:
                    name, status_text = line.split(':', 1)
                    if 'security' in name.lower():
                        status['services'][name] = 'running' if 'Up' in status_text else 'stopped'
        except Exception as e:
            status['services']['error'] = str(e)
        
        # Check Kubernetes if available
        try:
            result = subprocess.run(['kubectl', 'get', 'pods', '-n', 'security-dashboard',
                                   '-o', 'json'], capture_output=True, text=True)
            if result.returncode == 0:
                pods = json.loads(result.stdout)
                status['kubernetes']['pods'] = len(pods.get('items', []))
                status['kubernetes']['ready'] = sum(1 for pod in pods.get('items', [])
                                                   if pod['status']['phase'] == 'Running')
        except:
            status['kubernetes']['status'] = 'not connected'
        
        return status
    
    def load_core_context(self) -> None:
        """Load core context elements"""
        # Infrastructure context
        self.add_context(
            'infrastructure',
            {
                'aws_account': '681214184463',
                'region': 'us-east-1',
                'cluster': 'security-dashboard-eks',
                'namespace': 'security-dashboard'
            },
            ContextPriority.CRITICAL,
            'infrastructure'
        )
        
        # Deployment configuration
        with open(f'{CONTEXT_DIR}/deployment-context-snapshot.yaml', 'r') as f:
            deployment_config = yaml.safe_load(f)
            self.add_context(
                'deployment_config',
                deployment_config,
                ContextPriority.HIGH,
                'deployment'
            )
        
        # Current status
        self.add_context(
            'current_status',
            self.get_deployment_status(),
            ContextPriority.HIGH,
            'status'
        )
    
    def create_package_for_agent(self, 
                                 from_agent: AgentRole,
                                 to_agent: AgentRole,
                                 token_budget: int = 50000) -> ContextPackage:
        """Create optimized context package for specific agent"""
        
        relevant_elements = []
        
        # Determine what context the target agent needs
        if to_agent == AgentRole.DEPLOYMENT_ENGINEER:
            categories = ['infrastructure', 'deployment', 'status', 'commands']
            priorities = [ContextPriority.CRITICAL, ContextPriority.HIGH]
            
        elif to_agent == AgentRole.PROMPT_ENGINEER:
            categories = ['optimization', 'metrics', 'performance']
            priorities = [ContextPriority.HIGH, ContextPriority.MEDIUM]
            
        elif to_agent == AgentRole.SECURITY_AUDITOR:
            categories = ['security', 'compliance', 'audit']
            priorities = [ContextPriority.CRITICAL, ContextPriority.HIGH]
            
        else:
            categories = ['general', 'status']
            priorities = list(ContextPriority)
        
        # Select relevant elements within token budget
        total_tokens = 0
        for priority in sorted(priorities, key=lambda p: p.value):
            for element_id, element in self.context_store.items():
                if (element.priority == priority and 
                    element.category in categories and
                    total_tokens + element.token_estimate <= token_budget):
                    relevant_elements.append(element)
                    total_tokens += element.token_estimate
        
        # Create package
        package = ContextPackage(
            from_agent=from_agent,
            to_agent=to_agent,
            elements=relevant_elements,
            total_tokens=total_tokens,
            metadata={
                'created': datetime.datetime.now().isoformat(),
                'token_budget': token_budget,
                'utilization': f"{(total_tokens/token_budget)*100:.1f}%"
            }
        )
        
        # Log handoff
        self.agent_history.append({
            'timestamp': datetime.datetime.now().isoformat(),
            'from': from_agent.value,
            'to': to_agent.value,
            'tokens': total_tokens,
            'elements': len(relevant_elements)
        })
        
        print(f"\n📦 Context Package Created")
        print(f"   From: {from_agent.value}")
        print(f"   To: {to_agent.value}")
        print(f"   Elements: {len(relevant_elements)}")
        print(f"   Tokens: {total_tokens:,} / {token_budget:,} ({package.metadata['utilization']})")
        
        return package
    
    def compress_context(self, elements: List[ContextElement]) -> List[ContextElement]:
        """Compress context elements to reduce token usage"""
        compressed = []
        
        for element in elements:
            # Skip compression for critical elements
            if element.priority == ContextPriority.CRITICAL:
                compressed.append(element)
                continue
            
            # Compress based on content type
            if isinstance(element.content, dict):
                # Remove verbose fields
                compressed_content = {k: v for k, v in element.content.items()
                                    if not k.startswith('_') and k not in ['description', 'comments']}
                
                compressed.append(ContextElement(
                    id=element.id,
                    content=compressed_content,
                    priority=element.priority,
                    token_estimate=self.estimate_tokens(json.dumps(compressed_content)),
                    category=element.category,
                    timestamp=element.timestamp
                ))
            else:
                compressed.append(element)
        
        return compressed
    
    def generate_handoff_summary(self, package: ContextPackage) -> str:
        """Generate human-readable handoff summary"""
        summary = f"""
# Context Handoff Summary
**From:** {package.from_agent.value}
**To:** {package.to_agent.value}
**Time:** {package.metadata['created']}
**Token Usage:** {package.total_tokens:,} ({package.metadata['utilization']})

## Included Context Elements

"""
        # Group by category
        by_category = {}
        for element in package.elements:
            if element.category not in by_category:
                by_category[element.category] = []
            by_category[element.category].append(element)
        
        for category, elements in by_category.items():
            summary += f"### {category.title()} ({len(elements)} items)\n"
            for element in elements[:3]:  # Show first 3
                summary += f"- {element.id} ({element.token_estimate} tokens)\n"
            if len(elements) > 3:
                summary += f"- ... and {len(elements)-3} more\n"
            summary += "\n"
        
        return summary
    
    def track_token_usage(self, input_tokens: int, output_tokens: int) -> None:
        """Track token usage for cost management"""
        self.token_usage['input'] += input_tokens
        self.token_usage['output'] += output_tokens
        
        # Calculate cost (Opus 4.1 pricing)
        input_cost = (input_tokens / 1_000_000) * 15  # $15 per 1M input tokens
        output_cost = (output_tokens / 1_000_000) * 75  # $75 per 1M output tokens
        total_cost = input_cost + output_cost
        
        print(f"\n💰 Token Usage Update")
        print(f"   Input: {input_tokens:,} tokens (${input_cost:.2f})")
        print(f"   Output: {output_tokens:,} tokens (${output_cost:.2f})")
        print(f"   Total Cost: ${total_cost:.2f}")
        print(f"   Session Total: {self.token_usage['input']:,} / {self.token_usage['output']:,}")
    
    def save_state(self, filepath: str = None) -> None:
        """Save coordinator state"""
        if filepath is None:
            filepath = f"{CONTEXT_DIR}/coordinator-state-{datetime.datetime.now():%Y%m%d-%H%M%S}.pkl"
        
        with open(filepath, 'wb') as f:
            pickle.dump({
                'context_store': self.context_store,
                'agent_history': self.agent_history,
                'token_usage': self.token_usage
            }, f)
        
        print(f"✅ State saved to {filepath}")
    
    def load_state(self, filepath: str) -> None:
        """Load coordinator state"""
        with open(filepath, 'rb') as f:
            state = pickle.load(f)
            self.context_store = state['context_store']
            self.agent_history = state['agent_history']
            self.token_usage = state['token_usage']
        
        print(f"✅ State loaded from {filepath}")

def main():
    """Main execution for agent coordination"""
    coordinator = ContextCoordinator()
    
    # Load core context
    print("🚀 Initializing Context Coordinator")
    coordinator.load_core_context()
    
    # Add deployment-specific context
    coordinator.add_context(
        'deployment_commands',
        {
            'build': 'docker build -f Dockerfile.security-dashboard .',
            'deploy': 'kubectl apply -f deployment/k8s/security-dashboard/',
            'rollback': './scripts/deployment/rollback-procedures.sh',
            'validate': 'curl -k https://security.candlefish.ai/health'
        },
        ContextPriority.HIGH,
        'commands'
    )
    
    # Add current issues if any
    coordinator.add_context(
        'current_issues',
        {
            'none': 'System operating normally',
            'monitoring': 'All health checks passing'
        },
        ContextPriority.MEDIUM,
        'status'
    )
    
    # Create deployment package
    deployment_package = coordinator.create_package_for_agent(
        from_agent=AgentRole.CONTEXT_MANAGER,
        to_agent=AgentRole.DEPLOYMENT_ENGINEER,
        token_budget=50000
    )
    
    # Generate summary
    summary = coordinator.generate_handoff_summary(deployment_package)
    print(summary)
    
    # Save package
    package_file = f"{CONTEXT_DIR}/deployment-package-{datetime.datetime.now():%Y%m%d-%H%M%S}.pkl"
    with open(package_file, 'wb') as f:
        f.write(deployment_package.serialize())
    
    print(f"\n📁 Package saved to: {package_file}")
    
    # Track example usage
    coordinator.track_token_usage(
        input_tokens=deployment_package.total_tokens,
        output_tokens=8000  # Example output
    )
    
    # Save state
    coordinator.save_state()
    
    print("\n✨ Context coordination complete!")
    print(f"   Total elements: {len(coordinator.context_store)}")
    print(f"   Agent handoffs: {len(coordinator.agent_history)}")
    print(f"   Efficiency: {(deployment_package.total_tokens/MAX_INPUT_TOKENS)*100:.2f}% of budget")

if __name__ == "__main__":
    main()