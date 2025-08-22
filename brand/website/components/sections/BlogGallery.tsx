'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { LoadingState } from '../ui/LoadingSpinner';
import {
  MagnifyingGlassIcon,
  CalendarIcon,
  ClockIcon,
  ArrowRightIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import { BlogPost, BlogFilters } from '../../types/api';

interface BlogGalleryProps {
  posts?: BlogPost[];
  loading?: boolean;
  error?: string | null;
  onViewPost?: (post: BlogPost) => void;
  showFilters?: boolean;
  itemsPerPage?: number;
}

// Mock blog posts data
const mockPosts: BlogPost[] = [
  {
    id: '1',
    title: 'The ROI of Modular Automation: Why Small Steps Lead to Big Wins',
    slug: 'roi-modular-automation-small-steps-big-wins',
    excerpt: 'Discover why starting small with automation delivers better results than large enterprise transformations. Learn the modular approach that reduces risk while maximizing impact.',
    content: 'Full content would be here...',
    author: {
      id: 'author1',
      name: 'Sarah Johnson',
      avatar: '/images/authors/sarah-johnson.jpg',
      bio: 'Automation Strategy Lead',
      title: 'Senior Automation Consultant'
    },
    categories: ['Strategy', 'ROI'],
    tags: ['automation', 'roi', 'modular', 'strategy'],
    featuredImage: '/images/blog/modular-automation.jpg',
    readTime: 8,
    published: true,
    publishedAt: '2024-02-15T10:00:00Z',
    createdAt: '2024-02-10T10:00:00Z',
    updatedAt: '2024-02-15T10:00:00Z'
  },
  {
    id: '2',
    title: '5 Signs Your Business is Ready for AI Automation',
    slug: '5-signs-business-ready-ai-automation',
    excerpt: 'Not sure if your business is ready for automation? Look for these key indicators that suggest you\'re primed for successful AI implementation.',
    content: 'Full content would be here...',
    author: {
      id: 'author2',
      name: 'Marcus Chen',
      avatar: '/images/authors/marcus-chen.jpg',
      bio: 'AI Implementation Specialist',
      title: 'Technical Lead'
    },
    categories: ['Implementation', 'Assessment'],
    tags: ['ai', 'readiness', 'assessment', 'business'],
    featuredImage: '/images/blog/ai-readiness.jpg',
    readTime: 6,
    published: true,
    publishedAt: '2024-02-10T14:00:00Z',
    createdAt: '2024-02-05T14:00:00Z',
    updatedAt: '2024-02-10T14:00:00Z'
  },
  {
    id: '3',
    title: 'Case Study Deep Dive: How TechFlow Automated Customer Onboarding',
    slug: 'case-study-techflow-automated-customer-onboarding',
    excerpt: 'Go behind the scenes of TechFlow\'s 85% faster customer onboarding. Learn the exact process, challenges faced, and solutions implemented.',
    content: 'Full content would be here...',
    author: {
      id: 'author1',
      name: 'Sarah Johnson',
      avatar: '/images/authors/sarah-johnson.jpg',
      bio: 'Automation Strategy Lead',
      title: 'Senior Automation Consultant'
    },
    categories: ['Case Study', 'Customer Success'],
    tags: ['case-study', 'onboarding', 'automation', 'techflow'],
    featuredImage: '/images/blog/techflow-case-study.jpg',
    readTime: 12,
    published: true,
    publishedAt: '2024-02-05T16:00:00Z',
    createdAt: '2024-01-30T16:00:00Z',
    updatedAt: '2024-02-05T16:00:00Z'
  },
  {
    id: '4',
    title: 'The Hidden Costs of Manual Processes: A Calculator for SMBs',
    slug: 'hidden-costs-manual-processes-smb-calculator',
    excerpt: 'Calculate the true cost of your manual processes with our interactive tool. Discover how much time and money you could save with targeted automation.',
    content: 'Full content would be here...',
    author: {
      id: 'author3',
      name: 'Emily Davis',
      avatar: '/images/authors/emily-davis.jpg',
      bio: 'Operations Efficiency Expert',
      title: 'Senior Business Analyst'
    },
    categories: ['Tools', 'Cost Analysis'],
    tags: ['manual-processes', 'cost-calculator', 'efficiency', 'smb'],
    featuredImage: '/images/blog/cost-calculator.jpg',
    readTime: 5,
    published: true,
    publishedAt: '2024-01-30T12:00:00Z',
    createdAt: '2024-01-25T12:00:00Z',
    updatedAt: '2024-01-30T12:00:00Z'
  }
];

const categories = ['All Categories', 'Strategy', 'Implementation', 'Case Study', 'Tools', 'ROI', 'Assessment'];

export const BlogGallery: React.FC<BlogGalleryProps> = ({
  posts = mockPosts,
  loading = false,
  error = null,
  onViewPost,
  showFilters = true,
  itemsPerPage = 6
}) => {
  const [filters, setFilters] = useState<BlogFilters>({
    category: '',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Filter and search logic
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const matchesCategory = !filters.category || filters.category === 'All Categories' ||
        post.categories.includes(filters.category);
      const matchesSearch = !filters.search ||
        post.title.toLowerCase().includes(filters.search?.toLowerCase() || '') ||
        post.excerpt.toLowerCase().includes(filters.search?.toLowerCase() || '') ||
        post.tags.some(tag => tag.toLowerCase().includes(filters.search?.toLowerCase() || ''));

      return matchesCategory && matchesSearch && post.published;
    });
  }, [posts, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredPosts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPosts = filteredPosts.slice(startIndex, startIndex + itemsPerPage);

  // Featured post
  const featuredPost = posts.find(post => post.published) || posts[0];

  const handleFilterChange = (key: keyof BlogFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({ category: '', search: '' });
    setCurrentPage(1);
  };

  const handleViewPost = (post: BlogPost) => {
    onViewPost?.(post);
    window.open(`/insights/${post.slug}`, '_blank');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <h3 className="text-lg font-semibold">Error Loading Posts</h3>
          <p className="text-sm">{error}</p>
        </div>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Featured Post */}
      {featuredPost && (
        <section className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate mb-4">Latest Insights</h2>
            <p className="text-lg text-mist">Expert perspectives on automation strategy and implementation</p>
          </div>

          <Card variant="elevated" className="overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/3">
                <div className="h-64 bg-gradient-to-br from-sea-glow/20 to-sea-glow/40 flex items-center justify-center">
                  <div className="text-6xl text-white/20">📝</div>
                </div>
              </div>
              <div className="md:w-2/3 p-8">
                <div className="flex items-center space-x-2 mb-3">
                  <Badge variant="primary">Featured</Badge>
                  {featuredPost.categories.slice(0, 2).map(category => (
                    <Badge key={category} variant="outline" size="sm">
                      {category}
                    </Badge>
                  ))}
                </div>

                <h3 className="text-2xl font-bold text-slate mb-4 hover:text-sea-glow transition-colors cursor-pointer"
                    onClick={() => handleViewPost(featuredPost)}>
                  {featuredPost.title}
                </h3>

                <p className="text-mist mb-6">
                  {featuredPost.excerpt}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-mist">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-sea-glow rounded-full flex items-center justify-center text-white text-xs font-bold mr-2">
                        {featuredPost.author.name.charAt(0)}
                      </div>
                      {featuredPost.author.name}
                    </div>
                    <span className="flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      {formatDate(featuredPost.publishedAt!)}
                    </span>
                    <span className="flex items-center">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      {featuredPost.readTime} min read
                    </span>
                  </div>

                  <Button onClick={() => handleViewPost(featuredPost)}>
                    Read More
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold text-slate">All Insights</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Search insights..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
            />

            <select
              value={filters.category || 'All Categories'}
              onChange={(e) => handleFilterChange('category', e.target.value === 'All Categories' ? '' : e.target.value)}
              className="block w-full rounded-md border border-mist/30 px-3 py-2 text-slate bg-white focus:border-sea-glow focus:outline-none focus:ring-1 focus:ring-sea-glow"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-mist">
          Showing {paginatedPosts.length} of {filteredPosts.length} insights
        </p>
      </div>

      {/* Posts Grid */}
      <LoadingState loading={loading} error={null}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {paginatedPosts.map((post) => (
            <Card key={post.id} variant="elevated" className="group hover:scale-105 transition-transform duration-200 h-full">
              <CardContent className="p-0 h-full flex flex-col">
                {/* Featured Image */}
                <div className="h-48 bg-gradient-to-br from-mist/20 to-mist/40 relative overflow-hidden rounded-t-lg">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-4xl text-white/20">📄</div>
                  </div>
                  <div className="absolute top-4 left-4">
                    <Badge variant="outline" size="sm">
                      {post.categories[0]}
                    </Badge>
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-lg font-semibold text-slate mb-3 group-hover:text-sea-glow transition-colors line-clamp-2 cursor-pointer"
                      onClick={() => handleViewPost(post)}>
                    {post.title}
                  </h3>

                  <p className="text-mist mb-4 text-sm line-clamp-3 flex-1">
                    {post.excerpt}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {post.tags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="inline-flex items-center text-xs text-sea-glow">
                        <TagIcon className="h-3 w-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Author and Meta */}
                  <div className="flex items-center justify-between text-xs text-mist mb-4">
                    <div className="flex items-center">
                      <div className="w-6 h-6 bg-sea-glow rounded-full flex items-center justify-center text-white text-xs font-bold mr-2">
                        {post.author.name.charAt(0)}
                      </div>
                      {post.author.name}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span>{formatDate(post.publishedAt!)}</span>
                      <span>•</span>
                      <span>{post.readTime} min</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full group-hover:bg-sea-glow group-hover:text-white transition-colors"
                    onClick={() => handleViewPost(post)}
                  >
                    Read Article
                    <ArrowRightIcon className="ml-2 h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </LoadingState>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>

          <div className="flex space-x-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={page === currentPage ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className="w-10"
              >
                {page}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};
