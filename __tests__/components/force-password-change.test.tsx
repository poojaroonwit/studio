import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { RedesignedUserModal } from '@/components/users/RedesignedUserModal';
import { useSession } from 'next-auth/react';

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn()
}));

// Mock other dependencies
jest.mock('@/lib/permissions', () => ({
  hasAnyPermission: jest.fn()
}));

jest.mock('@/hooks/useUserTeams', () => ({
  useUserTeams: () => ({
    teams: [],
    isLoading: false,
    error: null
  })
}));

jest.mock('@/hooks/useUserGroups', () => ({
  useUserGroups: () => ({
    userGroups: [],
    isLoading: false,
    error: null
  })
}));

jest.mock('@/components/ui/form', () => ({
  Form: ({ children }: any) => <div data-testid="form">{children}</div>,
  FormField: ({ render }: any) => render({ field: { value: false, onChange: jest.fn() } }),
  FormItem: ({ children }: any) => <div data-testid="form-item">{children}</div>,
  FormLabel: ({ children }: any) => <label data-testid="form-label">{children}</label>,
  FormControl: ({ children }: any) => <div data-testid="form-control">{children}</div>,
  FormMessage: () => <div data-testid="form-message" />
}));

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, disabled }: any) => (
    <input 
      type="checkbox" 
      checked={checked} 
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      disabled={disabled}
      data-testid="force-password-change-checkbox"
    />
  )
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div data-testid="dialog">{children}</div>,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <div data-testid="dialog-title">{children}</div>,
  DialogDescription: ({ children }: any) => <div data-testid="dialog-description">{children}</div>
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: any) => <div data-testid="tabs">{children}</div>,
  TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }: any) => <button data-testid={`tab-trigger-${value}`}>{children}</button>,
  TabsContent: ({ children, value }: any) => <div data-testid={`tab-content-${value}`}>{children}</div>
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick} data-testid="button">{children}</button>
}));

describe('Force Password Change Feature', () => {
  const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
  const mockHasAnyPermission = require('@/lib/permissions').hasAnyPermission as jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show force password change checkbox when admin edits another user', () => {
    // Mock admin user session
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'admin-user-id',
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'Admin'
        }
      },
      status: 'authenticated'
    });

    // Mock admin permissions
    mockHasAnyPermission.mockReturnValue(true);

    const testUser = {
      id: 'other-user-id',
      name: 'Other User',
      email: 'other@example.com',
      role: 'Recruiter'
    };

    render(
      <RedesignedUserModal
        isOpen={true}
        onOpenChange={jest.fn()}
        mode="edit"
        user={testUser}
        onSave={jest.fn()}
        onEditUser={jest.fn()}
        onAddUser={jest.fn()}
      />
    );

    // Should show the force password change checkbox
    expect(screen.getByTestId('force-password-change-checkbox')).toBeInTheDocument();
  });

  it('should NOT show force password change checkbox when user edits their own profile', () => {
    const currentUserId = 'current-user-id';
    
    // Mock current user session
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: currentUserId,
          name: 'Current User',
          email: 'current@example.com',
          role: 'Admin'
        }
      },
      status: 'authenticated'
    });

    // Mock admin permissions
    mockHasAnyPermission.mockReturnValue(true);

    const currentUser = {
      id: currentUserId,
      name: 'Current User',
      email: 'current@example.com',
      role: 'Admin'
    };

    render(
      <RedesignedUserModal
        isOpen={true}
        onOpenChange={jest.fn()}
        mode="profile"
        user={currentUser}
        onSave={jest.fn()}
        onEditUser={jest.fn()}
        onAddUser={jest.fn()}
      />
    );

    // Should NOT show the force password change checkbox
    expect(screen.queryByTestId('force-password-change-checkbox')).not.toBeInTheDocument();
  });

  it('should NOT show force password change checkbox when user lacks USERS_EDIT permission', () => {
    // Mock non-admin user session
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'regular-user-id',
          name: 'Regular User',
          email: 'regular@example.com',
          role: 'Recruiter'
        }
      },
      status: 'authenticated'
    });

    // Mock no admin permissions
    mockHasAnyPermission.mockReturnValue(false);

    const testUser = {
      id: 'other-user-id',
      name: 'Other User',
      email: 'other@example.com',
      role: 'Recruiter'
    };

    render(
      <RedesignedUserModal
        isOpen={true}
        onOpenChange={jest.fn()}
        mode="edit"
        user={testUser}
        onSave={jest.fn()}
        onEditUser={jest.fn()}
        onAddUser={jest.fn()}
      />
    );

    // Should NOT show the force password change checkbox
    expect(screen.queryByTestId('force-password-change-checkbox')).not.toBeInTheDocument();
  });

  it('should NOT show force password change checkbox in create mode', () => {
    // Mock admin user session
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'admin-user-id',
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'Admin'
        }
      },
      status: 'authenticated'
    });

    // Mock admin permissions
    mockHasAnyPermission.mockReturnValue(true);

    render(
      <RedesignedUserModal
        isOpen={true}
        onOpenChange={jest.fn()}
        mode="create"
        user={null}
        onSave={jest.fn()}
        onEditUser={jest.fn()}
        onAddUser={jest.fn()}
      />
    );

    // Should NOT show the force password change checkbox in create mode
    expect(screen.queryByTestId('force-password-change-checkbox')).not.toBeInTheDocument();
  });
});
