export interface WorkshopNote {
  id: string
  date: string
  category: 'technical' | 'operational' | 'philosophical'
  projectContext?: string
  title: string
  excerpt: string
  readTime: string
  hasCode: boolean
  hasVisualization: boolean
  tags: string[]
  content: string
}

export const workshopNotes: WorkshopNote[] = [
  {
    id: 'excel-as-truth-source',
    date: '2025.08.20',
    category: 'technical',
    projectContext: 'Pattern Study',
    title: 'Treating Excel as a Source of Truth',
    excerpt: 'Why fighting against Excel-based workflows is often the wrong approach. Observations on building systems that embrace spreadsheet reality rather than replacing it.',
    readTime: '12 min read',
    hasCode: true,
    hasVisualization: false,
    tags: ['excel', 'data-patterns', 'integration'],
    content: `
# Treating Excel as a Source of Truth

*Context: Across multiple client engagements, we've observed that Excel files often contain more operational intelligence than formal databases. Here's our approach to working with, not against, spreadsheet-based operations.*

## The Pattern

Most businesses run on Excel. This isn't a failure of technology adoption - it's a success of tool-fit. Excel provides:
- Flexibility without programming
- Visual data manipulation
- Formula-based business logic
- Collaborative editing
- Version control (even if it's "v2_FINAL_FINAL")

## The Approach

Instead of replacing Excel, we build systems that treat it as a first-class data source:

\`\`\`python
import pandas as pd
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class ExcelWatcher(FileSystemEventHandler):
    """
    Watch Excel files and extract patterns without disrupting workflow
    """

    def on_modified(self, event):
        if event.src_path.endswith('.xlsx'):
            self.process_excel_changes(event.src_path)

    def process_excel_changes(self, filepath):
        # Read with all formatting preserved
        wb = pd.ExcelFile(filepath)

        # Extract not just data, but patterns
        patterns = {
            'edit_frequency': self.calculate_edit_patterns(filepath),
            'formula_complexity': self.analyze_formulas(wb),
            'data_flow': self.trace_cell_dependencies(wb)
        }

        return patterns
\`\`\`

## Key Insights

1. **Cell colors are documentation** - They encode decisions, warnings, and tribal knowledge
2. **Formulas are business logic** - Each formula represents a business rule that evolved over time
3. **File names tell stories** - The progression from v1 to v_FINAL reveals process evolution
4. **Hidden columns hide history** - What's hidden often matters more than what's visible

## Implementation Patterns

### Pattern 1: Shadow Database
Build a database that mirrors Excel state without replacing it:

\`\`\`python
def sync_excel_to_db(excel_path, db_connection):
    """
    Maintain database shadow of Excel without disrupting Excel use
    """
    df = pd.read_excel(excel_path, sheet_name=None)

    for sheet_name, sheet_data in df.items():
        # Preserve everything, including metadata
        sheet_data.to_sql(
            f'excel_{sheet_name}',
            db_connection,
            if_exists='replace',
            index=True  # Even row numbers matter
        )

    # Store metadata separately
    store_excel_metadata(excel_path, db_connection)
\`\`\`

### Pattern 2: Formula Preservation
Extract and version control the actual business logic:

\`\`\`python
from openpyxl import load_workbook

def extract_formulas(excel_path):
    """
    Formulas are business logic - preserve them
    """
    wb = load_workbook(excel_path, data_only=False)
    formulas = {}

    for sheet in wb.worksheets:
        for row in sheet.iter_rows():
            for cell in row:
                if cell.data_type == 'f':  # Formula cell
                    formulas[f"{sheet.title}!{cell.coordinate}"] = {
                        'formula': cell.value,
                        'current_value': cell.value,
                        'dependencies': extract_dependencies(cell.value)
                    }

    return formulas
\`\`\`

## The Result

By treating Excel as a legitimate source of truth rather than technical debt:
- Adoption is immediate (nothing changes for users)
- Business logic is preserved, not recreated
- Evolution happens naturally
- Trust is maintained

## The Lesson

Sometimes the best system architecture includes Excel as a first-class citizen. The challenge isn't replacing spreadsheets - it's understanding why they persist and building systems that amplify their strengths while mitigating their weaknesses.

---

*Next: How we approach queue management in operations that "don't have queues"*
    `
  },
  {
    id: 'hidden-queue-patterns',
    date: '2025.08.18',
    category: 'operational',
    projectContext: 'Pattern Study',
    title: 'Finding Hidden Queues in Operations',
    excerpt: 'Every operation has queues, even if they don\'t call them that. How to identify and optimize the hidden waiting lines in any business.',
    readTime: '10 min read',
    hasCode: true,
    hasVisualization: false,
    tags: ['queue-theory', 'operations', 'patterns'],
    content: `
# Finding Hidden Queues in Operations

*Context: Queue theory applies everywhere, but most businesses don't recognize their queues. Here's how we identify and model hidden queuing systems.*

## The Universal Queue Pattern

Every business process has:
- **Arrivals**: Work that needs doing
- **Service**: The doing of the work
- **Waiting**: The time between arrival and service

The challenge: these elements are often invisible or unnamed.

## Common Hidden Queues

### The Email Inbox Queue
\`\`\`python
import numpy as np
from collections import defaultdict

def model_email_queue(inbox_data):
    """
    Email isn't communication - it's a queue
    """
    arrivals = inbox_data['received_times']
    responses = inbox_data['response_times']

    # Calculate queue metrics
    avg_wait = np.mean(responses - arrivals)
    queue_length = len([e for e in inbox_data if not e['responded']])

    # Little's Law: L = λW
    observation_period = max(arrivals) - min(arrivals)
    arrival_rate = len(arrivals) / observation_period
    implied_queue_length = arrival_rate * avg_wait

    return {
        'actual_queue': queue_length,
        'implied_queue': implied_queue_length,
        'queue_health': 'stable' if abs(queue_length - implied_queue_length) < 0.1 else 'unstable'
    }
\`\`\`

### The Approval Chain Queue
\`\`\`python
def trace_approval_flow(approval_logs):
    """
    Approvals are queues with human servers
    """
    stages = defaultdict(list)

    for item in approval_logs:
        stages[item['approver']].append({
            'wait_time': item['approved_at'] - item['submitted_at'],
            'processing_time': item['decided_at'] - item['reviewed_at']
        })

    # Find bottlenecks
    bottlenecks = []
    threshold = 24 * 3600  # 24 hours in seconds

    for approver, times in stages.items():
        avg_wait = np.mean([t['wait_time'] for t in times])
        if avg_wait > threshold:
            bottlenecks.append(approver)

    return bottlenecks
\`\`\`

## Optimization Without Naming

The key insight: You can optimize queues without ever calling them queues.

### Pattern: Batch Processing
\`\`\`python
def implement_batching(work_items):
    """
    'Let's handle similar things together' = queue optimization
    """
    # Group by type (hidden queue management)
    batches = defaultdict(list)
    for item in work_items:
        batches[item['type']].append(item)

    # Process in optimal order (queue scheduling)
    setup_time = {
        'type_a': 10,
        'type_b': 20,
        'type_c': 5
    }

    for batch_type in sorted(batches.keys(), key=lambda x: setup_time.get(x, 0)):
        process_batch(batches[batch_type])
\`\`\`

## Real-World Applications

### Pattern 1: The Support Ticket "Inbox"
What looks like a support inbox is actually a multi-server queue with priority classes. Recognizing this enables:
- SLA prediction based on queue depth
- Optimal agent assignment
- Backlog forecasting

### Pattern 2: The "Review Process"
Code reviews, document approvals, design sign-offs - all queues in disguise. Understanding queue dynamics helps:
- Identify reviewer bottlenecks
- Implement WIP limits
- Balance workload distribution

## The Lesson

Every operational inefficiency is likely a queue problem in disguise. The solution isn't always to eliminate the queue - sometimes it's to acknowledge it exists and optimize accordingly.

---

*Next: Why workflows resist standardization and what to do about it*
    `
  },
  {
    id: 'workflow-standardization-resistance',
    date: '2025.08.15',
    category: 'philosophical',
    projectContext: 'Pattern Study',
    title: 'Why Workflows Resist Standardization',
    excerpt: 'The harder you try to standardize workflows, the more exceptions emerge. Here\'s why embracing variation often beats enforcing uniformity.',
    readTime: '8 min read',
    hasCode: false,
    hasVisualization: false,
    tags: ['workflows', 'standardization', 'systems-thinking'],
    content: `
# Why Workflows Resist Standardization

*Context: Across every operational improvement project, we encounter the same pattern: workflows that seem similar are actually deeply different. Here's why standardization often fails and what works instead.*

## The Standardization Paradox

The more you understand a workflow, the less standard it appears. What looks like the same process performed by different people is actually:
- Different mental models achieving similar outcomes
- Accumulated workarounds that became the process
- Personal optimizations that were never documented
- Hidden dependencies that only certain people know

## The Four Workflow Personalities

We've observed four distinct patterns in how people approach the same work:

### The Builder
Starts from scratch each time, deriving the solution from first principles. Slower but handles edge cases naturally.

### The Adapter
Begins with a template and modifies it. Fast for normal cases, struggles with exceptions.

### The Intuiter
Can't explain their process but gets consistent results. Their workflow is embodied, not documented.

### The Systematizer
Has a rigid process that works perfectly for their subset of cases, breaks for others.

## The Accommodation Pattern

Instead of standardizing, we build systems that accommodate all patterns:

1. **Multiple Entry Points**: Let builders build, let adapters adapt
2. **Flexible Sequencing**: Steps can happen in different orders
3. **Progressive Disclosure**: Complex options only appear when needed
4. **Pattern Recognition**: System learns each user's approach

## Real Example: Estimation Workflows

In a recent project, three estimators all produced accurate quotes but through completely different paths:
- Estimator A: Started with total price, worked backwards
- Estimator B: Built up from materials, added labor
- Estimator C: Copied similar past job, adjusted

Forcing them into one workflow would have reduced accuracy and increased time.

## The Solution: Descriptive, Not Prescriptive

Rather than enforcing how work should be done, we build systems that:
- **Observe** how work actually gets done
- **Support** the patterns that emerge
- **Connect** different approaches to the same outcome
- **Learn** from variations to improve the whole

## Implementation Principles

### 1. Start with Reality
Document actual workflows, not idealized ones. Use shadowing, not interviews.

### 2. Find the Invariants
What must happen regardless of approach? These become your system's constraints.

### 3. Support the Variants
Everything else becomes configurable, optional, or adaptive.

### 4. Measure Outcomes, Not Process
Judge success by results, not adherence to process.

## The Lesson

Workflows resist standardization because they encode individual expertise. The goal shouldn't be uniformity - it should be transparency and support for the patterns that already exist.

Sometimes the best standard is no standard at all.

---

*Next: Building systems that learn from usage patterns*
    `
  },
  {
    id: 'systems-that-learn',
    date: '2025.08.12',
    category: 'technical',
    projectContext: 'Pattern Study',
    title: 'Building Systems That Learn From Usage',
    excerpt: 'How we build operational systems that improve themselves by observing how they\'re actually used, without explicit training.',
    readTime: '15 min read',
    hasCode: true,
    hasVisualization: true,
    tags: ['machine-learning', 'patterns', 'adaptive-systems'],
    content: `
# Building Systems That Learn From Usage

*Context: Traditional software assumes it knows how it will be used. We build systems that discover their optimal form through observation.*

## The Learning Loop

Every user interaction teaches the system something:
- Which features are actually used
- Which paths are most common
- Where users struggle
- What patterns emerge

## Implementation: The Event Stream Approach

\`\`\`python
from collections import defaultdict
import json
from datetime import datetime, timedelta

class UsagePatternLearner:
    """
    Learn from usage without explicit training
    """

    def __init__(self):
        self.event_stream = []
        self.patterns = defaultdict(list)
        self.adaptations = {}

    def observe(self, event):
        """
        Every action is a teaching moment
        """
        enriched_event = {
            **event,
            'timestamp': datetime.now(),
            'context': self.get_current_context(),
            'user_state': self.get_user_state(event['user_id'])
        }

        self.event_stream.append(enriched_event)
        self.extract_patterns(enriched_event)
        self.suggest_adaptations()

    def extract_patterns(self, event):
        """
        Find patterns without being told what to look for
        """
        # Sequential patterns
        recent_events = self.get_recent_events(event['user_id'], minutes=5)
        if len(recent_events) > 1:
            sequence = tuple(e['action'] for e in recent_events)
            self.patterns['sequences'][sequence] += 1

        # Temporal patterns
        hour = event['timestamp'].hour
        day = event['timestamp'].weekday()
        self.patterns['temporal'][(hour, day)].append(event['action'])

        # Error patterns
        if event.get('error'):
            preceding = self.get_preceding_events(event, count=3)
            self.patterns['errors'][event['error']].append(preceding)

    def suggest_adaptations(self):
        """
        Propose system changes based on patterns
        """
        adaptations = []

        # Frequently repeated sequences could be shortcuts
        for sequence, count in self.patterns['sequences'].items():
            if count > 10 and len(sequence) > 3:
                adaptations.append({
                    'type': 'create_shortcut',
                    'sequence': sequence,
                    'frequency': count
                })

        # Common error paths need better UX
        for error, contexts in self.patterns['errors'].items():
            if len(contexts) > 5:
                common_path = self.find_common_path(contexts)
                adaptations.append({
                    'type': 'improve_flow',
                    'error': error,
                    'common_path': common_path
                })

        return adaptations
\`\`\`

## Pattern Recognition Without Labels

The system doesn't need to know what patterns to look for:

\`\`\`python
def discover_clusters(events, min_similarity=0.7):
    """
    Find natural groupings in usage data
    """
    from sklearn.cluster import DBSCAN
    from sklearn.feature_extraction.text import TfidfVectorizer

    # Convert events to feature vectors
    event_strings = [json.dumps(e, sort_keys=True) for e in events]
    vectorizer = TfidfVectorizer(max_features=100)
    features = vectorizer.fit_transform(event_strings)

    # Find clusters without knowing how many
    clustering = DBSCAN(eps=1-min_similarity, min_samples=3)
    clusters = clustering.fit_predict(features)

    # Extract meaning from clusters
    cluster_patterns = defaultdict(list)
    for event, cluster_id in zip(events, clusters):
        if cluster_id != -1:  # Not noise
            cluster_patterns[cluster_id].append(event)

    # Name clusters based on common attributes
    for cluster_id, cluster_events in cluster_patterns.items():
        common_attrs = find_common_attributes(cluster_events)
        print(f"Discovered pattern: {common_attrs}")

    return cluster_patterns
\`\`\`

## Adaptive Interfaces

The interface evolves based on usage:

\`\`\`typescript
class AdaptiveUI {
  private usageHistory: Map<string, number> = new Map()
  private userPaths: Map<string, string[]> = new Map()

  recordUsage(componentId: string, userId: string) {
    // Track component usage
    const count = this.usageHistory.get(componentId) || 0
    this.usageHistory.set(componentId, count + 1)

    // Track user paths
    const path = this.userPaths.get(userId) || []
    path.push(componentId)
    this.userPaths.set(userId, path.slice(-10)) // Keep last 10
  }

  getOptimalLayout(userId: string): Layout {
    const userPath = this.userPaths.get(userId) || []
    const globalUsage = Array.from(this.usageHistory.entries())

    // Components used frequently should be prominent
    const prominentComponents = globalUsage
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id)

    // Components used in sequence should be near each other
    const sequences = this.findSequences(userPath)

    return {
      primary: prominentComponents,
      grouped: sequences,
      hidden: this.getRarelyUsed()
    }
  }

  private findSequences(path: string[]): string[][] {
    const sequences: string[][] = []
    const seen = new Set<string>()

    for (let i = 0; i < path.length - 1; i++) {
      const pair = [path[i], path[i + 1]]
      const key = pair.join('->')

      if (!seen.has(key)) {
        sequences.push(pair)
        seen.add(key)
      }
    }

    return sequences
  }
}
\`\`\`

## Learning Without Machine Learning

Simple heuristics often outperform complex models:

\`\`\`python
class HeuristicLearner:
    """
    Learn through simple rules, not neural networks
    """

    def __init__(self):
        self.rules = []
        self.performance = defaultdict(float)

    def learn_from_outcome(self, context, action, outcome):
        """
        If it worked, do more of it. If it didn't, do less.
        """
        key = (self.hash_context(context), action)

        if outcome > 0:
            self.performance[key] += 0.1  # Reinforce
        else:
            self.performance[key] -= 0.1  # Discourage

        # Create new rule if pattern is strong
        if abs(self.performance[key]) > 1.0:
            self.create_rule(context, action, self.performance[key])

    def decide(self, context):
        """
        Use learned rules to make decisions
        """
        applicable_rules = [
            rule for rule in self.rules
            if self.matches_context(rule.context, context)
        ]

        if applicable_rules:
            # Use highest confidence rule
            best_rule = max(applicable_rules, key=lambda r: r.confidence)
            return best_rule.action
        else:
            # Explore new action
            return self.explore_action()
\`\`\`

## The Result

Systems that:
- Get better over time without updates
- Adapt to how they're actually used
- Surface patterns humans missed
- Optimize for real workflows, not imagined ones

## The Lesson

The best teacher for a system is its own usage. Build in observation and adaptation from day one, and your system will evolve to fit its users perfectly.

---

*End of current notes. More patterns discovered weekly.*
    `
  }
]
