export interface ArchiveEntry {
  id: string;
  title: string;
  type: 'study' | 'framework' | 'instrument' | 'collaboration';
  date: string;
  accessLevel: 'public' | 'collaborator' | 'restricted';
  summary: string;
  tags: string[];
  fullContent?: {
    overview?: string;
    findings?: string[];
    methodology?: string;
    applications?: string;
  };
}

export const archiveEntries: ArchiveEntry[] = [
  {
    id: 'arch-2025-001',
    title: 'Operational Patterns in Craft Manufacturing',
    type: 'study',
    date: '2025-08-18',
    accessLevel: 'public',
    summary: 'Analysis of efficiency patterns in small-batch manufacturing. Identifies key leverage points for automation without compromising craft integrity.',
    tags: ['manufacturing', 'automation', 'craft', 'efficiency'],
    fullContent: {
      overview: 'This comprehensive study examines the intersection of traditional craft methods and modern operational efficiency. Through analysis of twelve craft manufacturing operations, we identified recurring patterns that enable scale without sacrificing quality or artisanal value.',
      findings: [
        'Batch size optimization follows a power law distribution, with sweet spots at 12, 48, and 144 units',
        'Quality control checkpoints are most effective when integrated into the craft process rather than appended',
        'Apprentice-to-master ratios of 3:1 optimize knowledge transfer while maintaining productivity',
        'Digital tools augment rather than replace traditional techniques when introduced gradually',
        'Customer perception of value increases with selective transparency into the craft process'
      ],
      methodology: 'We employed a mixed-methods approach combining time-motion studies, quality metrics analysis, and ethnographic observation. Each operation was studied for a minimum of 90 days, with data collected across multiple production cycles.',
      applications: 'These patterns apply to any operation where craft quality and scaled production must coexist. Industries from specialty food production to custom furniture manufacturing can adapt these insights to their specific contexts.'
    }
  },
  {
    id: 'arch-2025-002',
    title: 'Workshop Capacity Optimization Framework',
    type: 'framework',
    date: '2025-08-15',
    accessLevel: 'collaborator',
    summary: 'Systematic approach to balancing workshop capacity with quality output. Includes tools for measuring cognitive load and creative flow.',
    tags: ['capacity', 'optimization', 'workflow', 'measurement'],
    fullContent: {
      overview: 'Workshop capacity extends beyond physical space and time. This framework provides a multidimensional approach to understanding and optimizing the true capacity of creative and technical workshops.',
      findings: [
        'Cognitive load peaks at 70% physical capacity, suggesting optimal utilization targets',
        'Flow states occur most frequently in 90-minute work blocks with 20-minute transitions',
        'Tool accessibility impacts productivity more than tool quality above a baseline threshold',
        'Social dynamics in shared workshops follow predictable patterns based on spatial configuration'
      ],
      methodology: 'Development involved longitudinal studies of six workshops over 18 months, combining quantitative metrics with qualitative assessments of participant experience and output quality.',
      applications: 'Applicable to any workshop environment where creative or technical work requires sustained focus. Particularly valuable for makerspaces, design studios, and research facilities.'
    }
  },
  {
    id: 'arch-2025-003',
    title: 'Collaborative Selection Criteria v2.1',
    type: 'instrument',
    date: '2025-08-12',
    accessLevel: 'restricted',
    summary: 'Refined evaluation framework for partnership assessment. Emphasizes mutual amplification over traditional client-service relationships.',
    tags: ['collaboration', 'selection', 'partnership', 'evaluation']
  },
  {
    id: 'arch-2025-004',
    title: 'Case Study: Industrial Partner Alpha',
    type: 'collaboration',
    date: '2025-08-08',
    accessLevel: 'collaborator',
    summary: 'Deep dive into 6-month operational transformation. Focus on system integration and human-automation balance.',
    tags: ['case-study', 'transformation', 'integration', 'balance'],
    fullContent: {
      overview: 'This case study documents a six-month engagement with a mid-scale industrial manufacturer. The transformation achieved 40% efficiency gains while improving worker satisfaction and product quality.',
      findings: [
        'Phased automation introduction reduced resistance and improved adoption rates',
        'Worker-designed interfaces outperformed vendor defaults in every metric',
        'Quality improvements emerged from process visibility rather than additional controls',
        'ROI exceeded projections due to unexpected gains in worker retention'
      ],
      methodology: 'We employed an embedded research approach, with team members working alongside operations staff throughout the transformation. Data collection included quantitative metrics, interviews, and observational studies.',
      applications: 'The approaches documented here translate to any industrial operation seeking to modernize while maintaining workforce engagement. Particularly relevant for family-owned businesses and operations with strong craft traditions.'
    }
  },
  {
    id: 'arch-2025-005',
    title: 'Quality Metrics for Operational Excellence',
    type: 'framework',
    date: '2025-08-05',
    accessLevel: 'public',
    summary: 'Comprehensive framework for measuring operational quality beyond traditional efficiency metrics. Includes craft integrity indicators.',
    tags: ['quality', 'metrics', 'excellence', 'measurement'],
    fullContent: {
      overview: 'Traditional quality metrics often miss the nuanced aspects of operational excellence. This framework introduces multidimensional measurement that captures both quantitative performance and qualitative craft integrity.',
      findings: [
        'Quality perception correlates more strongly with consistency than absolute performance',
        'Craft integrity can be quantified through variance in expert evaluation scores',
        'Customer satisfaction peaks when quality metrics are visible but not overwhelming',
        'Leading indicators of quality issues appear in worker engagement metrics before defect rates'
      ],
      methodology: 'Framework development involved analysis of quality systems across 20 organizations, synthesis of academic research, and iterative refinement through practical application.',
      applications: 'Universal application across industries where quality differentiation matters. Especially valuable for premium products and services where craft perception influences value.'
    }
  },
  {
    id: 'arch-2025-006',
    title: 'Workshop Environmental Optimization',
    type: 'study',
    date: '2025-07-28',
    accessLevel: 'public',
    summary: 'Environmental factors that impact deep work and creative output. Analysis of lighting, temperature, sound, and spatial arrangement.',
    tags: ['environment', 'workspace', 'deep-work', 'optimization'],
    fullContent: {
      overview: 'The physical environment profoundly influences cognitive performance and creative output. This study quantifies environmental impacts and provides optimization strategies for different types of work.',
      findings: [
        'Natural light cycles improve sustained focus by 23% compared to constant artificial lighting',
        'Temperature variations of ±2°C from personal optimum reduce performance by 15%',
        'Ambient sound at 50-60 dB enhances creative tasks while silence optimizes analytical work',
        'Visual access to nature or nature analogues reduces cognitive fatigue by 30%',
        'Personalized workspace configuration increases satisfaction and productivity simultaneously'
      ],
      methodology: 'Controlled experiments across 12 workshop environments, measuring both objective performance metrics and subjective experience reports. Environmental variables were systematically varied while controlling for other factors.',
      applications: 'Essential for anyone designing or optimizing workspace environments. Applies to home offices, collaborative workshops, makerspaces, and traditional office settings.'
    }
  }
];