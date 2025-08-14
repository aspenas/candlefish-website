import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Organization, OrganizationMembership } from '@/types/graphql';
import { OrganizationService } from '@/services/organization';

interface OrganizationState {
  current: Organization | null;
  memberships: OrganizationMembership[];
  isLoading: boolean;
  error: string | null;
  switchingOrganization: boolean;
}

const initialState: OrganizationState = {
  current: null,
  memberships: [],
  isLoading: false,
  error: null,
  switchingOrganization: false,
};

// Async thunks
export const fetchUserOrganizations = createAsyncThunk(
  'organization/fetchUserOrganizations',
  async (_, { rejectWithValue }) => {
    try {
      return await OrganizationService.getUserOrganizations();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch organizations');
    }
  }
);

export const switchOrganization = createAsyncThunk(
  'organization/switchOrganization',
  async (organizationId: string, { rejectWithValue }) => {
    try {
      return await OrganizationService.switchOrganization(organizationId);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to switch organization');
    }
  }
);

export const updateOrganizationSettings = createAsyncThunk(
  'organization/updateSettings',
  async ({ organizationId, settings }: { organizationId: string; settings: any }, { rejectWithValue }) => {
    try {
      return await OrganizationService.updateSettings(organizationId, settings);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update settings');
    }
  }
);

export const inviteMember = createAsyncThunk(
  'organization/inviteMember',
  async ({
    organizationId,
    email,
    role
  }: {
    organizationId: string;
    email: string;
    role: string;
  }, { rejectWithValue }) => {
    try {
      return await OrganizationService.inviteMember(organizationId, email, role);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to invite member');
    }
  }
);

export const acceptInvitation = createAsyncThunk(
  'organization/acceptInvitation',
  async (invitationToken: string, { rejectWithValue }) => {
    try {
      return await OrganizationService.acceptInvitation(invitationToken);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to accept invitation');
    }
  }
);

const organizationSlice = createSlice({
  name: 'organization',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentOrganization: (state, action: PayloadAction<Organization>) => {
      state.current = action.payload;
    },
    updateCurrentOrganization: (state, action: PayloadAction<Partial<Organization>>) => {
      if (state.current) {
        state.current = { ...state.current, ...action.payload };
      }
    },
    clearOrganizationData: (state) => {
      state.current = null;
      state.memberships = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch user organizations
      .addCase(fetchUserOrganizations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserOrganizations.fulfilled, (state, action) => {
        state.isLoading = false;
        state.memberships = action.payload.memberships;
        // Set the first organization as current if none selected
        if (!state.current && action.payload.memberships.length > 0) {
          state.current = action.payload.memberships[0].organization;
        }
      })
      .addCase(fetchUserOrganizations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Switch organization
      .addCase(switchOrganization.pending, (state) => {
        state.switchingOrganization = true;
        state.error = null;
      })
      .addCase(switchOrganization.fulfilled, (state, action) => {
        state.switchingOrganization = false;
        state.current = action.payload.organization;
      })
      .addCase(switchOrganization.rejected, (state, action) => {
        state.switchingOrganization = false;
        state.error = action.payload as string;
      })

      // Update organization settings
      .addCase(updateOrganizationSettings.fulfilled, (state, action) => {
        if (state.current && state.current.id === action.payload.id) {
          state.current = action.payload;
        }
      })
      .addCase(updateOrganizationSettings.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // Invite member
      .addCase(inviteMember.fulfilled, (state, action) => {
        // Update organization member count or invitations if needed
        if (state.current) {
          // This would typically update the organization's invitation list
          // Implementation depends on the backend structure
        }
      })
      .addCase(inviteMember.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // Accept invitation
      .addCase(acceptInvitation.fulfilled, (state, action) => {
        // Add the new membership to the list
        state.memberships.push(action.payload.membership);
        // If this is the first organization, set it as current
        if (!state.current) {
          state.current = action.payload.membership.organization;
        }
      })
      .addCase(acceptInvitation.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  setCurrentOrganization,
  updateCurrentOrganization,
  clearOrganizationData
} = organizationSlice.actions;

export default organizationSlice.reducer;
