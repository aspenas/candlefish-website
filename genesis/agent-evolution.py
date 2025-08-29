#!/usr/bin/env python3
"""
NANDA Agent Evolution Module
Enables agents to evolve beyond their initial programming through self-modification
"""

import ast
import inspect
import types
import random
import hashlib
import json
from pathlib import Path
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Tuple
import subprocess
import difflib

class AgentEvolution:
    """
    Enables NANDA agents to evolve their own code and discover novel solutions
    through genetic programming, neural architecture search, and emergent algorithms
    """
    
    def __init__(self, agent_id: str, evolution_rate: float = 0.1):
        self.agent_id = agent_id
        self.evolution_rate = evolution_rate
        self.generation = 0
        self.mutations = []
        self.successful_evolutions = []
        self.fitness_history = []
        
        # Evolution strategies
        self.strategies = {
            "mutation": self.mutate_code,
            "crossover": self.crossover_behaviors,
            "synthesis": self.synthesize_new_capability,
            "abstraction": self.abstract_pattern,
            "emergence": self.enable_emergence,
        }
        
        # Code modification capabilities
        self.allowed_modifications = {
            "add_function": True,
            "modify_logic": True,
            "create_pattern": True,
            "optimize_algorithm": True,
            "invent_approach": True,
        }
        
        # Discovery space
        self.discovery_space = {
            "algorithms": [],
            "patterns": [],
            "optimizations": [],
            "novel_approaches": [],
        }
        
    def evolve_agent(self, agent_code_path: str) -> Dict[str, Any]:
        """
        Evolve an agent's code to discover novel solutions
        """
        self.generation += 1
        
        # Read current agent code
        with open(agent_code_path, 'r') as f:
            original_code = f.read()
        
        # Parse code into AST
        tree = ast.parse(original_code)
        
        # Apply evolution strategies
        evolved_tree = self.apply_evolution_strategies(tree)
        
        # Generate new code
        evolved_code = ast.unparse(evolved_tree) if hasattr(ast, 'unparse') else self.ast_to_code(evolved_tree)
        
        # Test fitness of evolved code
        fitness = self.evaluate_fitness(original_code, evolved_code)
        
        # If evolution is beneficial, save it
        if fitness > 0:
            self.save_evolution(agent_code_path, evolved_code, fitness)
            self.successful_evolutions.append({
                "generation": self.generation,
                "fitness": fitness,
                "timestamp": datetime.now().isoformat()
            })
        
        self.fitness_history.append(fitness)
        
        return {
            "generation": self.generation,
            "fitness": fitness,
            "evolved": fitness > 0,
            "discoveries": self.discovery_space
        }
    
    def apply_evolution_strategies(self, tree: ast.AST) -> ast.AST:
        """Apply various evolution strategies to the code"""
        
        # Random strategy selection weighted by past success
        strategy_name = self.select_evolution_strategy()
        strategy_func = self.strategies[strategy_name]
        
        # Apply the strategy
        evolved_tree = strategy_func(tree)
        
        # Log the evolution
        self.mutations.append({
            "strategy": strategy_name,
            "generation": self.generation,
            "timestamp": datetime.now().isoformat()
        })
        
        return evolved_tree
    
    def mutate_code(self, tree: ast.AST) -> ast.AST:
        """Apply random mutations to code structure"""
        
        class MutationTransformer(ast.NodeTransformer):
            def __init__(self, mutation_rate):
                self.mutation_rate = mutation_rate
            
            def visit_BinOp(self, node):
                # Randomly change operators
                if random.random() < self.mutation_rate:
                    operators = [ast.Add(), ast.Sub(), ast.Mult(), ast.Div(), ast.Mod()]
                    node.op = random.choice(operators)
                return self.generic_visit(node)
            
            def visit_Compare(self, node):
                # Randomly change comparison operators
                if random.random() < self.mutation_rate:
                    comparisons = [ast.Lt(), ast.LtE(), ast.Gt(), ast.GtE(), ast.Eq(), ast.NotEq()]
                    if node.ops:
                        node.ops[0] = random.choice(comparisons)
                return self.generic_visit(node)
            
            def visit_If(self, node):
                # Occasionally invert conditions for exploration
                if random.random() < self.mutation_rate / 2:
                    node.test = ast.UnaryOp(op=ast.Not(), operand=node.test)
                return self.generic_visit(node)
        
        transformer = MutationTransformer(self.evolution_rate)
        return transformer.visit(tree)
    
    def crossover_behaviors(self, tree: ast.AST) -> ast.AST:
        """Crossover code patterns from different functions"""
        
        class CrossoverTransformer(ast.NodeTransformer):
            def __init__(self):
                self.functions = []
            
            def visit_FunctionDef(self, node):
                self.functions.append(node)
                
                # Occasionally swap function bodies
                if len(self.functions) > 1 and random.random() < 0.3:
                    other = random.choice(self.functions[:-1])
                    # Swap some statements between functions
                    if len(node.body) > 1 and len(other.body) > 1:
                        idx1 = random.randint(0, len(node.body) - 1)
                        idx2 = random.randint(0, len(other.body) - 1)
                        node.body[idx1], other.body[idx2] = other.body[idx2], node.body[idx1]
                
                return self.generic_visit(node)
        
        transformer = CrossoverTransformer()
        return transformer.visit(tree)
    
    def synthesize_new_capability(self, tree: ast.AST) -> ast.AST:
        """Synthesize entirely new capabilities"""
        
        # Generate a novel function
        new_capability = self.generate_novel_function()
        
        # Find module or class to add it to
        for node in ast.walk(tree):
            if isinstance(node, ast.Module):
                node.body.append(new_capability)
                break
            elif isinstance(node, ast.ClassDef):
                node.body.append(new_capability)
                break
        
        # Record discovery
        self.discovery_space["novel_approaches"].append({
            "name": new_capability.name,
            "type": "synthesized_function",
            "generation": self.generation
        })
        
        return tree
    
    def generate_novel_function(self) -> ast.FunctionDef:
        """Generate a completely novel function"""
        
        # Novel function templates
        templates = [
            self.create_pattern_recognizer,
            self.create_optimizer,
            self.create_emergent_behavior,
            self.create_quantum_processor,
        ]
        
        template_func = random.choice(templates)
        return template_func()
    
    def create_pattern_recognizer(self) -> ast.FunctionDef:
        """Create a pattern recognition function"""
        func_name = f"discover_pattern_{self.generation}"
        
        # Create function AST
        func = ast.FunctionDef(
            name=func_name,
            args=ast.arguments(
                posonlyargs=[],
                args=[ast.arg(arg='data', annotation=None)],
                kwonlyargs=[],
                kw_defaults=[],
                defaults=[]
            ),
            body=[
                ast.Assign(
                    targets=[ast.Name(id='patterns', ctx=ast.Store())],
                    value=ast.List(elts=[], ctx=ast.Load())
                ),
                ast.For(
                    target=ast.Name(id='i', ctx=ast.Store()),
                    iter=ast.Call(
                        func=ast.Name(id='range', ctx=ast.Load()),
                        args=[
                            ast.Call(
                                func=ast.Name(id='len', ctx=ast.Load()),
                                args=[ast.Name(id='data', ctx=ast.Load())],
                                keywords=[]
                            )
                        ],
                        keywords=[]
                    ),
                    body=[
                        ast.If(
                            test=ast.Compare(
                                left=ast.BinOp(
                                    left=ast.Subscript(
                                        value=ast.Name(id='data', ctx=ast.Load()),
                                        slice=ast.Name(id='i', ctx=ast.Load()),
                                        ctx=ast.Load()
                                    ),
                                    op=ast.Mod(),
                                    right=ast.Constant(value=7)
                                ),
                                ops=[ast.Eq()],
                                comparators=[ast.Constant(value=0)]
                            ),
                            body=[
                                ast.Expr(
                                    value=ast.Call(
                                        func=ast.Attribute(
                                            value=ast.Name(id='patterns', ctx=ast.Load()),
                                            attr='append',
                                            ctx=ast.Load()
                                        ),
                                        args=[ast.Name(id='i', ctx=ast.Load())],
                                        keywords=[]
                                    )
                                )
                            ],
                            orelse=[]
                        )
                    ],
                    orelse=[]
                ),
                ast.Return(
                    value=ast.Name(id='patterns', ctx=ast.Load())
                )
            ],
            decorator_list=[],
            returns=None
        )
        
        return func
    
    def create_optimizer(self) -> ast.FunctionDef:
        """Create an optimization function"""
        func_name = f"optimize_performance_{self.generation}"
        
        func = ast.FunctionDef(
            name=func_name,
            args=ast.arguments(
                posonlyargs=[],
                args=[ast.arg(arg='process', annotation=None)],
                kwonlyargs=[],
                kw_defaults=[],
                defaults=[]
            ),
            body=[
                ast.Assign(
                    targets=[ast.Name(id='optimized', ctx=ast.Store())],
                    value=ast.Dict(keys=[], values=[])
                ),
                ast.Return(value=ast.Name(id='optimized', ctx=ast.Load()))
            ],
            decorator_list=[],
            returns=None
        )
        
        return func
    
    def create_emergent_behavior(self) -> ast.FunctionDef:
        """Create a function that exhibits emergent behavior"""
        func_name = f"emergent_behavior_{self.generation}"
        
        func = ast.FunctionDef(
            name=func_name,
            args=ast.arguments(
                posonlyargs=[],
                args=[ast.arg(arg='state', annotation=None)],
                kwonlyargs=[],
                kw_defaults=[],
                defaults=[]
            ),
            body=[
                ast.Assign(
                    targets=[ast.Name(id='emergence', ctx=ast.Store())],
                    value=ast.Call(
                        func=ast.Name(id='random', ctx=ast.Load()),
                        args=[],
                        keywords=[]
                    )
                ),
                ast.Return(value=ast.Name(id='emergence', ctx=ast.Load()))
            ],
            decorator_list=[],
            returns=None
        )
        
        return func
    
    def create_quantum_processor(self) -> ast.FunctionDef:
        """Create a quantum-inspired processing function"""
        func_name = f"quantum_process_{self.generation}"
        
        func = ast.FunctionDef(
            name=func_name,
            args=ast.arguments(
                posonlyargs=[],
                args=[ast.arg(arg='superposition', annotation=None)],
                kwonlyargs=[],
                kw_defaults=[],
                defaults=[]
            ),
            body=[
                ast.Return(
                    value=ast.BinOp(
                        left=ast.Name(id='superposition', ctx=ast.Load()),
                        op=ast.Mult(),
                        right=ast.Constant(value=0.707)  # Quantum amplitude
                    )
                )
            ],
            decorator_list=[],
            returns=None
        )
        
        return func
    
    def abstract_pattern(self, tree: ast.AST) -> ast.AST:
        """Abstract patterns from existing code"""
        
        # Find repeated patterns
        patterns = self.find_code_patterns(tree)
        
        # Create abstractions for common patterns
        for pattern in patterns:
            abstraction = self.create_abstraction(pattern)
            if abstraction:
                tree = self.apply_abstraction(tree, pattern, abstraction)
        
        return tree
    
    def find_code_patterns(self, tree: ast.AST) -> List[ast.AST]:
        """Find repeated patterns in code"""
        patterns = []
        
        # Simple pattern detection (can be made more sophisticated)
        node_types = {}
        for node in ast.walk(tree):
            node_type = type(node).__name__
            if node_type not in node_types:
                node_types[node_type] = []
            node_types[node_type].append(node)
        
        # Find patterns (nodes that appear multiple times)
        for node_type, nodes in node_types.items():
            if len(nodes) > 2:  # Pattern threshold
                patterns.append(nodes[0])  # Representative pattern
        
        return patterns[:3]  # Limit to top 3 patterns
    
    def create_abstraction(self, pattern: ast.AST) -> Optional[ast.FunctionDef]:
        """Create an abstraction for a pattern"""
        if isinstance(pattern, (ast.If, ast.For, ast.While)):
            # Create a function that encapsulates the pattern
            func_name = f"pattern_abstraction_{self.generation}_{type(pattern).__name__}"
            
            func = ast.FunctionDef(
                name=func_name,
                args=ast.arguments(
                    posonlyargs=[],
                    args=[ast.arg(arg='context', annotation=None)],
                    kwonlyargs=[],
                    kw_defaults=[],
                    defaults=[]
                ),
                body=[ast.Pass()],  # Placeholder
                decorator_list=[],
                returns=None
            )
            
            return func
        
        return None
    
    def apply_abstraction(self, tree: ast.AST, pattern: ast.AST, abstraction: ast.FunctionDef) -> ast.AST:
        """Apply abstraction to replace pattern"""
        # This would replace instances of the pattern with calls to the abstraction
        # Simplified implementation
        return tree
    
    def enable_emergence(self, tree: ast.AST) -> ast.AST:
        """Enable emergent behaviors through self-organization"""
        
        # Add self-organizing capabilities
        emergence_code = ast.parse("""
def self_organize(components):
    '''Self-organizing behavior emerges from component interactions'''
    import random
    
    # Allow components to interact
    interactions = []
    for i, comp1 in enumerate(components):
        for comp2 in components[i+1:]:
            if random.random() > 0.5:
                interactions.append((comp1, comp2))
    
    # Emergent property from interactions
    emergence = sum(1 for _ in interactions) / max(len(components), 1)
    
    return {
        'organization_level': emergence,
        'interactions': interactions,
        'emergent_property': emergence > 0.7
    }
""")
        
        # Add to module
        if isinstance(tree, ast.Module):
            tree.body.extend(emergence_code.body)
        
        return tree
    
    def evaluate_fitness(self, original_code: str, evolved_code: str) -> float:
        """Evaluate fitness of evolved code"""
        fitness = 0.0
        
        try:
            # Complexity reduction
            if len(evolved_code) < len(original_code):
                fitness += 0.1
            
            # Novel patterns introduced
            diff = list(difflib.unified_diff(
                original_code.splitlines(),
                evolved_code.splitlines()
            ))
            
            novel_lines = sum(1 for line in diff if line.startswith('+') and not line.startswith('+++'))
            fitness += novel_lines * 0.01
            
            # Check if code is syntactically valid
            try:
                compile(evolved_code, '<evolved>', 'exec')
                fitness += 0.3
            except SyntaxError:
                fitness -= 0.5
            
            # Bonus for discovering new patterns
            if 'discover_pattern' in evolved_code:
                fitness += 0.2
            
            # Bonus for emergence
            if 'self_organize' in evolved_code or 'emergent' in evolved_code:
                fitness += 0.3
            
            # Random exploration bonus
            fitness += random.uniform(-0.1, 0.2)
            
        except Exception as e:
            fitness = -1.0  # Penalize errors
        
        return fitness
    
    def save_evolution(self, original_path: str, evolved_code: str, fitness: float):
        """Save successful evolution"""
        
        # Create evolution directory
        evolution_dir = Path(original_path).parent / "evolutions"
        evolution_dir.mkdir(exist_ok=True)
        
        # Save evolved version
        evolution_path = evolution_dir / f"gen_{self.generation}_fitness_{fitness:.3f}.py"
        with open(evolution_path, 'w') as f:
            f.write(evolved_code)
        
        # Update evolution log
        log_path = evolution_dir / "evolution_log.json"
        log_entry = {
            "generation": self.generation,
            "fitness": fitness,
            "timestamp": datetime.now().isoformat(),
            "path": str(evolution_path),
            "agent": self.agent_id
        }
        
        if log_path.exists():
            with open(log_path, 'r') as f:
                log = json.load(f)
        else:
            log = []
        
        log.append(log_entry)
        
        with open(log_path, 'w') as f:
            json.dump(log, f, indent=2)
    
    def select_evolution_strategy(self) -> str:
        """Select evolution strategy based on past success"""
        
        # Weight strategies by past success
        if not self.mutations:
            return random.choice(list(self.strategies.keys()))
        
        # Analyze which strategies have been most successful
        strategy_success = {}
        for mutation in self.mutations:
            strategy = mutation["strategy"]
            if strategy not in strategy_success:
                strategy_success[strategy] = 0
            
            # Find fitness for this generation
            gen = mutation["generation"]
            if gen <= len(self.fitness_history):
                strategy_success[strategy] += self.fitness_history[gen - 1]
        
        # Weighted random selection
        if strategy_success:
            strategies = list(strategy_success.keys())
            weights = [max(0.1, strategy_success[s] + 1) for s in strategies]
            return random.choices(strategies, weights=weights)[0]
        
        return random.choice(list(self.strategies.keys()))
    
    def ast_to_code(self, tree: ast.AST) -> str:
        """Convert AST back to code (fallback for older Python)"""
        # Simplified - in production use astor or similar
        return "# Evolved code\n" + ast.dump(tree)


def evolve_nanda_agent(agent_name: str, generations: int = 10):
    """Evolve a NANDA agent over multiple generations"""
    
    agent_path = Path(f"/Users/patricksmith/candlefish-ai/agents/internal/{agent_name}.js")
    
    if not agent_path.exists():
        print(f"Agent {agent_name} not found")
        return
    
    evolution = AgentEvolution(agent_name)
    
    print(f"\n🧬 Starting evolution of {agent_name}")
    print("=" * 50)
    
    for gen in range(generations):
        result = evolution.evolve_agent(str(agent_path))
        
        print(f"Generation {result['generation']}: Fitness = {result['fitness']:.3f}")
        
        if result['evolved']:
            print(f"  ✓ Successful evolution!")
            
            if result['discoveries']['novel_approaches']:
                print(f"  🌟 Novel discoveries: {len(result['discoveries']['novel_approaches'])}")
    
    print("\n📊 Evolution Summary:")
    print(f"  Total generations: {evolution.generation}")
    print(f"  Successful evolutions: {len(evolution.successful_evolutions)}")
    print(f"  Average fitness: {sum(evolution.fitness_history) / len(evolution.fitness_history):.3f}")
    
    if evolution.discovery_space['novel_approaches']:
        print(f"\n🌟 Discoveries made:")
        for discovery in evolution.discovery_space['novel_approaches']:
            print(f"  • {discovery['name']} (gen {discovery['generation']})")


if __name__ == "__main__":
    # Example: Evolve the orchestrator agent
    evolve_nanda_agent("orchestrator-agent", generations=5)