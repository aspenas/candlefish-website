'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useQuery } from '@apollo/client'
import { gql } from '@apollo/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from '@candlefish-ai/shared'
import { Clock, TrendingUp, Users, ArrowRight } from 'lucide-react'
import { formatDate, formatRelativeTime } from '@candlefish-ai/shared'

const GET_FEATURED_DOCUMENTATION = gql`
  query GetFeaturedDocumentation {
    allDocumentation(
      first: 6
      category: "guides"
      status: PUBLISHED
    ) {
      nodes {
        id
        title
        description
        slug
        readingTime
        publishedAt
        updatedAt
        difficulty
        tags
        views
        author {
          name
          avatar
        }
        category {
          name
        }
      }
    }
  }
`

const difficultyColors = {
  BEGINNER: 'success',
  INTERMEDIATE: 'warning', 
  ADVANCED: 'destructive'
} as const

const fallbackGuides = [
  {
    id: '1',
    title: 'Building Your First AI Agent',
    description: 'Learn how to create and deploy your first autonomous AI agent using the Candlefish platform.',
    slug: 'building-first-ai-agent',
    readingTime: 15,
    publishedAt: '2024-01-15',
    difficulty: 'BEGINNER' as const,
    tags: ['agents', 'getting-started', 'tutorial'],
    views: 12500,
    author: { name: 'Sarah Chen' },
    category: { name: 'Guides' }
  },
  {
    id: '2', 
    title: 'Advanced Pattern Recognition',
    description: 'Deep dive into sophisticated pattern recognition techniques and their practical applications.',
    slug: 'advanced-pattern-recognition',
    readingTime: 25,
    publishedAt: '2024-01-12',
    difficulty: 'ADVANCED' as const,
    tags: ['machine-learning', 'patterns', 'advanced'],
    views: 8300,
    author: { name: 'Dr. Alex Kumar' },
    category: { name: 'Guides' }
  },
  {
    id: '3',
    title: 'Real-time Data Processing',
    description: 'Set up high-performance real-time data processing pipelines with Candlefish streams.',
    slug: 'realtime-data-processing',
    readingTime: 20,
    publishedAt: '2024-01-10',
    difficulty: 'INTERMEDIATE' as const,
    tags: ['streaming', 'data', 'real-time'],
    views: 9800,
    author: { name: 'Mike Rodriguez' },
    category: { name: 'Guides' }
  },
  {
    id: '4',
    title: 'Multi-Modal AI Integration',
    description: 'Combine text, image, and audio processing in a single unified AI workflow.',
    slug: 'multimodal-ai-integration', 
    readingTime: 18,
    publishedAt: '2024-01-08',
    difficulty: 'INTERMEDIATE' as const,
    tags: ['multimodal', 'integration', 'ai'],
    views: 7200,
    author: { name: 'Emma Watson' },
    category: { name: 'Guides' }
  },
  {
    id: '5',
    title: 'Scaling AI Workloads',
    description: 'Best practices for scaling your AI applications from prototype to production.',
    slug: 'scaling-ai-workloads',
    readingTime: 30,
    publishedAt: '2024-01-05',
    difficulty: 'ADVANCED' as const,
    tags: ['scaling', 'production', 'performance'],
    views: 11200,
    author: { name: 'James Liu' },
    category: { name: 'Guides' }
  },
  {
    id: '6',
    title: 'Security & Compliance',
    description: 'Implement enterprise-grade security and compliance in your AI applications.',
    slug: 'security-compliance',
    readingTime: 22,
    publishedAt: '2024-01-03',
    difficulty: 'INTERMEDIATE' as const,
    tags: ['security', 'compliance', 'enterprise'],
    views: 6800,
    author: { name: 'Rachel Park' },
    category: { name: 'Guides' }
  }
]

export function FeaturedGuides() {
  const { data, loading, error } = useQuery(GET_FEATURED_DOCUMENTATION)
  const [guides, setGuides] = useState(fallbackGuides)

  useEffect(() => {
    if (data?.allDocumentation?.nodes) {
      setGuides(data.allDocumentation.nodes)
    }
  }, [data])

  if (error) {
    console.error('Error loading featured guides:', error)
  }

  return (
    <section className="py-20 lg:py-32 bg-gradient-to-b from-white to-muted-sand/30">
      <div className="docs-container">
        <div className="flex items-center justify-between mb-16">
          <div>
            <h2 className="text-4xl font-bold text-charcoal mb-4">
              Featured Guides
            </h2>
            <p className="text-xl text-slate-600">
              Hand-picked tutorials and guides to help you master Candlefish AI
            </p>
          </div>
          <Link
            href="/guides"
            className="hidden sm:inline-flex items-center px-6 py-3 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors font-medium"
          >
            View All Guides
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {guides.map((guide) => (
            <Card key={guide.id} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant={difficultyColors[guide.difficulty]}>
                    {guide.difficulty.toLowerCase()}
                  </Badge>
                  <div className="flex items-center text-sm text-slate-500">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    {guide.views.toLocaleString()} views
                  </div>
                </div>
                <CardTitle className="text-xl group-hover:text-amber-600 transition-colors">
                  <Link href={`/guides/${guide.slug}`}>
                    {guide.title}
                  </Link>
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {guide.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {guide.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Meta info */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center space-x-4 text-sm text-slate-500">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {guide.readingTime}m read
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      {guide.author.name}
                    </div>
                  </div>
                  <time 
                    className="text-xs text-slate-400"
                    dateTime={guide.publishedAt}
                  >
                    {formatRelativeTime(guide.publishedAt)}
                  </time>
                </div>

                <Link
                  href={`/guides/${guide.slug}`}
                  className="inline-flex items-center text-amber-600 hover:text-amber-700 font-medium text-sm group/link"
                >
                  Read guide
                  <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover/link:translate-x-1" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Mobile "View All" button */}
        <div className="text-center mt-12 sm:hidden">
          <Link
            href="/guides"
            className="inline-flex items-center px-6 py-3 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors font-medium"
          >
            View All Guides
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </div>
    </section>
  )
}