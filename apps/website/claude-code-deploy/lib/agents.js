const fs = require('fs-extra');
const path = require('path');

/**
 * Complete Agent Catalog with 47 Professional Agents
 * Organized by category with comprehensive metadata
 */
const AGENT_CATALOG = {
  // Backend Development Agents
  backend: [
    {
      name: 'express-api',
      title: 'Express.js REST API',
      description: 'Production-ready Express.js API server with authentication, validation, and database integration',
      technologies: ['Node.js', 'Express', 'MongoDB', 'JWT', 'Swagger'],
      complexity: 'intermediate',
      estimatedTime: '2-4 hours',
      features: ['REST API', 'Authentication', 'Database ORM', 'API Documentation', 'Error Handling']
    },
    {
      name: 'fastapi-server',
      title: 'FastAPI Python Server',
      description: 'High-performance Python API server with automatic OpenAPI documentation and async support',
      technologies: ['Python', 'FastAPI', 'PostgreSQL', 'SQLAlchemy', 'Pydantic'],
      complexity: 'intermediate',
      estimatedTime: '2-3 hours',
      features: ['Async API', 'Auto Documentation', 'Type Validation', 'Database Models', 'CORS Support']
    },
    {
      name: 'graphql-server',
      title: 'GraphQL API Server',
      description: 'Modern GraphQL server with Apollo Server, schema federation, and real-time subscriptions',
      technologies: ['Node.js', 'Apollo Server', 'GraphQL', 'MongoDB', 'Redis'],
      complexity: 'advanced',
      estimatedTime: '4-6 hours',
      features: ['GraphQL Schema', 'Subscriptions', 'Federation', 'Caching', 'Playground']
    },
    {
      name: 'microservice-template',
      title: 'Microservice Template',
      description: 'Docker-ready microservice with health checks, logging, metrics, and service discovery',
      technologies: ['Node.js', 'Docker', 'Kubernetes', 'Prometheus', 'Consul'],
      complexity: 'advanced',
      estimatedTime: '3-5 hours',
      features: ['Service Discovery', 'Health Checks', 'Metrics Collection', 'Logging', 'Auto-scaling']
    },
    {
      name: 'serverless-functions',
      title: 'Serverless Functions',
      description: 'AWS Lambda functions with API Gateway, DynamoDB, and serverless framework deployment',
      technologies: ['Node.js', 'AWS Lambda', 'API Gateway', 'DynamoDB', 'Serverless Framework'],
      complexity: 'intermediate',
      estimatedTime: '2-4 hours',
      features: ['Lambda Functions', 'API Gateway', 'NoSQL Database', 'Auto Deployment', 'Cost Optimization']
    },
    {
      name: 'spring-boot-api',
      title: 'Spring Boot REST API',
      description: 'Enterprise Java API with Spring Security, JPA, and comprehensive testing suite',
      technologies: ['Java', 'Spring Boot', 'PostgreSQL', 'Spring Security', 'JUnit'],
      complexity: 'advanced',
      estimatedTime: '4-6 hours',
      features: ['Spring Security', 'JPA/Hibernate', 'Unit Testing', 'API Documentation', 'Profiles']
    }
  ],

  // Frontend Development Agents
  frontend: [
    {
      name: 'react-dashboard',
      title: 'React Admin Dashboard',
      description: 'Modern React dashboard with Material-UI, charts, tables, and responsive design',
      technologies: ['React', 'Material-UI', 'Chart.js', 'React Router', 'Redux Toolkit'],
      complexity: 'intermediate',
      estimatedTime: '3-5 hours',
      features: ['Admin Interface', 'Data Visualization', 'Responsive Design', 'State Management', 'Routing']
    },
    {
      name: 'vue-spa',
      title: 'Vue.js Single Page App',
      description: 'Vue 3 SPA with Composition API, Vuetify, and modern development tools',
      technologies: ['Vue 3', 'Vuetify', 'Vue Router', 'Pinia', 'Vite'],
      complexity: 'intermediate',
      estimatedTime: '2-4 hours',
      features: ['Composition API', 'Component Library', 'State Management', 'Hot Reload', 'TypeScript']
    },
    {
      name: 'angular-enterprise',
      title: 'Angular Enterprise App',
      description: 'Enterprise Angular application with NgRx, Angular Material, and testing framework',
      technologies: ['Angular', 'NgRx', 'Angular Material', 'RxJS', 'Jasmine'],
      complexity: 'advanced',
      estimatedTime: '4-6 hours',
      features: ['State Management', 'Component Library', 'Reactive Programming', 'Testing', 'Lazy Loading']
    },
    {
      name: 'nextjs-website',
      title: 'Next.js Website',
      description: 'SEO-optimized Next.js website with static generation, API routes, and Tailwind CSS',
      technologies: ['Next.js', 'React', 'Tailwind CSS', 'Vercel', 'MDX'],
      complexity: 'intermediate',
      estimatedTime: '2-4 hours',
      features: ['SSG/SSR', 'API Routes', 'SEO Optimization', 'Image Optimization', 'Performance']
    },
    {
      name: 'svelte-app',
      title: 'Svelte Application',
      description: 'Lightweight Svelte app with SvelteKit, TypeScript, and component-based architecture',
      technologies: ['Svelte', 'SvelteKit', 'TypeScript', 'Tailwind CSS', 'Vite'],
      complexity: 'beginner',
      estimatedTime: '1-3 hours',
      features: ['Reactive Framework', 'File-based Routing', 'Zero Runtime', 'TypeScript', 'Fast Builds']
    },
    {
      name: 'progressive-web-app',
      title: 'Progressive Web App',
      description: 'PWA with service workers, offline capability, push notifications, and app-like experience',
      technologies: ['React', 'Service Worker', 'Workbox', 'Web App Manifest', 'IndexedDB'],
      complexity: 'advanced',
      estimatedTime: '4-6 hours',
      features: ['Offline Support', 'Push Notifications', 'App Installation', 'Background Sync', 'Performance']
    }
  ],

  // Full-Stack Development Agents
  fullstack: [
    {
      name: 'mern-stack',
      title: 'MERN Stack Application',
      description: 'Complete MERN stack app with authentication, CRUD operations, and deployment configuration',
      technologies: ['MongoDB', 'Express', 'React', 'Node.js', 'JWT'],
      complexity: 'advanced',
      estimatedTime: '6-8 hours',
      features: ['Full Authentication', 'CRUD Operations', 'File Upload', 'Real-time Updates', 'Deployment']
    },
    {
      name: 'mean-stack',
      title: 'MEAN Stack Application',
      description: 'Angular-based MEAN stack with MongoDB, Express, and comprehensive admin panel',
      technologies: ['MongoDB', 'Express', 'Angular', 'Node.js', 'Socket.io'],
      complexity: 'advanced',
      estimatedTime: '6-8 hours',
      features: ['Angular Frontend', 'Real-time Communication', 'Admin Dashboard', 'User Management', 'API Integration']
    },
    {
      name: 'django-fullstack',
      title: 'Django Full-Stack App',
      description: 'Django application with React frontend, REST API, and PostgreSQL database',
      technologies: ['Django', 'React', 'PostgreSQL', 'Django REST Framework', 'Celery'],
      complexity: 'advanced',
      estimatedTime: '5-7 hours',
      features: ['Django Backend', 'React Frontend', 'REST API', 'Background Tasks', 'Admin Interface']
    },
    {
      name: 'rails-webapp',
      title: 'Ruby on Rails Web App',
      description: 'Full-featured Rails application with Turbo, Stimulus, and modern frontend integration',
      technologies: ['Ruby on Rails', 'Turbo', 'Stimulus', 'PostgreSQL', 'Tailwind CSS'],
      complexity: 'intermediate',
      estimatedTime: '4-6 hours',
      features: ['Turbo Framework', 'Stimulus JS', 'Active Record', 'Action Cable', 'Testing Suite']
    },
    {
      name: 'laravel-app',
      title: 'Laravel PHP Application',
      description: 'Modern Laravel app with Livewire, Inertia.js, and comprehensive feature set',
      technologies: ['PHP', 'Laravel', 'Livewire', 'Inertia.js', 'MySQL'],
      complexity: 'intermediate',
      estimatedTime: '4-6 hours',
      features: ['Livewire Components', 'Inertia SPA', 'Eloquent ORM', 'Queue System', 'Testing']
    }
  ],

  // Mobile Development Agents
  mobile: [
    {
      name: 'react-native-app',
      title: 'React Native Mobile App',
      description: 'Cross-platform mobile app with navigation, state management, and native integrations',
      technologies: ['React Native', 'Expo', 'Redux Toolkit', 'React Navigation', 'Native Modules'],
      complexity: 'intermediate',
      estimatedTime: '4-6 hours',
      features: ['Cross Platform', 'Native Navigation', 'State Management', 'Push Notifications', 'Camera Integration']
    },
    {
      name: 'flutter-app',
      title: 'Flutter Mobile Application',
      description: 'Flutter app with Material Design, state management, and platform-specific features',
      technologies: ['Flutter', 'Dart', 'Provider', 'Firebase', 'Platform Channels'],
      complexity: 'intermediate',
      estimatedTime: '4-6 hours',
      features: ['Material Design', 'State Management', 'Firebase Integration', 'Platform Channels', 'Animations']
    },
    {
      name: 'ionic-hybrid',
      title: 'Ionic Hybrid App',
      description: 'Ionic framework app with Capacitor, Angular, and native device access',
      technologies: ['Ionic', 'Angular', 'Capacitor', 'TypeScript', 'Cordova Plugins'],
      complexity: 'intermediate',
      estimatedTime: '3-5 hours',
      features: ['Hybrid Development', 'Native Plugins', 'UI Components', 'Device Access', 'Web Technologies']
    },
    {
      name: 'swift-ios-app',
      title: 'Swift iOS Application',
      description: 'Native iOS app with SwiftUI, Core Data, and iOS-specific features',
      technologies: ['Swift', 'SwiftUI', 'Core Data', 'Combine', 'CloudKit'],
      complexity: 'advanced',
      estimatedTime: '5-7 hours',
      features: ['SwiftUI Interface', 'Core Data', 'Reactive Programming', 'Cloud Sync', 'iOS Integration']
    },
    {
      name: 'kotlin-android-app',
      title: 'Kotlin Android App',
      description: 'Modern Android app with Jetpack Compose, Room database, and Material Design',
      technologies: ['Kotlin', 'Jetpack Compose', 'Room', 'ViewModel', 'Material Design'],
      complexity: 'advanced',
      estimatedTime: '5-7 hours',
      features: ['Jetpack Compose', 'MVVM Architecture', 'Room Database', 'Material Design', 'Android APIs']
    }
  ],

  // DevOps and Infrastructure Agents
  devops: [
    {
      name: 'docker-compose-stack',
      title: 'Docker Compose Stack',
      description: 'Multi-service Docker Compose setup with databases, caching, and monitoring',
      technologies: ['Docker', 'Docker Compose', 'Nginx', 'PostgreSQL', 'Redis'],
      complexity: 'intermediate',
      estimatedTime: '2-4 hours',
      features: ['Multi-service Setup', 'Load Balancing', 'Database Setup', 'Caching Layer', 'Health Checks']
    },
    {
      name: 'kubernetes-deployment',
      title: 'Kubernetes Deployment',
      description: 'Kubernetes manifests with deployments, services, ingress, and monitoring setup',
      technologies: ['Kubernetes', 'Helm', 'Prometheus', 'Grafana', 'Ingress'],
      complexity: 'advanced',
      estimatedTime: '4-6 hours',
      features: ['K8s Manifests', 'Helm Charts', 'Monitoring', 'Auto-scaling', 'Service Mesh']
    },
    {
      name: 'terraform-infrastructure',
      title: 'Terraform Infrastructure',
      description: 'Infrastructure as Code with Terraform for AWS/Azure/GCP deployment',
      technologies: ['Terraform', 'AWS', 'Azure', 'GCP', 'Ansible'],
      complexity: 'advanced',
      estimatedTime: '4-6 hours',
      features: ['Infrastructure as Code', 'Multi-cloud Support', 'State Management', 'Resource Planning', 'Security']
    },
    {
      name: 'ci-cd-pipeline',
      title: 'CI/CD Pipeline',
      description: 'Complete CI/CD setup with GitHub Actions, testing, building, and deployment',
      technologies: ['GitHub Actions', 'Docker', 'AWS', 'SonarQube', 'Slack'],
      complexity: 'intermediate',
      estimatedTime: '3-5 hours',
      features: ['Automated Testing', 'Build Pipeline', 'Deployment Automation', 'Code Quality', 'Notifications']
    },
    {
      name: 'monitoring-stack',
      title: 'Monitoring and Observability',
      description: 'Complete monitoring solution with Prometheus, Grafana, and alerting',
      technologies: ['Prometheus', 'Grafana', 'ElasticSearch', 'Kibana', 'AlertManager'],
      complexity: 'advanced',
      estimatedTime: '4-6 hours',
      features: ['Metrics Collection', 'Visualization', 'Log Aggregation', 'Alerting', 'Dashboards']
    }
  ],

  // AI and Machine Learning Agents
  'ai-ml': [
    {
      name: 'ml-api-server',
      title: 'Machine Learning API',
      description: 'ML model serving API with FastAPI, model versioning, and prediction endpoints',
      technologies: ['Python', 'FastAPI', 'scikit-learn', 'TensorFlow', 'MLflow'],
      complexity: 'advanced',
      estimatedTime: '4-6 hours',
      features: ['Model Serving', 'Prediction API', 'Model Versioning', 'A/B Testing', 'Monitoring']
    },
    {
      name: 'llm-chatbot',
      title: 'LLM-Powered Chatbot',
      description: 'Intelligent chatbot with OpenAI/Anthropic integration and conversation management',
      technologies: ['Python', 'OpenAI API', 'Anthropic', 'FastAPI', 'Redis'],
      complexity: 'intermediate',
      estimatedTime: '3-5 hours',
      features: ['LLM Integration', 'Conversation Memory', 'Response Streaming', 'Rate Limiting', 'Context Management']
    },
    {
      name: 'computer-vision-api',
      title: 'Computer Vision API',
      description: 'Image processing API with object detection, classification, and analysis features',
      technologies: ['Python', 'OpenCV', 'TensorFlow', 'YOLO', 'FastAPI'],
      complexity: 'advanced',
      estimatedTime: '5-7 hours',
      features: ['Object Detection', 'Image Classification', 'Face Recognition', 'Image Processing', 'Batch Processing']
    },
    {
      name: 'nlp-text-analysis',
      title: 'NLP Text Analysis',
      description: 'Natural Language Processing API for sentiment analysis, entity recognition, and text classification',
      technologies: ['Python', 'spaCy', 'NLTK', 'Transformers', 'FastAPI'],
      complexity: 'advanced',
      estimatedTime: '4-6 hours',
      features: ['Sentiment Analysis', 'Named Entity Recognition', 'Text Classification', 'Language Detection', 'Summarization']
    },
    {
      name: 'recommendation-engine',
      title: 'Recommendation Engine',
      description: 'ML-powered recommendation system with collaborative and content-based filtering',
      technologies: ['Python', 'Pandas', 'scikit-learn', 'Surprise', 'FastAPI'],
      complexity: 'advanced',
      estimatedTime: '5-7 hours',
      features: ['Collaborative Filtering', 'Content-based Filtering', 'Hybrid Recommendations', 'Real-time Scoring', 'A/B Testing']
    }
  ],

  // Data Engineering and Analytics Agents
  data: [
    {
      name: 'etl-pipeline',
      title: 'ETL Data Pipeline',
      description: 'Extract, Transform, Load pipeline with Apache Airflow and data validation',
      technologies: ['Python', 'Apache Airflow', 'Pandas', 'PostgreSQL', 'Apache Spark'],
      complexity: 'advanced',
      estimatedTime: '5-7 hours',
      features: ['Data Extraction', 'Data Transformation', 'Pipeline Orchestration', 'Data Validation', 'Monitoring']
    },
    {
      name: 'data-warehouse',
      title: 'Data Warehouse Setup',
      description: 'Modern data warehouse with dbt, Snowflake/BigQuery, and analytics tools',
      technologies: ['dbt', 'Snowflake', 'BigQuery', 'Looker', 'Python'],
      complexity: 'advanced',
      estimatedTime: '6-8 hours',
      features: ['Data Modeling', 'ETL/ELT', 'Analytics', 'Data Quality', 'Visualization']
    },
    {
      name: 'real-time-analytics',
      title: 'Real-time Analytics',
      description: 'Streaming analytics platform with Kafka, Spark Streaming, and real-time dashboards',
      technologies: ['Apache Kafka', 'Spark Streaming', 'Elasticsearch', 'Kibana', 'Redis'],
      complexity: 'advanced',
      estimatedTime: '6-8 hours',
      features: ['Stream Processing', 'Real-time Analytics', 'Event Sourcing', 'Live Dashboards', 'Alerting']
    },
    {
      name: 'data-api-gateway',
      title: 'Data API Gateway',
      description: 'Unified data access API with GraphQL, caching, and data source federation',
      technologies: ['GraphQL', 'Apollo Federation', 'Redis', 'PostgreSQL', 'Elasticsearch'],
      complexity: 'advanced',
      estimatedTime: '4-6 hours',
      features: ['Data Federation', 'Query Optimization', 'Caching Strategy', 'Rate Limiting', 'Analytics']
    },
    {
      name: 'business-intelligence',
      title: 'Business Intelligence Dashboard',
      description: 'BI dashboard with data visualization, KPI tracking, and automated reporting',
      technologies: ['Python', 'Dash', 'Plotly', 'Pandas', 'PostgreSQL'],
      complexity: 'intermediate',
      estimatedTime: '4-6 hours',
      features: ['Interactive Dashboards', 'KPI Tracking', 'Automated Reports', 'Data Export', 'User Management']
    }
  ],

  // Security and Compliance Agents
  security: [
    {
      name: 'auth-service',
      title: 'Authentication Service',
      description: 'Comprehensive auth service with OAuth2, JWT, MFA, and user management',
      technologies: ['Node.js', 'OAuth2', 'JWT', 'Redis', 'PostgreSQL'],
      complexity: 'advanced',
      estimatedTime: '5-7 hours',
      features: ['OAuth2/OIDC', 'Multi-factor Auth', 'Session Management', 'Rate Limiting', 'Audit Logging']
    },
    {
      name: 'api-security-gateway',
      title: 'API Security Gateway',
      description: 'Security-first API gateway with rate limiting, authentication, and threat protection',
      technologies: ['Kong', 'Nginx', 'Redis', 'OAuth2', 'WAF'],
      complexity: 'advanced',
      estimatedTime: '4-6 hours',
      features: ['API Gateway', 'Rate Limiting', 'DDoS Protection', 'Request Validation', 'Security Headers']
    },
    {
      name: 'encryption-service',
      title: 'Encryption and Key Management',
      description: 'Encryption service with key rotation, secure storage, and cryptographic operations',
      technologies: ['Python', 'HashiCorp Vault', 'AWS KMS', 'cryptography', 'FastAPI'],
      complexity: 'advanced',
      estimatedTime: '5-7 hours',
      features: ['Key Management', 'Data Encryption', 'Key Rotation', 'Secure Storage', 'Audit Trail']
    },
    {
      name: 'security-scanner',
      title: 'Security Vulnerability Scanner',
      description: 'Automated security scanning tool for code, dependencies, and infrastructure',
      technologies: ['Python', 'Bandit', 'Safety', 'OWASP ZAP', 'SonarQube'],
      complexity: 'intermediate',
      estimatedTime: '3-5 hours',
      features: ['Code Scanning', 'Dependency Check', 'SAST/DAST', 'Compliance Reports', 'CI/CD Integration']
    },
    {
      name: 'compliance-monitor',
      title: 'Compliance Monitoring',
      description: 'Compliance monitoring system for GDPR, HIPAA, SOC2, and other regulations',
      technologies: ['Python', 'Elasticsearch', 'Kibana', 'PostgreSQL', 'FastAPI'],
      complexity: 'advanced',
      estimatedTime: '5-7 hours',
      features: ['Compliance Tracking', 'Audit Logging', 'Policy Enforcement', 'Risk Assessment', 'Reporting']
    }
  ]
};

/**
 * Agent Management Functions
 */
class AgentManager {
  constructor() {
    this.catalog = AGENT_CATALOG;
  }

  /**
   * Get all available agents
   * @param {Object} options - Filter options
   * @returns {Array} List of agents
   */
  async getAgents(options = {}) {
    let agents = [];

    // Flatten catalog into single array
    Object.entries(this.catalog).forEach(([category, categoryAgents]) => {
      categoryAgents.forEach(agent => {
        agents.push({
          ...agent,
          category,
          deployed: false // This would be checked against actual deployments
        });
      });
    });

    // Apply filters
    if (options.category) {
      agents = agents.filter(agent => agent.category === options.category);
    }

    if (options.search) {
      const searchTerm = options.search.toLowerCase();
      agents = agents.filter(agent =>
        agent.name.toLowerCase().includes(searchTerm) ||
        agent.title.toLowerCase().includes(searchTerm) ||
        agent.description.toLowerCase().includes(searchTerm) ||
        agent.technologies.some(tech => tech.toLowerCase().includes(searchTerm))
      );
    }

    return agents;
  }

  /**
   * Get specific agent by name
   * @param {string} agentName - Agent name
   * @returns {Object|null} Agent object or null
   */
  async getAgent(agentName) {
    const agents = await this.getAgents();
    return agents.find(agent => agent.name === agentName) || null;
  }

  /**
   * Get all available categories
   * @returns {Array} List of categories
   */
  getCategories() {
    return Object.keys(this.catalog);
  }

  /**
   * Get agents by category
   * @param {string} category - Category name
   * @returns {Array} List of agents in category
   */
  async getAgentsByCategory(category) {
    return this.catalog[category] || [];
  }

  /**
   * Get agent statistics
   * @returns {Object} Statistics object
   */
  async getStatistics() {
    const agents = await this.getAgents();
    const categories = this.getCategories();

    const stats = {
      total: agents.length,
      categories: categories.length,
      byCategory: {},
      byComplexity: {
        beginner: 0,
        intermediate: 0,
        advanced: 0
      },
      byTechnology: {}
    };

    // Count by category
    categories.forEach(category => {
      stats.byCategory[category] = this.catalog[category].length;
    });

    // Count by complexity and technology
    agents.forEach(agent => {
      stats.byComplexity[agent.complexity]++;

      agent.technologies.forEach(tech => {
        stats.byTechnology[tech] = (stats.byTechnology[tech] || 0) + 1;
      });
    });

    return stats;
  }

  /**
   * Search agents by multiple criteria
   * @param {Object} criteria - Search criteria
   * @returns {Array} Matching agents
   */
  async searchAgents(criteria) {
    let agents = await this.getAgents();

    if (criteria.name) {
      agents = agents.filter(agent =>
        agent.name.toLowerCase().includes(criteria.name.toLowerCase())
      );
    }

    if (criteria.technology) {
      agents = agents.filter(agent =>
        agent.technologies.some(tech =>
          tech.toLowerCase().includes(criteria.technology.toLowerCase())
        )
      );
    }

    if (criteria.complexity) {
      agents = agents.filter(agent => agent.complexity === criteria.complexity);
    }

    if (criteria.category) {
      agents = agents.filter(agent => agent.category === criteria.category);
    }

    return agents;
  }

  /**
   * Validate agent configuration
   * @param {string} agentName - Agent name
   * @param {Object} config - Configuration object
   * @returns {Object} Validation result
   */
  async validateAgent(agentName, config = {}) {
    const agent = await this.getAgent(agentName);

    if (!agent) {
      return {
        valid: false,
        errors: [`Agent '${agentName}' not found`]
      };
    }

    const errors = [];
    const warnings = [];

    // Basic validation
    if (config.path && !path.isAbsolute(config.path)) {
      errors.push('Path must be absolute');
    }

    // Technology-specific validation
    if (agent.technologies.includes('Docker') && !config.dockerSupport) {
      warnings.push('Docker support recommended for this agent');
    }

    if (agent.complexity === 'advanced' && !config.confirmAdvanced) {
      warnings.push('This is an advanced agent - ensure you have necessary expertise');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      agent
    };
  }
}

// Create singleton instance
const agentManager = new AgentManager();

module.exports = {
  getAgents: (options) => agentManager.getAgents(options),
  getAgent: (name) => agentManager.getAgent(name),
  getCategories: () => agentManager.getCategories(),
  getAgentsByCategory: (category) => agentManager.getAgentsByCategory(category),
  getStatistics: () => agentManager.getStatistics(),
  searchAgents: (criteria) => agentManager.searchAgents(criteria),
  validateAgent: (name, config) => agentManager.validateAgent(name, config),
  AGENT_CATALOG
};
