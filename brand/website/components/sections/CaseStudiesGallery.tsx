'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { LoadingState } from '../ui/LoadingSpinner';
import { 
  MagnifyingGlassIcon, 
  ArrowRightIcon,
  FunnelIcon,
  ClockIcon,
  UsersIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { CaseStudy, CaseStudyFilters } from '../../types/api';

interface CaseStudiesGalleryProps {
  caseStudies?: CaseStudy[];
  loading?: boolean;
  error?: string | null;
  onViewCaseStudy?: (caseStudy: CaseStudy) => void;
  showFilters?: boolean;
  itemsPerPage?: number;
}

// Mock case studies data
const mockCaseStudies: CaseStudy[] = [
  {
    id: '1',
    title: 'TechFlow Solutions: 85% Faster Customer Onboarding',
    slug: 'techflow-solutions-customer-onboarding',
    client: 'TechFlow Solutions',
    industry: 'Technology Services',
    challenge: 'Manual customer onboarding process took 3 days and required constant follow-up. High error rates and inconsistent experience across different team members.',
    solution: 'Implemented automated onboarding workflow with smart document collection, automated verification, and real-time status tracking. Integrated with CRM and billing systems.',
    results: [
      {
        metric: 'Processing Time',
        before: '3 days',
        after: '4 hours',
        improvement: '85% faster',
        description: 'End-to-end onboarding process'
      },
      {
        metric: 'Error Rate',
        before: '12%',
        after: '1%',
        improvement: '92% reduction',
        description: 'Document and data entry errors'
      },
      {
        metric: 'Team Efficiency',
        before: '40%',
        after: '120%',
        improvement: '3x improvement',
        description: 'Staff can handle 3x more clients'
      }
    ],
    technologies: ['Workflow Automation', 'Document Processing', 'CRM Integration', 'API Automation'],
    timeline: '2 weeks',
    teamSize: 15,
    featured: true,
    thumbnail: '/images/case-studies/techflow-thumbnail.jpg',
    images: ['/images/case-studies/techflow-1.jpg', '/images/case-studies/techflow-2.jpg'],
    publishedAt: '2024-01-15',
    createdAt: '2024-01-10',
    updatedAt: '2024-01-15'
  },
  {
    id: '2',
    title: 'GreenLeaf Manufacturing: $200K Annual Savings',
    slug: 'greenleaf-manufacturing-inventory-automation',
    client: 'GreenLeaf Manufacturing',
    industry: 'Manufacturing',
    challenge: 'Manual inventory management led to overstock, stockouts, and poor demand forecasting. Lack of real-time visibility into supply chain.',
    solution: 'Built predictive inventory system with automated reordering, demand forecasting, and supplier integration. Real-time dashboards for operations team.',
    results: [
      {
        metric: 'Cost Savings',
        before: '$0',
        after: '$200K',
        improvement: '$200K annually',
        description: 'Reduced carrying costs and stockouts'
      },
      {
        metric: 'Inventory Accuracy',
        before: '78%',
        after: '99.7%',
        improvement: '99.7% accuracy',
        description: 'Real-time inventory tracking'
      },
      {
        metric: 'Order Processing',
        before: '2 hours',
        after: '5 minutes',
        improvement: '60% faster',
        description: 'Automated purchase orders'
      }
    ],
    technologies: ['Predictive Analytics', 'ERP Integration', 'Supplier APIs', 'Real-time Dashboards'],
    timeline: '3 weeks',
    teamSize: 25,
    featured: true,
    thumbnail: '/images/case-studies/greenleaf-thumbnail.jpg',
    images: ['/images/case-studies/greenleaf-1.jpg'],
    publishedAt: '2024-01-20',
    createdAt: '2024-01-12',
    updatedAt: '2024-01-20'
  },
  {
    id: '3',
    title: 'Precision Consulting: 84% Faster Month-End Closing',
    slug: 'precision-consulting-financial-automation',
    client: 'Precision Consulting',
    industry: 'Professional Services',
    challenge: 'Month-end financial closing took 5 days with manual data collection, reconciliation, and report generation. High stress and overtime for finance team.',
    solution: 'Automated data collection from multiple systems, built reconciliation workflows, and created automated financial reporting with exception handling.',
    results: [
      {
        metric: 'Closing Time',
        before: '5 days',
        after: '8 hours',
        improvement: '84% time reduction',
        description: 'Complete month-end process'
      },
      {
        metric: 'Report Accuracy',
        before: '92%',
        after: '100%',
        improvement: '100% error-free',
        description: 'Automated validation checks'
      },
      {
        metric: 'Team Satisfaction',
        before: '3.2/5',
        after: '4.8/5',
        improvement: '95% positive',
        description: 'Reduced stress and overtime'
      }
    ],
    technologies: ['Financial Automation', 'Data Integration', 'Report Generation', 'Exception Handling'],
    timeline: '2 weeks',
    teamSize: 8,
    featured: false,
    thumbnail: '/images/case-studies/precision-thumbnail.jpg',
    images: ['/images/case-studies/precision-1.jpg'],
    publishedAt: '2024-01-25',
    createdAt: '2024-01-18',
    updatedAt: '2024-01-25'
  },
  {
    id: '4',
    title: 'HealthCare Plus: 40% Reduction in No-Shows',
    slug: 'healthcare-plus-scheduling-automation',
    client: 'HealthCare Plus',
    industry: 'Healthcare',
    challenge: 'Manual scheduling led to double-bookings, high no-show rates, and staff inefficiency. Patient satisfaction was declining due to scheduling issues.',
    solution: 'Implemented intelligent scheduling system with automated reminders, waitlist management, and predictive scheduling based on patient history.',
    results: [
      {
        metric: 'Scheduling Conflicts',
        before: '15%',
        after: '0%',
        improvement: '100% elimination',
        description: 'Zero double-bookings'
      },
      {
        metric: 'No-show Rate',
        before: '25%',
        after: '15%',
        improvement: '40% reduction',
        description: 'Automated reminder system'
      },
      {
        metric: 'Patient Satisfaction',
        before: '3.8/5',
        after: '4.8/5',
        improvement: '4.8/5 rating',
        description: 'Improved scheduling experience'
      }
    ],
    technologies: ['Scheduling Automation', 'SMS/Email Integration', 'Predictive Analytics', 'Patient Portal'],
    timeline: '3 weeks',
    teamSize: 12,
    featured: false,
    thumbnail: '/images/case-studies/healthcare-thumbnail.jpg',
    images: ['/images/case-studies/healthcare-1.jpg'],
    publishedAt: '2024-01-30',
    createdAt: '2024-01-22',
    updatedAt: '2024-01-30'
  },
  {
    id: '5',
    title: 'RetailMax: 45% Improvement in Inventory Turnover',
    slug: 'retailmax-demand-forecasting',
    client: 'RetailMax',
    industry: 'Retail',
    challenge: 'Poor demand forecasting led to excess inventory and missed sales opportunities. Seasonal trends were hard to predict accurately.',
    solution: 'Built AI-powered demand forecasting system with multi-channel sales data integration and automated purchasing recommendations.',
    results: [
      {
        metric: 'Inventory Turnover',
        before: '4.2x',
        after: '6.1x',
        improvement: '45% improvement',
        description: 'Annual inventory turnover rate'
      },
      {
        metric: 'Stockout Reduction',
        before: '18%',
        after: '5%',
        improvement: '72% reduction',
        description: 'Products out of stock'
      },
      {
        metric: 'Profit Margin',
        before: '22%',
        after: '28%',
        improvement: '27% increase',
        description: 'Reduced markdowns and waste'
      }
    ],
    technologies: ['Machine Learning', 'Sales Analytics', 'Multi-channel Integration', 'Automated Purchasing'],
    timeline: '4 weeks',
    teamSize: 35,
    featured: false,
    thumbnail: '/images/case-studies/retailmax-thumbnail.jpg',
    images: ['/images/case-studies/retailmax-1.jpg'],
    publishedAt: '2024-02-05',
    createdAt: '2024-01-28',
    updatedAt: '2024-02-05'
  }
];

const industries = ['All Industries', 'Technology Services', 'Manufacturing', 'Professional Services', 'Healthcare', 'Retail'];
const technologies = ['All Technologies', 'Workflow Automation', 'Predictive Analytics', 'API Integration', 'Machine Learning', 'Data Integration'];

export const CaseStudiesGallery: React.FC<CaseStudiesGalleryProps> = ({
  caseStudies = mockCaseStudies,
  loading = false,
  error = null,
  onViewCaseStudy,
  showFilters = true,
  itemsPerPage = 6
}) => {
  const [filters, setFilters] = useState<CaseStudyFilters>({
    industry: '',
    technology: '',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Filter and search logic
  const filteredCaseStudies = useMemo(() => {
    return caseStudies.filter(caseStudy => {
      const matchesIndustry = !filters.industry || filters.industry === 'All Industries' || caseStudy.industry === filters.industry;
      const matchesTechnology = !filters.technology || filters.technology === 'All Technologies' || 
        caseStudy.technologies.some(tech => tech.includes(filters.technology || ''));
      const matchesSearch = !filters.search || 
        caseStudy.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        caseStudy.client.toLowerCase().includes(filters.search.toLowerCase()) ||
        caseStudy.challenge.toLowerCase().includes(filters.search.toLowerCase()) ||
        caseStudy.solution.toLowerCase().includes(filters.search.toLowerCase());

      return matchesIndustry && matchesTechnology && matchesSearch;
    });
  }, [caseStudies, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredCaseStudies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCaseStudies = filteredCaseStudies.slice(startIndex, startIndex + itemsPerPage);

  // Featured case studies
  const featuredCaseStudies = caseStudies.filter(cs => cs.featured).slice(0, 2);

  const handleFilterChange = (key: keyof CaseStudyFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({ industry: '', technology: '', search: '' });
    setCurrentPage(1);
  };

  const handleViewCaseStudy = (caseStudy: CaseStudy) => {
    onViewCaseStudy?.(caseStudy);
    // Could also navigate to case study detail page
    window.open(`/case-studies/${caseStudy.slug}`, '_blank');
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <h3 className="text-lg font-semibold">Error Loading Case Studies</h3>
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
      {/* Featured Case Studies */}
      {featuredCaseStudies.length > 0 && (
        <section className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate mb-4">Featured Success Stories</h2>
            <p className="text-lg text-mist">Our most impactful automation implementations</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {featuredCaseStudies.map((caseStudy) => (
              <Card key={caseStudy.id} variant="elevated" className="group hover:scale-105 transition-transform duration-200">
                <CardContent className="p-0">
                  {/* Thumbnail */}
                  <div className="h-48 bg-gradient-to-br from-sea-glow/20 to-sea-glow/40 relative overflow-hidden rounded-t-lg">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-6xl text-white/20">📊</div>
                    </div>
                    <div className="absolute top-4 left-4">
                      <Badge variant="primary">Featured</Badge>
                    </div>
                    <div className="absolute top-4 right-4">
                      <Badge variant="outline">{caseStudy.industry}</Badge>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-slate mb-3 group-hover:text-sea-glow transition-colors">
                      {caseStudy.title}
                    </h3>
                    
                    <p className="text-mist mb-4 text-sm line-clamp-2">
                      {caseStudy.challenge}
                    </p>

                    {/* Key Results */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      {caseStudy.results.slice(0, 3).map((result, idx) => (
                        <div key={idx} className="text-center">
                          <div className="text-lg font-bold text-sea-glow">
                            {result.improvement}
                          </div>
                          <div className="text-xs text-mist">
                            {result.metric}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Meta Info */}
                    <div className="flex items-center justify-between text-xs text-mist mb-4">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center">
                          <ClockIcon className="h-3 w-3 mr-1" />
                          {caseStudy.timeline}
                        </span>
                        <span className="flex items-center">
                          <UsersIcon className="h-3 w-3 mr-1" />
                          {caseStudy.teamSize} team
                        </span>
                      </div>
                    </div>

                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full group-hover:bg-sea-glow group-hover:text-white transition-colors"
                      onClick={() => handleViewCaseStudy(caseStudy)}
                    >
                      Read Full Case Study
                      <ArrowRightIcon className="ml-2 h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold text-slate">All Case Studies</h2>
            
            {/* Mobile Filter Toggle */}
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Filter Controls */}
          <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 ${showMobileFilters ? 'block' : 'hidden lg:grid'}`}>
            <Input
              placeholder="Search case studies..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
            />
            
            <select
              value={filters.industry || 'All Industries'}
              onChange={(e) => handleFilterChange('industry', e.target.value === 'All Industries' ? '' : e.target.value)}
              className="block w-full rounded-md border border-mist/30 px-3 py-2 text-slate bg-white focus:border-sea-glow focus:outline-none focus:ring-1 focus:ring-sea-glow"
            >
              {industries.map(industry => (
                <option key={industry} value={industry}>{industry}</option>
              ))}
            </select>
            
            <select
              value={filters.technology || 'All Technologies'}
              onChange={(e) => handleFilterChange('technology', e.target.value === 'All Technologies' ? '' : e.target.value)}
              className="block w-full rounded-md border border-mist/30 px-3 py-2 text-slate bg-white focus:border-sea-glow focus:outline-none focus:ring-1 focus:ring-sea-glow"
            >
              {technologies.map(technology => (
                <option key={technology} value={technology}>{technology}</option>
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
          Showing {paginatedCaseStudies.length} of {filteredCaseStudies.length} case studies
        </p>
        {filteredCaseStudies.length === 0 && !loading && (
          <p className="text-mist">No case studies match your criteria.</p>
        )}
      </div>

      {/* Case Studies Grid */}
      <LoadingState loading={loading} error={null}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {paginatedCaseStudies.map((caseStudy) => (
            <Card key={caseStudy.id} variant="elevated" className="group hover:scale-105 transition-transform duration-200 h-full">
              <CardContent className="p-0 h-full flex flex-col">
                {/* Thumbnail */}
                <div className="h-32 bg-gradient-to-br from-mist/20 to-mist/40 relative overflow-hidden rounded-t-lg">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ChartBarIcon className="h-12 w-12 text-white/40" />
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge variant="outline" size="sm">{caseStudy.industry}</Badge>
                  </div>
                </div>
                
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="text-lg font-semibold text-slate mb-2 group-hover:text-sea-glow transition-colors line-clamp-2">
                    {caseStudy.title}
                  </h3>
                  
                  <p className="text-mist mb-3 text-sm line-clamp-3 flex-1">
                    {caseStudy.challenge}
                  </p>

                  {/* Top Result */}
                  {caseStudy.results[0] && (
                    <div className="bg-sea-glow/5 rounded-lg p-3 mb-3">
                      <div className="text-center">
                        <div className="text-xl font-bold text-sea-glow">
                          {caseStudy.results[0].improvement}
                        </div>
                        <div className="text-xs text-mist">
                          {caseStudy.results[0].metric}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Technologies */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {caseStudy.technologies.slice(0, 2).map((tech, idx) => (
                      <Badge key={idx} variant="outline" size="sm">
                        {tech}
                      </Badge>
                    ))}
                    {caseStudy.technologies.length > 2 && (
                      <Badge variant="outline" size="sm">
                        +{caseStudy.technologies.length - 2}
                      </Badge>
                    )}
                  </div>

                  {/* Meta Info */}
                  <div className="flex items-center justify-between text-xs text-mist mb-3">
                    <span className="flex items-center">
                      <ClockIcon className="h-3 w-3 mr-1" />
                      {caseStudy.timeline}
                    </span>
                    <span className="flex items-center">
                      <UsersIcon className="h-3 w-3 mr-1" />
                      {caseStudy.teamSize}
                    </span>
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full group-hover:bg-sea-glow group-hover:text-white transition-colors"
                    onClick={() => handleViewCaseStudy(caseStudy)}
                  >
                    View Details
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