const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

// GraphQL schema
const typeDefs = `
  type User {
    id: String!
    email: String!
    name: String!
    role: Role!
  }

  enum Role {
    ADMIN
    ESTIMATOR
    VIEWER
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Project {
    id: String!
    name: String!
    client: String!
    status: String!
    createdAt: String!
    updatedAt: String!
  }

  type Estimate {
    id: String!
    projectId: String!
    clientName: String!
    address: String!
    totalAmount: Float!
    status: String!
    createdAt: String!
  }

  type Query {
    me: User
    projects(filter: String): ProjectConnection!
    estimates(filter: String): EstimateConnection!
    project(id: String!): Project
    estimate(id: String!): Estimate
  }

  type Mutation {
    login(email: String!, password: String!): AuthPayload!
    createProject(input: ProjectInput!): Project!
    updateProject(id: String!, input: ProjectInput!): Project!
    createEstimate(input: EstimateInput!): Estimate!
    updateEstimate(id: String!, input: EstimateInput!): Estimate!
  }

  type ProjectConnection {
    edges: [ProjectEdge!]!
    pageInfo: PageInfo!
  }

  type ProjectEdge {
    node: Project!
    cursor: String!
  }

  type EstimateConnection {
    edges: [EstimateEdge!]!
    pageInfo: PageInfo!
  }

  type EstimateEdge {
    node: Estimate!
    cursor: String!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  input ProjectInput {
    name: String!
    client: String!
    status: String
  }

  input EstimateInput {
    projectId: String!
    clientName: String!
    address: String!
    totalAmount: Float!
    status: String
  }
`;

// Mock data
const users = [
  { id: '1', email: 'admin@paintbox.com', name: 'Admin User', role: 'ADMIN', password: 'admin123' },
  { id: '2', email: 'estimator@paintbox.com', name: 'Estimator User', role: 'ESTIMATOR', password: 'estimator123' },
];

const projects = [
  { id: '1', name: 'Smith Residence', client: 'John Smith', status: 'In Progress', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '2', name: 'Johnson Office', client: 'Mary Johnson', status: 'Completed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

const estimates = [
  { id: '1', projectId: '1', clientName: 'John Smith', address: '123 Main St', totalAmount: 15000, status: 'Draft', createdAt: new Date().toISOString() },
  { id: '2', projectId: '2', clientName: 'Mary Johnson', address: '456 Oak Ave', totalAmount: 25000, status: 'Sent', createdAt: new Date().toISOString() },
];

// JWT secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'paintbox-secret-key-2025';

// Resolvers
const resolvers = {
  Query: {
    me: (_, __, { user }) => user,
    
    projects: (_, { filter }) => {
      let filtered = projects;
      if (filter) {
        filtered = projects.filter(p => 
          p.name.toLowerCase().includes(filter.toLowerCase()) ||
          p.client.toLowerCase().includes(filter.toLowerCase())
        );
      }
      return {
        edges: filtered.map(p => ({ node: p, cursor: p.id })),
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: filtered[0]?.id,
          endCursor: filtered[filtered.length - 1]?.id,
        }
      };
    },
    
    estimates: (_, { filter }) => {
      let filtered = estimates;
      if (filter) {
        filtered = estimates.filter(e => 
          e.clientName.toLowerCase().includes(filter.toLowerCase()) ||
          e.address.toLowerCase().includes(filter.toLowerCase())
        );
      }
      return {
        edges: filtered.map(e => ({ node: e, cursor: e.id })),
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: filtered[0]?.id,
          endCursor: filtered[filtered.length - 1]?.id,
        }
      };
    },
    
    project: (_, { id }) => projects.find(p => p.id === id),
    estimate: (_, { id }) => estimates.find(e => e.id === id),
  },
  
  Mutation: {
    login: async (_, { email, password }) => {
      const user = users.find(u => u.email === email && u.password === password);
      
      if (!user) {
        throw new Error('Invalid credentials');
      }
      
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    },
    
    createProject: (_, { input }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      const newProject = {
        id: String(projects.length + 1),
        ...input,
        status: input.status || 'Draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      projects.push(newProject);
      return newProject;
    },
    
    updateProject: (_, { id, input }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      const index = projects.findIndex(p => p.id === id);
      if (index === -1) throw new Error('Project not found');
      
      projects[index] = {
        ...projects[index],
        ...input,
        updatedAt: new Date().toISOString(),
      };
      
      return projects[index];
    },
    
    createEstimate: (_, { input }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      const newEstimate = {
        id: String(estimates.length + 1),
        ...input,
        status: input.status || 'Draft',
        createdAt: new Date().toISOString(),
      };
      
      estimates.push(newEstimate);
      return newEstimate;
    },
    
    updateEstimate: (_, { id, input }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      const index = estimates.findIndex(e => e.id === id);
      if (index === -1) throw new Error('Estimate not found');
      
      estimates[index] = {
        ...estimates[index],
        ...input,
      };
      
      return estimates[index];
    },
  },
};

// Context function to extract user from JWT
const context = async ({ req }) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = users.find(u => u.id === decoded.userId);
      return { user };
    } catch (error) {
      // Invalid token
    }
  }
  
  return { user: null };
};

// Create Apollo Server
async function startServer() {
  const app = express();
  const port = process.env.PORT || 8080;
  
  // Enable CORS for all routes
  app.use(cors({
    origin: true,
    credentials: true,
  }));

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await server.start();

  app.use(
    '/graphql',
    cors({
      origin: true, // Allow all origins for testing
      credentials: true,
    }),
    bodyParser.json(),
    expressMiddleware(server, {
      context,
    })
  );

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({ 
      message: 'Paintbox GraphQL API',
      graphql: '/graphql',
      health: '/health'
    });
  });

  app.listen(port, () => {
    console.log(`🚀 Server ready at http://localhost:${port}/graphql`);
    console.log(`📊 Health check at http://localhost:${port}/health`);
  });
}

startServer().catch((err) => {
  console.error('Error starting server:', err);
  process.exit(1);
});