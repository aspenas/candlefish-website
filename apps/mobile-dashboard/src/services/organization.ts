import { apolloClient } from './apollo';
import { OfflineService } from './offline';
import { Organization, OrganizationMembership } from '@/types/graphql';
import {
  GET_USER_ORGANIZATIONS_QUERY,
  GET_ORGANIZATION_QUERY,
  CREATE_ORGANIZATION_MUTATION,
  UPDATE_ORGANIZATION_MUTATION,
  SWITCH_ORGANIZATION_MUTATION,
  INVITE_MEMBER_MUTATION,
  ACCEPT_INVITATION_MUTATION,
  UPDATE_ORGANIZATION_SETTINGS_MUTATION,
} from '@/graphql/organization';

export class OrganizationService {
  static async getUserOrganizations(): Promise<{
    memberships: OrganizationMembership[];
  }> {
    try {
      const { data } = await apolloClient.query({
        query: GET_USER_ORGANIZATIONS_QUERY,
        fetchPolicy: 'cache-first',
        notifyOnNetworkStatusChange: true,
      });

      if (data?.currentUser?.organizations) {
        // Cache organizations for offline use
        await OfflineService.cacheData({
          key: 'user_organizations',
          data: data.currentUser.organizations,
          timestamp: Date.now(),
          expiresAt: Date.now() + (30 * 60 * 1000), // 30 minutes
        });

        return {
          memberships: data.currentUser.organizations,
        };
      }

      throw new Error('No organizations data received');
    } catch (error) {
      // Try to get cached data if network fails
      try {
        const cached = await OfflineService.getCachedData('user_organizations');
        if (cached) {
          console.log('Using cached organizations data');
          return { memberships: cached.data };
        }
      } catch (cacheError) {
        console.error('Failed to get cached organizations:', cacheError);
      }

      throw new Error(error instanceof Error ? error.message : 'Failed to fetch organizations');
    }
  }

  static async getOrganization(organizationId: string): Promise<Organization> {
    try {
      const { data } = await apolloClient.query({
        query: GET_ORGANIZATION_QUERY,
        variables: { organizationId },
        fetchPolicy: 'cache-first',
        notifyOnNetworkStatusChange: true,
      });

      if (data?.organization) {
        // Cache organization details for offline use
        await OfflineService.cacheData({
          key: `organization_${organizationId}`,
          data: data.organization,
          timestamp: Date.now(),
          expiresAt: Date.now() + (15 * 60 * 1000), // 15 minutes
        });

        return data.organization;
      }

      throw new Error('Organization not found');
    } catch (error) {
      // Try to get cached data if network fails
      try {
        const cached = await OfflineService.getCachedData(`organization_${organizationId}`);
        if (cached) {
          console.log('Using cached organization data');
          return cached.data;
        }
      } catch (cacheError) {
        console.error('Failed to get cached organization:', cacheError);
      }

      throw new Error(error instanceof Error ? error.message : 'Failed to fetch organization');
    }
  }

  static async createOrganization(orgData: {
    name: string;
    description?: string;
    industry?: string;
    size?: string;
  }): Promise<Organization> {
    try {
      const { data } = await apolloClient.mutate({
        mutation: CREATE_ORGANIZATION_MUTATION,
        variables: { input: orgData },
      });

      if (data?.createOrganization) {
        return data.createOrganization;
      }

      throw new Error('Failed to create organization');
    } catch (error) {
      // Queue for offline execution if network fails
      await OfflineService.addMutation({
        id: `create_organization_${Date.now()}`,
        type: 'CREATE_ORGANIZATION',
        variables: { input: orgData },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        priority: 'high',
      });

      throw new Error(error instanceof Error ? error.message : 'Failed to create organization');
    }
  }

  static async updateOrganization(
    organizationId: string,
    updates: Partial<Organization>
  ): Promise<Organization> {
    try {
      const { data } = await apolloClient.mutate({
        mutation: UPDATE_ORGANIZATION_MUTATION,
        variables: { organizationId, input: updates },
        update: (cache, { data }) => {
          if (data?.updateOrganization) {
            cache.writeQuery({
              query: GET_ORGANIZATION_QUERY,
              variables: { organizationId },
              data: {
                organization: data.updateOrganization,
              },
            });
          }
        },
      });

      if (data?.updateOrganization) {
        return data.updateOrganization;
      }

      throw new Error('Failed to update organization');
    } catch (error) {
      // Queue for offline execution if network fails
      await OfflineService.addMutation({
        id: `update_organization_${organizationId}_${Date.now()}`,
        type: 'UPDATE_ORGANIZATION',
        variables: { organizationId, input: updates },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        priority: 'medium',
      });

      throw new Error(error instanceof Error ? error.message : 'Failed to update organization');
    }
  }

  static async switchOrganization(organizationId: string): Promise<{
    organization: Organization;
    user: any;
  }> {
    try {
      const { data } = await apolloClient.mutate({
        mutation: SWITCH_ORGANIZATION_MUTATION,
        variables: { organizationId },
        update: (cache) => {
          // Invalidate cache for organization-specific data
          cache.evict({ fieldName: 'dashboards' });
          cache.evict({ fieldName: 'dataSources' });
          cache.gc();
        },
      });

      if (data?.switchOrganization) {
        // Cache the switched organization context
        await OfflineService.cacheData({
          key: 'current_organization',
          data: data.switchOrganization.organization,
          timestamp: Date.now(),
        });

        return data.switchOrganization;
      }

      throw new Error('Failed to switch organization');
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to switch organization');
    }
  }

  static async inviteMember(
    organizationId: string,
    email: string,
    role: string
  ): Promise<any> {
    try {
      const { data } = await apolloClient.mutate({
        mutation: INVITE_MEMBER_MUTATION,
        variables: { organizationId, email, role },
      });

      if (data?.inviteMember) {
        return data.inviteMember;
      }

      throw new Error('Failed to send invitation');
    } catch (error) {
      // Queue for offline execution if network fails
      await OfflineService.addMutation({
        id: `invite_member_${organizationId}_${Date.now()}`,
        type: 'INVITE_MEMBER',
        variables: { organizationId, email, role },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        priority: 'medium',
      });

      throw new Error(error instanceof Error ? error.message : 'Failed to invite member');
    }
  }

  static async acceptInvitation(invitationToken: string): Promise<{
    membership: OrganizationMembership;
    user: any;
  }> {
    try {
      const { data } = await apolloClient.mutate({
        mutation: ACCEPT_INVITATION_MUTATION,
        variables: { invitationToken },
        update: (cache, { data }) => {
          if (data?.acceptInvitation?.user?.organizations) {
            // Update the user's organizations cache
            cache.writeQuery({
              query: GET_USER_ORGANIZATIONS_QUERY,
              data: {
                currentUser: {
                  id: data.acceptInvitation.user.id,
                  organizations: data.acceptInvitation.user.organizations,
                },
              },
            });
          }
        },
      });

      if (data?.acceptInvitation) {
        return data.acceptInvitation;
      }

      throw new Error('Failed to accept invitation');
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to accept invitation');
    }
  }

  static async updateSettings(
    organizationId: string,
    settings: any
  ): Promise<Organization> {
    try {
      const { data } = await apolloClient.mutate({
        mutation: UPDATE_ORGANIZATION_SETTINGS_MUTATION,
        variables: { organizationId, settings },
      });

      if (data?.updateOrganizationSettings) {
        return data.updateOrganizationSettings;
      }

      throw new Error('Failed to update organization settings');
    } catch (error) {
      // Queue for offline execution if network fails
      await OfflineService.addMutation({
        id: `update_org_settings_${organizationId}_${Date.now()}`,
        type: 'UPDATE_ORGANIZATION_SETTINGS',
        variables: { organizationId, settings },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        priority: 'medium',
      });

      throw new Error(error instanceof Error ? error.message : 'Failed to update settings');
    }
  }

  static async getCurrentOrganization(): Promise<Organization | null> {
    try {
      const cached = await OfflineService.getCachedData('current_organization');
      return cached?.data || null;
    } catch (error) {
      console.error('Failed to get current organization:', error);
      return null;
    }
  }

  static async validatePermission(
    organizationId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    try {
      const organization = await this.getOrganization(organizationId);
      const currentUser = await this.getCurrentUser();

      if (!currentUser || !organization) {
        return false;
      }

      // Find user's membership in the organization
      const membership = organization.members?.find(
        member => member.user.id === currentUser.id
      );

      if (!membership || !membership.isActive) {
        return false;
      }

      // Check if user has the required permission
      return membership.permissions?.some(
        permission => permission.resource === resource && permission.action === action
      ) || false;
    } catch (error) {
      console.error('Permission validation failed:', error);
      return false;
    }
  }

  private static async getCurrentUser(): Promise<any> {
    // This would get the current user from the auth store or cache
    try {
      const cached = await OfflineService.getCachedData('current_user');
      return cached?.data || null;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  static async getOrganizationUsage(organizationId: string): Promise<{
    usage: any;
    limits: any;
  }> {
    try {
      const organization = await this.getOrganization(organizationId);
      return {
        usage: organization.usage,
        limits: organization.limits,
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get usage data');
    }
  }

  static async checkUsageLimit(
    organizationId: string,
    resource: string
  ): Promise<{
    canCreate: boolean;
    current: number;
    limit: number;
    percentage: number;
  }> {
    try {
      const { usage, limits } = await this.getOrganizationUsage(organizationId);

      const current = usage[resource] || 0;
      const limit = limits[`max${resource.charAt(0).toUpperCase() + resource.slice(1)}`] || 0;
      const percentage = limit > 0 ? (current / limit) * 100 : 0;
      const canCreate = current < limit;

      return {
        canCreate,
        current,
        limit,
        percentage,
      };
    } catch (error) {
      // Default to allow creation if we can't check limits
      return {
        canCreate: true,
        current: 0,
        limit: 999999,
        percentage: 0,
      };
    }
  }

  static generateInviteLink(organizationId: string, role: string): string {
    // This would generate a proper invite link with token
    return `https://app.candlefish.ai/invite?org=${organizationId}&role=${role}`;
  }

  static async leaveOrganization(organizationId: string): Promise<void> {
    // Implementation for leaving an organization
    // This would involve calling a leave organization mutation
    throw new Error('Leave organization not implemented');
  }

  static async deleteOrganization(organizationId: string, confirmationText: string): Promise<void> {
    // Implementation for deleting an organization (owner only)
    // This would involve calling a delete organization mutation
    throw new Error('Delete organization not implemented');
  }
}
