/**
 * Dependency Resolver
 * Handles circular reference detection and calculation order optimization
 * Manages the dependency graph for 14,683 formulas
 */

import { DependencyNode } from './types';

export class DependencyResolver {
  private nodes: Map<string, DependencyNode> = new Map();
  private calculationOrder: string[] = [];
  private circularReferences: string[][] = [];
  private maxIterations: number = 100;

  constructor(maxIterations: number = 100) {
    this.maxIterations = maxIterations;
  }

  /**
   * Add a node to the dependency graph
   */
  addNode(node: DependencyNode): void {
    this.nodes.set(node.id, { ...node });
    this.calculationOrder = []; // Invalidate calculation order
  }

  /**
   * Remove a node from the dependency graph
   */
  removeNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    // Remove this node from all dependents
    for (const dependentId of node.dependents) {
      const dependent = this.nodes.get(dependentId);
      if (dependent) {
        dependent.dependencies.delete(nodeId);
      }
    }

    // Remove this node from all dependencies
    for (const dependencyId of node.dependencies) {
      const dependency = this.nodes.get(dependencyId);
      if (dependency) {
        dependency.dependents.delete(nodeId);
      }
    }

    this.nodes.delete(nodeId);
    this.calculationOrder = []; // Invalidate calculation order
  }

  /**
   * Build the dependency graph relationships
   */
  buildGraph(): void {
    // Clear existing relationships
    for (const node of this.nodes.values()) {
      node.dependents.clear();
    }

    // Build dependents relationships
    for (const node of this.nodes.values()) {
      for (const depId of node.dependencies) {
        const dependency = this.nodes.get(depId);
        if (dependency) {
          dependency.dependents.add(node.id);
        }
      }
    }

    // Detect circular references
    this.detectCircularReferences();

    // Calculate optimal order
    this.calculateOrder();
  }

  /**
   * Detect circular references in the dependency graph
   */
  private detectCircularReferences(): void {
    this.circularReferences = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const currentPath: string[] = [];

    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        this.detectCircularDFS(nodeId, visited, recursionStack, currentPath);
      }
    }
  }

  /**
   * DFS helper for circular reference detection
   */
  private detectCircularDFS(
    nodeId: string,
    visited: Set<string>,
    recursionStack: Set<string>,
    currentPath: string[]
  ): void {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    currentPath.push(nodeId);

    const node = this.nodes.get(nodeId);
    if (!node) return;

    for (const depId of node.dependencies) {
      if (!this.nodes.has(depId)) continue;

      if (!visited.has(depId)) {
        this.detectCircularDFS(depId, visited, recursionStack, currentPath);
      } else if (recursionStack.has(depId)) {
        // Found circular reference
        const cycleStart = currentPath.indexOf(depId);
        if (cycleStart !== -1) {
          const cycle = currentPath.slice(cycleStart).concat([depId]);
          this.circularReferences.push(cycle);
        }
      }
    }

    recursionStack.delete(nodeId);
    currentPath.pop();
  }

  /**
   * Calculate optimal calculation order using topological sort
   */
  private calculateOrder(): void {
    const visited = new Set<string>();
    const tempStack: string[] = [];
    const order: string[] = [];

    // Handle circular references by breaking cycles
    const modifiedGraph = this.createAcyclicGraph();

    // Perform topological sort on modified graph
    for (const nodeId of modifiedGraph.keys()) {
      if (!visited.has(nodeId)) {
        this.topologicalSortDFS(nodeId, visited, tempStack, order, modifiedGraph);
      }
    }

    this.calculationOrder = order.reverse();
  }

  /**
   * Create acyclic version of graph by breaking circular references
   */
  private createAcyclicGraph(): Map<string, Set<string>> {
    const acyclicGraph = new Map<string, Set<string>>();

    // Initialize with all nodes
    for (const [nodeId, node] of this.nodes) {
      acyclicGraph.set(nodeId, new Set(node.dependencies));
    }

    // Break circular references
    for (const cycle of this.circularReferences) {
      if (cycle.length > 1) {
        // Remove the edge from the last node to the first node in the cycle
        const lastNode = cycle[cycle.length - 2];
        const firstNode = cycle[0];
        const deps = acyclicGraph.get(lastNode);
        if (deps) {
          deps.delete(firstNode);
        }
      }
    }

    return acyclicGraph;
  }

  /**
   * DFS for topological sort
   */
  private topologicalSortDFS(
    nodeId: string,
    visited: Set<string>,
    tempStack: string[],
    order: string[],
    graph: Map<string, Set<string>>
  ): void {
    visited.add(nodeId);
    tempStack.push(nodeId);

    const dependencies = graph.get(nodeId) || new Set();

    for (const depId of dependencies) {
      if (graph.has(depId) && !visited.has(depId)) {
        this.topologicalSortDFS(depId, visited, tempStack, order, graph);
      }
    }

    tempStack.pop();
    order.push(nodeId);
  }

  /**
   * Get calculation order for all nodes or specific subset
   */
  getCalculationOrder(subset?: Set<string>): string[] {
    if (this.calculationOrder.length === 0) {
      this.calculateOrder();
    }

    if (!subset) {
      return [...this.calculationOrder];
    }

    // Filter order to include only subset nodes
    return this.calculationOrder.filter(nodeId => subset.has(nodeId));
  }

  /**
   * Mark nodes as dirty and return all affected nodes
   */
  markDirty(changedNodes: string[]): Set<string> {
    const affectedNodes = new Set<string>();
    const queue = [...changedNodes];

    // Mark initial nodes as dirty
    for (const nodeId of changedNodes) {
      const node = this.nodes.get(nodeId);
      if (node) {
        node.dirty = true;
        affectedNodes.add(nodeId);
      }
    }

    // Propagate dirty status to dependents
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const current = this.nodes.get(currentId);
      if (!current) continue;

      for (const dependentId of current.dependents) {
        const dependent = this.nodes.get(dependentId);
        if (dependent && !dependent.dirty) {
          dependent.dirty = true;
          affectedNodes.add(dependentId);
          queue.push(dependentId);
        }
      }
    }

    return affectedNodes;
  }

  /**
   * Clear dirty flags for all nodes
   */
  clearDirtyFlags(): void {
    for (const node of this.nodes.values()) {
      node.dirty = false;
    }
  }

  /**
   * Get all nodes that depend on a given node
   */
  getDependents(nodeId: string): string[] {
    const node = this.nodes.get(nodeId);
    return node ? Array.from(node.dependents) : [];
  }

  /**
   * Get all nodes that a given node depends on
   */
  getDependencies(nodeId: string): string[] {
    const node = this.nodes.get(nodeId);
    return node ? Array.from(node.dependencies) : [];
  }

  /**
   * Check if there's a dependency path from source to target
   */
  hasDependencyPath(sourceId: string, targetId: string): boolean {
    if (sourceId === targetId) return true;

    const visited = new Set<string>();
    const queue = [sourceId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const current = this.nodes.get(currentId);
      if (!current) continue;

      for (const depId of current.dependencies) {
        if (depId === targetId) return true;
        if (!visited.has(depId)) {
          queue.push(depId);
        }
      }
    }

    return false;
  }

  /**
   * Add dependency relationship
   */
  addDependency(fromNodeId: string, toNodeId: string): void {
    const fromNode = this.nodes.get(fromNodeId);
    const toNode = this.nodes.get(toNodeId);

    if (!fromNode || !toNode) {
      throw new Error(`Node not found: ${fromNodeId} or ${toNodeId}`);
    }

    // Check if adding this dependency would create a cycle
    if (this.hasDependencyPath(toNodeId, fromNodeId)) {
      throw new Error(`Adding dependency would create circular reference: ${fromNodeId} -> ${toNodeId}`);
    }

    fromNode.dependencies.add(toNodeId);
    toNode.dependents.add(fromNodeId);

    this.calculationOrder = []; // Invalidate calculation order
  }

  /**
   * Remove dependency relationship
   */
  removeDependency(fromNodeId: string, toNodeId: string): void {
    const fromNode = this.nodes.get(fromNodeId);
    const toNode = this.nodes.get(toNodeId);

    if (fromNode) {
      fromNode.dependencies.delete(toNodeId);
    }

    if (toNode) {
      toNode.dependents.delete(fromNodeId);
    }

    this.calculationOrder = []; // Invalidate calculation order
  }

  /**
   * Get circular references detected in the graph
   */
  getCircularReferences(): string[][] {
    return [...this.circularReferences];
  }

  /**
   * Resolve circular references using iterative calculation
   */
  resolveCircularReferences(): Map<string, { converged: boolean; iterations: number; finalValue: any }> {
    const results = new Map();

    for (const cycle of this.circularReferences) {
      const cycleResults = this.resolveCircularCycle(cycle);
      for (const [nodeId, result] of cycleResults) {
        results.set(nodeId, result);
      }
    }

    return results;
  }

  /**
   * Resolve a single circular reference cycle
   */
  private resolveCircularCycle(cycle: string[]): Map<string, { converged: boolean; iterations: number; finalValue: any }> {
    const results = new Map();
    const epsilon = 1e-10;
    const previousValues = new Map<string, any>();

    // Initialize previous values
    for (const nodeId of cycle) {
      const node = this.nodes.get(nodeId);
      previousValues.set(nodeId, node?.value ?? 0);
    }

    let converged = false;
    let iteration = 0;

    while (!converged && iteration < this.maxIterations) {
      converged = true;
      iteration++;

      for (const nodeId of cycle) {
        const node = this.nodes.get(nodeId);
        if (!node?.formula) continue;

        // Calculate new value based on current dependency values
        // This would need integration with the formula executor
        const newValue = this.calculateNodeValue(nodeId);
        const previousValue = previousValues.get(nodeId) ?? 0;

        // Check convergence
        const difference = Math.abs(Number(newValue) - Number(previousValue));
        if (difference > epsilon) {
          converged = false;
        }

        previousValues.set(nodeId, newValue);
        if (node) {
          node.value = newValue;
        }
      }
    }

    // Record results for all nodes in cycle
    for (const nodeId of cycle) {
      results.set(nodeId, {
        converged,
        iterations: iteration,
        finalValue: previousValues.get(nodeId)
      });
    }

    return results;
  }

  /**
   * Calculate node value (placeholder - would integrate with formula executor)
   */
  private calculateNodeValue(nodeId: string): any {
    const node = this.nodes.get(nodeId);
    if (!node) return 0;

    // This is a placeholder - in real implementation, this would
    // integrate with the FormulaExecutor to calculate the actual value
    return node.value ?? 0;
  }

  /**
   * Get graph statistics
   */
  getStats(): {
    totalNodes: number;
    totalEdges: number;
    circularReferences: number;
    maxDepth: number;
    averageDependencies: number;
  } {
    let totalEdges = 0;
    let totalDependencies = 0;

    for (const node of this.nodes.values()) {
      const depCount = node.dependencies.size;
      totalEdges += depCount;
      totalDependencies += depCount;
    }

    return {
      totalNodes: this.nodes.size,
      totalEdges,
      circularReferences: this.circularReferences.length,
      maxDepth: this.calculateMaxDepth(),
      averageDependencies: this.nodes.size > 0 ? totalDependencies / this.nodes.size : 0
    };
  }

  /**
   * Calculate maximum dependency depth
   */
  private calculateMaxDepth(): number {
    let maxDepth = 0;
    const visited = new Set<string>();

    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        const depth = this.calculateDepthDFS(nodeId, new Set(), visited);
        maxDepth = Math.max(maxDepth, depth);
      }
    }

    return maxDepth;
  }

  /**
   * DFS helper for depth calculation
   */
  private calculateDepthDFS(nodeId: string, currentPath: Set<string>, globalVisited: Set<string>): number {
    if (currentPath.has(nodeId)) {
      return 0; // Circular reference, don't count
    }

    globalVisited.add(nodeId);
    currentPath.add(nodeId);

    let maxChildDepth = 0;
    const node = this.nodes.get(nodeId);

    if (node) {
      for (const depId of node.dependencies) {
        if (this.nodes.has(depId)) {
          const childDepth = this.calculateDepthDFS(depId, currentPath, globalVisited);
          maxChildDepth = Math.max(maxChildDepth, childDepth);
        }
      }
    }

    currentPath.delete(nodeId);
    return maxChildDepth + 1;
  }

  /**
   * Export dependency graph for analysis
   */
  exportGraph(): any {
    const nodes = Array.from(this.nodes.entries()).map(([id, node]) => ({
      id,
      formula: node.formula,
      dependencies: Array.from(node.dependencies),
      dependents: Array.from(node.dependents),
      dirty: node.dirty,
      error: node.error
    }));

    return {
      nodes,
      calculationOrder: this.calculationOrder,
      circularReferences: this.circularReferences,
      stats: this.getStats()
    };
  }

  /**
   * Import dependency graph
   */
  importGraph(graphData: any): void {
    this.nodes.clear();
    this.calculationOrder = [];
    this.circularReferences = [];

    if (graphData.nodes) {
      for (const nodeData of graphData.nodes) {
        this.nodes.set(nodeData.id, {
          id: nodeData.id,
          formula: nodeData.formula,
          dependencies: new Set(nodeData.dependencies || []),
          dependents: new Set(nodeData.dependents || []),
          dirty: nodeData.dirty ?? true,
          error: nodeData.error,
          value: nodeData.value
        });
      }
    }

    if (graphData.calculationOrder) {
      this.calculationOrder = [...graphData.calculationOrder];
    }

    if (graphData.circularReferences) {
      this.circularReferences = [...graphData.circularReferences];
    }
  }

  /**
   * Validate graph integrity
   */
  validateGraph(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check that all dependencies exist
    for (const [nodeId, node] of this.nodes) {
      for (const depId of node.dependencies) {
        if (!this.nodes.has(depId)) {
          errors.push(`Node ${nodeId} has missing dependency: ${depId}`);
        }
      }

      for (const depId of node.dependents) {
        if (!this.nodes.has(depId)) {
          errors.push(`Node ${nodeId} has missing dependent: ${depId}`);
        }
      }
    }

    // Check bidirectional relationships
    for (const [nodeId, node] of this.nodes) {
      for (const depId of node.dependencies) {
        const depNode = this.nodes.get(depId);
        if (depNode && !depNode.dependents.has(nodeId)) {
          errors.push(`Missing reverse dependency: ${depId} should depend on ${nodeId}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
