import { gql } from 'graphql-tag';
import { createTestServer, graphqlTestUtils, errorTestUtils } from '../../utils/graphql-test-utils';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// Mock bcrypt for password testing
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Sample typeDefs for authentication testing
const typeDefs = gql`
  type User {
    id: ID!
    email: String!
    name: String!
    role: String!
    organization: Organization
    createdAt: String!
  }
  
  type Organization {
    id: ID!
    name: String!
    slug: String!
  }
  
  type AuthPayload {
    token: String!
    user: User!
  }
  
  type Query {
    me: User
    user(id: ID!): User
    users: [User!]!
  }
  
  type Mutation {
    login(email: String!, password: String!): AuthPayload!
    register(email: String!, password: String!, name: String!): AuthPayload!
    updateProfile(name: String): User!
    changePassword(currentPassword: String!, newPassword: String!): Boolean!
  }
`;

// Sample resolvers for authentication testing
const resolvers = {
  Query: {
    me: (_: any, __: any, { user }: any) => {
      if (!user) throw new Error('Not authenticated');
      return user;
    },
    
    user: async (_: any, { id }: any, { user, db }: any) => {
      if (!user) throw new Error('Not authenticated');
      return await db.findUserById(id);
    },
    
    users: async (_: any, __: any, { user, db }: any) => {
      if (!user || user.role !== 'ADMIN') {
        throw new Error('Forbidden: Admin access required');
      }
      return Array.from(db.users?.values() || []);
    },
  },
  
  Mutation: {
    login: async (_: any, { email, password }: any, { db }: any) => {
      const user = await db.findUserByEmail(email);
      if (!user) {
        throw new Error('Invalid credentials');
      }
      
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }
      
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '7d' }
      );
      
      return { token, user };
    },
    
    register: async (_: any, { email, password, name }: any, { db }: any) => {
      const existingUser = await db.findUserByEmail(email);
      if (existingUser) {
        throw new Error('User already exists');
      }
      
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await db.createUser({
        email,
        name,
        passwordHash,
        role: 'USER',
      });
      
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '7d' }
      );
      
      return { token, user };
    },
    
    updateProfile: async (_: any, { name }: any, { user, db }: any) => {
      if (!user) throw new Error('Not authenticated');
      return await db.updateUser(user.id, { name });
    },
    
    changePassword: async (
      _: any,
      { currentPassword, newPassword }: any,
      { user, db }: any
    ) => {
      if (!user) throw new Error('Not authenticated');
      
      const dbUser = await db.findUserById(user.id);
      const isValidCurrentPassword = await bcrypt.compare(
        currentPassword,
        dbUser.passwordHash
      );
      
      if (!isValidCurrentPassword) {
        throw new Error('Invalid current password');
      }
      
      const newPasswordHash = await bcrypt.hash(newPassword, 12);
      await db.updateUser(user.id, { passwordHash: newPasswordHash });
      
      return true;
    },
  },
};

describe('GraphQL Authentication', () => {
  let server: any;
  
  beforeAll(async () => {
    server = await createTestServer(typeDefs, resolvers);
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockedBcrypt.compare.mockResolvedValue(true);
    mockedBcrypt.hash.mockResolvedValue('hashed_password');
  });
  
  describe('Login', () => {
    it('should successfully login with valid credentials', async () => {
      const response = await graphqlTestUtils.executeQuery(
        server,
        gql`
          mutation Login($email: String!, $password: String!) {
            login(email: $email, password: $password) {
              token
              user {
                id
                email
                name
                role
              }
            }
          }
        `,
        {
          email: 'john@candlefish.ai',
          password: 'password123',
        }
      );
      
      expect(response.body.singleResult.errors).toBeUndefined();
      expect(response.body.singleResult.data.login).toMatchObject({
        token: expect.toBeValidJWT(),
        user: {
          id: expect.any(String),
          email: 'john@candlefish.ai',
          name: expect.any(String),
          role: expect.any(String),
        },
      });
    });
    
    it('should fail with invalid email', async () => {
      const response = await graphqlTestUtils.executeQuery(
        server,
        gql`
          mutation Login($email: String!, $password: String!) {
            login(email: $email, password: $password) {
              token
              user {
                id
                email
              }
            }
          }
        `,
        {
          email: 'nonexistent@candlefish.ai',
          password: 'password123',
        }
      );
      
      errorTestUtils.expectGraphQLError(response, 'Invalid credentials');
    });
    
    it('should fail with invalid password', async () => {
      mockedBcrypt.compare.mockResolvedValue(false);
      
      const response = await graphqlTestUtils.executeQuery(
        server,
        gql`
          mutation Login($email: String!, $password: String!) {
            login(email: $email, password: $password) {
              token
              user {
                id
                email
              }
            }
          }
        `,
        {
          email: 'john@candlefish.ai',
          password: 'wrongpassword',
        }
      );
      
      errorTestUtils.expectGraphQLError(response, 'Invalid credentials');
    });
  });
  
  describe('Registration', () => {
    it('should successfully register new user', async () => {
      const response = await graphqlTestUtils.executeQuery(
        server,
        gql`
          mutation Register($email: String!, $password: String!, $name: String!) {
            register(email: $email, password: $password, name: $name) {
              token
              user {
                id
                email
                name
                role
              }
            }
          }
        `,
        {
          email: 'newuser@candlefish.ai',
          password: 'password123',
          name: 'New User',
        }
      );
      
      expect(response.body.singleResult.errors).toBeUndefined();
      expect(response.body.singleResult.data.register).toMatchObject({
        token: expect.toBeValidJWT(),
        user: {
          id: expect.any(String),
          email: 'newuser@candlefish.ai',
          name: 'New User',
          role: 'USER',
        },
      });
    });
    
    it('should fail when user already exists', async () => {
      const response = await graphqlTestUtils.executeQuery(
        server,
        gql`
          mutation Register($email: String!, $password: String!, $name: String!) {
            register(email: $email, password: $password, name: $name) {
              token
              user {
                id
                email
              }
            }
          }
        `,
        {
          email: 'john@candlefish.ai', // Existing user
          password: 'password123',
          name: 'John Doe',
        }
      );
      
      errorTestUtils.expectGraphQLError(response, 'User already exists');
    });
  });
  
  describe('Protected Routes', () => {
    it('should return current user for authenticated request', async () => {
      const user = graphqlTestUtils.createTestUser();
      
      const response = await graphqlTestUtils.executeQuery(
        server,
        gql`
          query Me {
            me {
              id
              email
              name
              role
            }
          }
        `,
        {},
        user
      );
      
      expect(response.body.singleResult.errors).toBeUndefined();
      expect(response.body.singleResult.data.me).toMatchObject({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
    });
    
    it('should fail for unauthenticated request', async () => {
      const response = await graphqlTestUtils.executeQuery(
        server,
        gql`
          query Me {
            me {
              id
              email
            }
          }
        `
      );
      
      errorTestUtils.expectUnauthorizedError(response);
    });
  });
  
  describe('Authorization', () => {
    it('should allow admin to access users list', async () => {
      const adminUser = graphqlTestUtils.createAdminUser();
      
      const response = await graphqlTestUtils.executeQuery(
        server,
        gql`
          query Users {
            users {
              id
              email
              name
              role
            }
          }
        `,
        {},
        adminUser
      );
      
      expect(response.body.singleResult.errors).toBeUndefined();
      expect(response.body.singleResult.data.users).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            email: expect.any(String),
            name: expect.any(String),
            role: expect.any(String),
          }),
        ])
      );
    });
    
    it('should deny regular user access to users list', async () => {
      const regularUser = graphqlTestUtils.createTestUser();
      
      const response = await graphqlTestUtils.executeQuery(
        server,
        gql`
          query Users {
            users {
              id
              email
            }
          }
        `,
        {},
        regularUser
      );
      
      errorTestUtils.expectForbiddenError(response);
    });
  });
  
  describe('Profile Updates', () => {
    it('should allow user to update their own profile', async () => {
      const user = graphqlTestUtils.createTestUser();
      
      const response = await graphqlTestUtils.executeQuery(
        server,
        gql`
          mutation UpdateProfile($name: String) {
            updateProfile(name: $name) {
              id
              name
            }
          }
        `,
        {
          name: 'Updated Name',
        },
        user
      );
      
      expect(response.body.singleResult.errors).toBeUndefined();
      expect(response.body.singleResult.data.updateProfile).toMatchObject({
        id: user.id,
        name: 'Updated Name',
      });
    });
  });
  
  describe('Password Changes', () => {
    it('should allow user to change password with valid current password', async () => {
      const user = graphqlTestUtils.createTestUser();
      
      const response = await graphqlTestUtils.executeQuery(
        server,
        gql`
          mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
            changePassword(currentPassword: $currentPassword, newPassword: $newPassword)
          }
        `,
        {
          currentPassword: 'oldpassword',
          newPassword: 'newpassword123',
        },
        user
      );
      
      expect(response.body.singleResult.errors).toBeUndefined();
      expect(response.body.singleResult.data.changePassword).toBe(true);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('newpassword123', 12);
    });
    
    it('should fail to change password with invalid current password', async () => {
      const user = graphqlTestUtils.createTestUser();
      mockedBcrypt.compare.mockResolvedValue(false);
      
      const response = await graphqlTestUtils.executeQuery(
        server,
        gql`
          mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
            changePassword(currentPassword: $currentPassword, newPassword: $newPassword)
          }
        `,
        {
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123',
        },
        user
      );
      
      errorTestUtils.expectGraphQLError(response, 'Invalid current password');
    });
  });
});
