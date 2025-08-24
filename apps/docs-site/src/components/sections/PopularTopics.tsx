import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@candlefish-ai/shared'
import { 
  Bot, 
  Brain, 
  Database, 
  Shield, 
  Zap, 
  Code, 
  Cloud, 
  Users,
  ArrowRight,
  ExternalLink
} from 'lucide-react'

const topics = [
  {
    icon: Bot,
    title: 'AI Agents',
    description: 'Build autonomous agents that can reason, plan, and execute complex tasks',
    links: [
      { title: 'Agent Architecture', href: '/guides/agent-architecture' },
      { title: 'Memory Systems', href: '/guides/memory-systems' },
      { title: 'Tool Integration', href: '/guides/tool-integration' },
    ],
    color: 'amber'
  },
  {
    icon: Brain,
    title: 'Machine Learning',
    description: 'Advanced ML models and training pipelines for production use',
    links: [
      { title: 'Model Training', href: '/guides/model-training' },
      { title: 'Fine-tuning', href: '/guides/fine-tuning' },
      { title: 'Evaluation Metrics', href: '/guides/evaluation' },
    ],
    color: 'indigo'
  },
  {
    icon: Database,
    title: 'Data Management',
    description: 'Handle large-scale data processing and vector storage efficiently',
    links: [
      { title: 'Vector Databases', href: '/guides/vector-databases' },
      { title: 'Data Pipelines', href: '/guides/data-pipelines' },
      { title: 'ETL Workflows', href: '/guides/etl-workflows' },
    ],
    color: 'emerald'
  },
  {
    icon: Shield,
    title: 'Security',
    description: 'Enterprise-grade security, privacy, and compliance frameworks',
    links: [
      { title: 'Authentication', href: '/security/authentication' },
      { title: 'Data Privacy', href: '/security/privacy' },
      { title: 'Compliance', href: '/security/compliance' },
    ],
    color: 'red'
  },
  {
    icon: Zap,
    title: 'Performance',
    description: 'Optimize your AI applications for speed, scale, and efficiency',
    links: [
      { title: 'Caching Strategies', href: '/guides/caching' },
      { title: 'Load Balancing', href: '/guides/load-balancing' },
      { title: 'Monitoring', href: '/guides/monitoring' },
    ],
    color: 'yellow'
  },
  {
    icon: Code,
    title: 'SDKs & APIs',
    description: 'Comprehensive documentation for all our SDKs and REST APIs',
    links: [
      { title: 'JavaScript SDK', href: '/sdks/javascript' },
      { title: 'Python SDK', href: '/sdks/python' },
      { title: 'REST API', href: '/api/rest' },
    ],
    color: 'blue'
  },
  {
    icon: Cloud,
    title: 'Deployment',
    description: 'Deploy and scale your AI applications across different environments',
    links: [
      { title: 'Docker Containers', href: '/deployment/docker' },
      { title: 'Kubernetes', href: '/deployment/kubernetes' },
      { title: 'Cloud Providers', href: '/deployment/cloud' },
    ],
    color: 'cyan'
  },
  {
    icon: Users,
    title: 'Integration',
    description: 'Connect Candlefish AI with your existing tools and workflows',
    links: [
      { title: 'Webhooks', href: '/integration/webhooks' },
      { title: 'Third-party APIs', href: '/integration/apis' },
      { title: 'Workflow Engines', href: '/integration/workflows' },
    ],
    color: 'purple'
  }
]

const colorClasses = {
  amber: {
    bg: 'bg-amber-50',
    icon: 'text-amber-600',
    title: 'group-hover:text-amber-600'
  },
  indigo: {
    bg: 'bg-indigo-50', 
    icon: 'text-indigo-600',
    title: 'group-hover:text-indigo-600'
  },
  emerald: {
    bg: 'bg-emerald-50',
    icon: 'text-emerald-600', 
    title: 'group-hover:text-emerald-600'
  },
  red: {
    bg: 'bg-red-50',
    icon: 'text-red-600',
    title: 'group-hover:text-red-600'
  },
  yellow: {
    bg: 'bg-yellow-50',
    icon: 'text-yellow-600',
    title: 'group-hover:text-yellow-600'
  },
  blue: {
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
    title: 'group-hover:text-blue-600'
  },
  cyan: {
    bg: 'bg-cyan-50',
    icon: 'text-cyan-600',
    title: 'group-hover:text-cyan-600'
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'text-purple-600',
    title: 'group-hover:text-purple-600'
  }
} as const

export function PopularTopics() {
  return (
    <section className="py-20 lg:py-32 bg-white">
      <div className="docs-container">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-charcoal mb-6">
            Popular Topics
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Explore the most requested topics and dive deep into specific areas of Candlefish AI
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {topics.map((topic) => {
            const Icon = topic.icon
            const colors = colorClasses[topic.color as keyof typeof colorClasses]
            
            return (
              <Card key={topic.title} className="group hover:shadow-lg transition-all duration-300 h-full">
                <CardHeader>
                  <div className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 ${colors.icon}`} />
                  </div>
                  <CardTitle className={`text-lg transition-colors ${colors.title}`}>
                    {topic.title}
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {topic.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <nav className="space-y-2">
                    {topic.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-center justify-between text-sm text-slate-600 hover:text-charcoal transition-colors py-1 group/link"
                      >
                        <span>{link.title}</span>
                        <ArrowRight className="w-3 h-3 transition-transform group-hover/link:translate-x-1" />
                      </Link>
                    ))}
                  </nav>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Community Section */}
        <div className="mt-20 text-center">
          <div className="bg-gradient-to-r from-amber-50 to-indigo-50 rounded-2xl p-8 lg:p-12">
            <h3 className="text-2xl font-bold text-charcoal mb-4">
              Can't find what you're looking for?
            </h3>
            <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
              Join our community of developers, ask questions, and get help from experts
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="https://discord.gg/candlefish"
                className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                target="_blank"
                rel="noopener noreferrer"
              >
                Join Discord Community
                <ExternalLink className="w-4 h-4 ml-2" />
              </Link>
              <Link
                href="/support"
                className="inline-flex items-center px-6 py-3 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors font-medium"
              >
                Contact Support
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}