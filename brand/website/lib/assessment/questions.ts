export interface AssessmentOption {
  value: number
  label: string
  insight: string
}

export interface AssessmentDimension {
  id: string
  dimension: string
  context: string
  question: string
  options: AssessmentOption[]
  followUp: string
  weight: number
}

export const assessmentDimensions: AssessmentDimension[] = [
  {
    id: 'data-state',
    dimension: 'Data State',
    context: 'Understanding where your operational truth lives is the foundation of systematic improvement.',
    question: 'When you need to understand what happened in your operations last Tuesday at 3pm, you:',
    options: [
      {
        value: 0,
        label: 'Ask the person who was working',
        insight: 'Tribal knowledge dependency - high risk'
      },
      {
        value: 1,
        label: 'Check multiple spreadsheets and email threads',
        insight: 'Fragmented data state - significant overhead'
      },
      {
        value: 2,
        label: 'Query a central system, but need to interpret the results',
        insight: 'Centralized but not intelligent - moderate maturity'
      },
      {
        value: 3,
        label: 'Pull a report that shows most of what you need',
        insight: 'Structured visibility - approaching systematic'
      },
      {
        value: 4,
        label: 'View a real-time dashboard that already flagged anomalies',
        insight: 'Predictive operations - high maturity'
      }
    ],
    followUp: 'How many different systems contain pieces of this information?',
    weight: 1.2
  },
  {
    id: 'decision-velocity',
    dimension: 'Decision Velocity',
    context: 'The speed from question to action reveals organizational metabolism.',
    question: 'A key customer has an urgent custom request. The time to know if you can fulfill it is:',
    options: [
      {
        value: 0,
        label: 'Days - need multiple meetings with different departments',
        insight: 'Bureaucratic paralysis'
      },
      {
        value: 1,
        label: 'Hours - checking with key people and their spreadsheets',
        insight: 'Human bottlenecks throughout'
      },
      {
        value: 2,
        label: 'An hour - running reports and doing quick calculations',
        insight: 'Process exists but not optimized'
      },
      {
        value: 3,
        label: 'Minutes - system can model the scenario',
        insight: 'Systematic decision support'
      },
      {
        value: 4,
        label: 'Seconds - system already knows capacity and constraints',
        insight: 'Autonomous capability assessment'
      }
    ],
    followUp: 'What percentage of these decisions prove correct in hindsight?',
    weight: 1.1
  },
  {
    id: 'process-archaeology',
    dimension: 'Process Archaeology',
    context: 'Every operation contains layers of historical decisions, frozen in process.',
    question: 'When someone asks "Why do we do it this way?", the usual answer is:',
    options: [
      {
        value: 0,
        label: 'We\'ve always done it this way',
        insight: 'Process fossilization - dangerous'
      },
      {
        value: 1,
        label: 'That\'s how [person who left 3 years ago] set it up',
        insight: 'Orphaned processes - technical debt'
      },
      {
        value: 2,
        label: 'There was a good reason, but we\'d need to research it',
        insight: 'Lost context - improvement blocked'
      },
      {
        value: 3,
        label: 'Here\'s the documented reason, though it may need review',
        insight: 'Documented but not actively managed'
      },
      {
        value: 4,
        label: 'The system tracks why and suggests when to reconsider',
        insight: 'Self-documenting, self-improving'
      }
    ],
    followUp: 'How many processes would break if you changed this one?',
    weight: 0.9
  },
  {
    id: 'exception-handling',
    dimension: 'Exception Handling',
    context: 'How you handle edge cases reveals system resilience.',
    question: 'When something unusual happens that doesn\'t fit your normal process:',
    options: [
      {
        value: 0,
        label: 'Everything stops until a senior person decides',
        insight: 'Brittle system, single points of failure'
      },
      {
        value: 1,
        label: 'We have a few people who know how to handle weird stuff',
        insight: 'Hero dependency - doesn\'t scale'
      },
      {
        value: 2,
        label: 'There\'s an exception process, but it\'s slow',
        insight: 'Recognized but not optimized'
      },
      {
        value: 3,
        label: 'Common exceptions have documented workflows',
        insight: 'Learning from patterns'
      },
      {
        value: 4,
        label: 'System routes exceptions intelligently, learns from resolutions',
        insight: 'Adaptive exception handling'
      }
    ],
    followUp: 'What percentage of your work is actually exceptions?',
    weight: 1.0
  },
  {
    id: 'knowledge-distribution',
    dimension: 'Knowledge Distribution',
    context: 'Operational knowledge concentrated in few minds is operational risk.',
    question: 'If your most experienced operator won the lottery and disappeared:',
    options: [
      {
        value: 0,
        label: 'Multiple critical processes would fail immediately',
        insight: 'Critical knowledge concentration'
      },
      {
        value: 1,
        label: 'We\'d struggle for months figuring out their responsibilities',
        insight: 'Undocumented expertise'
      },
      {
        value: 2,
        label: 'We have documentation, but it\'s probably outdated',
        insight: 'Documentation debt'
      },
      {
        value: 3,
        label: 'Others could step in with minimal disruption',
        insight: 'Good knowledge distribution'
      },
      {
        value: 4,
        label: 'System encodes their expertise, improving it continuously',
        insight: 'Knowledge captured and enhanced'
      }
    ],
    followUp: 'How many people could go on vacation simultaneously without crisis?',
    weight: 1.1
  },
  {
    id: 'tool-sprawl',
    dimension: 'Tool Sprawl',
    context: 'Every tool is a decision frozen in time. How many decisions are you maintaining?',
    question: 'Count the different software tools/systems your operation touches daily:',
    options: [
      {
        value: 4,
        label: '3-5 core systems that handle everything',
        insight: 'Unified architecture - rare and powerful'
      },
      {
        value: 3,
        label: '6-10 systems with good integration',
        insight: 'Manageable complexity'
      },
      {
        value: 2,
        label: '11-20 systems, some integrated, some isolated',
        insight: 'Integration tax increasing'
      },
      {
        value: 1,
        label: '20-50 systems, mostly disconnected',
        insight: 'Severe fragmentation'
      },
      {
        value: 0,
        label: '50+ systems, no one knows them all',
        insight: 'Unmanageable sprawl'
      }
    ],
    followUp: 'How many of these tools does everyone actually know how to use?',
    weight: 0.8
  },
  {
    id: 'automation-depth',
    dimension: 'Automation Depth',
    context: 'True automation runs without human intervention, not just human assistance.',
    question: 'What percentage of your daily operations runs without human intervention?',
    options: [
      {
        value: 0,
        label: 'Under 10% - mostly manual processes',
        insight: 'Human-dependent operations'
      },
      {
        value: 1,
        label: '10-25% - basic automation for simple tasks',
        insight: 'Automation beginnings'
      },
      {
        value: 2,
        label: '25-50% - significant automation with human oversight',
        insight: 'Balanced automation'
      },
      {
        value: 3,
        label: '50-75% - mostly automated, humans handle exceptions',
        insight: 'Mature automation'
      },
      {
        value: 4,
        label: '75%+ - humans design systems, not operate them',
        insight: 'Systematic operations'
      }
    ],
    followUp: 'What stops you from automating more?',
    weight: 1.0
  },
  {
    id: 'feedback-loops',
    dimension: 'Feedback Loops',
    context: 'Systems without feedback loops cannot improve themselves.',
    question: 'How do you know if your operations are improving or degrading?',
    options: [
      {
        value: 0,
        label: 'We find out when something breaks or someone complains',
        insight: 'Reactive only - no prevention'
      },
      {
        value: 1,
        label: 'Monthly/quarterly reviews reveal issues',
        insight: 'Delayed feedback - problems compound'
      },
      {
        value: 2,
        label: 'Weekly metrics reviews catch most trends',
        insight: 'Regular but not real-time'
      },
      {
        value: 3,
        label: 'Daily dashboards show operational health',
        insight: 'Proactive monitoring'
      },
      {
        value: 4,
        label: 'Real-time alerts on degradation, predictive warnings',
        insight: 'Preventive operations'
      }
    ],
    followUp: 'How often do you act on these insights?',
    weight: 1.1
  },
  {
    id: 'operational-debt',
    dimension: 'Operational Debt',
    context: 'Every shortcut taken, every "we\'ll fix it later" accumulates interest.',
    question: 'How many operational workarounds would you need to fix to run "properly"?',
    options: [
      {
        value: 4,
        label: 'Maybe 1-2 minor things',
        insight: 'Clean operations - rare'
      },
      {
        value: 3,
        label: 'Under 10 - we keep the list manageable',
        insight: 'Controlled debt'
      },
      {
        value: 2,
        label: '10-25 known issues we work around daily',
        insight: 'Accumulating friction'
      },
      {
        value: 1,
        label: '25-50 workarounds have become the process',
        insight: 'Workarounds are the system'
      },
      {
        value: 0,
        label: 'Too many to count - the workarounds have workarounds',
        insight: 'Systemic dysfunction'
      }
    ],
    followUp: 'How much time do these workarounds cost daily?',
    weight: 0.9
  },
  {
    id: 'change-capacity',
    dimension: 'Change Capacity',
    context: 'The ability to evolve without breaking reveals system health.',
    question: 'When you need to change a core process:',
    options: [
      {
        value: 0,
        label: 'It\'s so risky we avoid it at all costs',
        insight: 'Calcified operations'
      },
      {
        value: 1,
        label: 'Months of planning, high failure risk',
        insight: 'Change-resistant'
      },
      {
        value: 2,
        label: 'Weeks of careful coordination required',
        insight: 'Change-capable but slow'
      },
      {
        value: 3,
        label: 'Days to implement with confidence',
        insight: 'Agile operations'
      },
      {
        value: 4,
        label: 'Hours - system adapts, tests, and validates changes',
        insight: 'Evolutionary operations'
      }
    ],
    followUp: 'When did you last successfully change a core process?',
    weight: 1.2
  },
  {
    id: 'metric-clarity',
    dimension: 'Metric Clarity',
    context: 'Most operations measure what\'s easy, not what matters.',
    question: 'Your operational metrics primarily tell you:',
    options: [
      {
        value: 0,
        label: 'What happened (past tense, after problems)',
        insight: 'Autopsy metrics only'
      },
      {
        value: 1,
        label: 'Activity levels (busy vs slow)',
        insight: 'Activity without insight'
      },
      {
        value: 2,
        label: 'Performance against targets',
        insight: 'Goal-oriented but not predictive'
      },
      {
        value: 3,
        label: 'Trends and early warning signals',
        insight: 'Forward-looking metrics'
      },
      {
        value: 4,
        label: 'What will happen and what to do about it',
        insight: 'Predictive and prescriptive'
      }
    ],
    followUp: 'How many metrics do you actually use to make decisions?',
    weight: 1.0
  },
  {
    id: 'integration-maturity',
    dimension: 'Integration Maturity',
    context: 'How systems talk to each other determines operational ceiling.',
    question: 'Moving data between your systems requires:',
    options: [
      {
        value: 0,
        label: 'Manual export, massage, import (the "Excel dance")',
        insight: 'Human API everywhere'
      },
      {
        value: 1,
        label: 'Some automation, but lots of manual verification',
        insight: 'Partially connected'
      },
      {
        value: 2,
        label: 'Mostly automated, occasional manual fixes',
        insight: 'Integration with gaps'
      },
      {
        value: 3,
        label: 'Fully automated with error handling',
        insight: 'Mature integration'
      },
      {
        value: 4,
        label: 'Systems share unified data layer, no movement needed',
        insight: 'Unified architecture'
      }
    ],
    followUp: 'How many integration points fail monthly?',
    weight: 1.1
  },
  {
    id: 'human-system-balance',
    dimension: 'Human-System Balance',
    context: 'The best operations amplify human judgment, not replace it.',
    question: 'Your team spends most of their time:',
    options: [
      {
        value: 0,
        label: 'Fighting fires and handling routine tasks',
        insight: 'Humans as processors'
      },
      {
        value: 1,
        label: '70% routine tasks, 30% problem-solving',
        insight: 'Mostly mechanical'
      },
      {
        value: 2,
        label: '50/50 routine vs strategic work',
        insight: 'Transitioning'
      },
      {
        value: 3,
        label: '30% routine, 70% improvement and strategy',
        insight: 'Humans as designers'
      },
      {
        value: 4,
        label: 'Designing systems and handling only interesting problems',
        insight: 'Optimal human utilization'
      }
    ],
    followUp: 'What percentage of decisions require human judgment?',
    weight: 1.0
  },
  {
    id: 'recovery-capability',
    dimension: 'Recovery Capability',
    context: 'How you handle failure reveals operational maturity.',
    question: 'When something breaks in your operations:',
    options: [
      {
        value: 0,
        label: 'Panic, all-hands emergency, figure it out live',
        insight: 'No recovery planning'
      },
      {
        value: 1,
        label: 'Key people know what to do, everyone else waits',
        insight: 'Hero-dependent recovery'
      },
      {
        value: 2,
        label: 'We have runbooks, but they\'re often outdated',
        insight: 'Documented but not maintained'
      },
      {
        value: 3,
        label: 'Clear procedures, practiced regularly',
        insight: 'Prepared recovery'
      },
      {
        value: 4,
        label: 'System self-heals or automatically initiates recovery',
        insight: 'Autonomous resilience'
      }
    ],
    followUp: 'How long does recovery typically take?',
    weight: 1.2
  }
]
