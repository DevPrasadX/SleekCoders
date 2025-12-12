'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AVAILABLE_ROUTES, getRoutesByCategory, Route } from '@/data/availableRoutes';

interface Permission {
  permissionID?: number;
  routePath: string;
  routeName: string;
}

interface Role {
  roleID: number;
  roleName: string;
  roleDescription: string | null;
  isSystemRole: boolean;
  permissions: Permission[];
}

export default function RoleManagement() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    roleName: '',
    roleDescription: '',
    selectedPermissions: [] as string[],
  });
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editFormData, setEditFormData] = useState({
    roleName: '',
    roleDescription: '',
    selectedPermissions: [] as string[],
  });
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const getAuthHeaders = () => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (typeof window !== 'undefined') {
      const userStr = sessionStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        headers['x-user-role'] = user.role;
      }
    }
    return headers;
  };

  const fetchRoles = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/roles', {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        throw new Error('Failed to fetch roles');
      }
      const data = await res.json();
      setRoles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userStr = sessionStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setUserRole(user.role);
        fetchRoles();
      } else {
        router.push('/login');
      }
      setCheckingRole(false);
    }
  }, [router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      const permissions = formData.selectedPermissions.map((path) => {
        const route = AVAILABLE_ROUTES.find((r) => r.path === path);
        return {
          routePath: path,
          routeName: route?.name || path,
        };
      });

      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          roleName: formData.roleName,
          roleDescription: formData.roleDescription || null,
          permissions,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create role');
      }

      setStatus({
        type: 'success',
        message: 'Role created successfully',
      });
      setFormData({
        roleName: '',
        roleDescription: '',
        selectedPermissions: [],
      });
      fetchRoles();
    } catch (err) {
      setStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to create role',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setEditFormData({
      roleName: role.roleName,
      roleDescription: role.roleDescription || '',
      selectedPermissions: role.permissions.map((p) => p.routePath),
    });
  };

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingRole) return;

    // Validate roleID before making the request
    if (!editingRole.roleID || typeof editingRole.roleID !== 'number' || editingRole.roleID <= 0) {
      setStatus({
        type: 'error',
        message: 'Invalid role ID. Please refresh the page and try again.',
      });
      return;
    }

    setSubmitting(true);
    setStatus(null);
    try {
      const permissions = editFormData.selectedPermissions.map((path) => {
        const route = AVAILABLE_ROUTES.find((r) => r.path === path);
        return {
          routePath: path,
          routeName: route?.name || path,
        };
      });

      const res = await fetch(`/api/roles/${editingRole.roleID}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          roleName: editFormData.roleName,
          roleDescription: editFormData.roleDescription || null,
          permissions,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update role');
      }

      setStatus({
        type: 'success',
        message: 'Role updated successfully',
      });
      setEditingRole(null);
      fetchRoles();
    } catch (err) {
      setStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to update role',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (role: Role) => {
    setDeletingRole(role);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRole) return;

    setDeleting(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/roles/${deletingRole.roleID}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete role');
      }

      setStatus({
        type: 'success',
        message: 'Role deleted successfully',
      });
      setDeletingRole(null);
      fetchRoles();
    } catch (err) {
      setStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to delete role',
      });
    } finally {
      setDeleting(false);
    }
  };

  const togglePermission = (
    path: string,
    selectedPermissions: string[],
    setPermissions: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (selectedPermissions.includes(path)) {
      setPermissions(selectedPermissions.filter((p) => p !== path));
    } else {
      setPermissions([...selectedPermissions, path]);
    }
  };

  if (checkingRole || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (userRole !== 'Store Manager') {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-red-800">Access Denied</h2>
              <p className="text-red-700 mt-1">
                Role management is restricted to Store Managers only.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const routesByCategory = getRoutesByCategory();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Role Management</h1>
          <p className="text-gray-600 mt-1">Create and manage roles with specific page permissions.</p>
        </div>
      </div>

      {status && (
        <div
          className={`px-4 py-3 rounded-lg ${
            status.type === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}
        >
          {status.message}
        </div>
      )}

      {/* Create Role Form */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Create New Role</h2>
          <p className="text-sm text-gray-500">
            Define a new role and select which pages users with this role can access.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
              <input
                type="text"
                required
                value={formData.roleName}
                onChange={(e) => setFormData((prev) => ({ ...prev, roleName: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Inventory Supervisor"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
              <input
                type="text"
                value={formData.roleDescription}
                onChange={(e) => setFormData((prev) => ({ ...prev, roleDescription: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Brief description of the role"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Page Permissions</label>
            <div className="border border-gray-300 rounded-lg p-4 max-h-96 overflow-y-auto">
              {Object.entries(routesByCategory).map(([category, routes]) => (
                <div key={category} className="mb-6 last:mb-0">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">{category}</h4>
                  <div className="space-y-2">
                    {routes.map((route) => (
                      <label
                        key={route.path}
                        className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.selectedPermissions.includes(route.path)}
                          onChange={() =>
                            togglePermission(route.path, formData.selectedPermissions, (perms) =>
                              setFormData((prev) => ({ ...prev, selectedPermissions: perms }))
                            )
                          }
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{route.name}</span>
                        <span className="text-xs text-gray-400 ml-auto">{route.path}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Role'}
            </button>
          </div>
        </form>
      </div>

      {/* Roles List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {error && (
          <div className="p-6 bg-red-50 border-y border-red-200 text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchRoles} className="px-3 py-1 text-xs bg-red-600 text-white rounded">
              Retry
            </button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {roles.map((role) => (
                <tr key={role.roleID} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{role.roleName}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">
                      {role.roleDescription || <span className="text-gray-400">No description</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">
                      {role.permissions.length} page{role.permissions.length !== 1 ? 's' : ''}
                      <div className="mt-1 flex flex-wrap gap-1">
                        {role.permissions.slice(0, 3).map((perm) => (
                          <span
                            key={perm.permissionID || perm.routePath}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                          >
                            {perm.routeName}
                          </span>
                        ))}
                        {role.permissions.length > 3 && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                            +{role.permissions.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {role.isSystemRole ? (
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                        System
                      </span>
                    ) : (
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                        Custom
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleEdit(role)}
                        className="text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Edit</span>
                      </button>
                      {!role.isSystemRole && (
                        <button
                          onClick={() => handleDeleteClick(role)}
                          className="text-red-600 hover:text-red-800 font-medium flex items-center space-x-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingRole && (
        <EditRoleModal
          role={editingRole}
          formData={editFormData}
          setFormData={setEditFormData}
          onSubmit={handleUpdate}
          onClose={() => {
            setEditingRole(null);
            setStatus(null);
          }}
          submitting={submitting}
          togglePermission={togglePermission}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingRole && (
        <DeleteRoleModal
          role={deletingRole}
          onConfirm={handleDeleteConfirm}
          onCancel={() => {
            setDeletingRole(null);
            setStatus(null);
          }}
          deleting={deleting}
        />
      )}
    </div>
  );
}

// Edit Role Modal Component
function EditRoleModal({
  role,
  formData,
  setFormData,
  onSubmit,
  onClose,
  submitting,
  togglePermission,
}: {
  role: Role;
  formData: { roleName: string; roleDescription: string; selectedPermissions: string[] };
  setFormData: React.Dispatch<React.SetStateAction<{ roleName: string; roleDescription: string; selectedPermissions: string[] }>>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  submitting: boolean;
  togglePermission: (path: string, selectedPermissions: string[], setPermissions: React.Dispatch<React.SetStateAction<string[]>>) => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const routesByCategory = getRoutesByCategory();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">Edit Role</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Editing: {role.roleName} {role.isSystemRole && '(System Role)'}
          </p>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
              <input
                type="text"
                required
                value={formData.roleName}
                onChange={(e) => setFormData((prev) => ({ ...prev, roleName: e.target.value }))}
                disabled={role.isSystemRole}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={formData.roleDescription}
                onChange={(e) => setFormData((prev) => ({ ...prev, roleDescription: e.target.value }))}
                disabled={role.isSystemRole}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Page Permissions</label>
            <div className="border border-gray-300 rounded-lg p-4 max-h-96 overflow-y-auto">
              {Object.entries(routesByCategory).map(([category, routes]) => (
                <div key={category} className="mb-6 last:mb-0">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">{category}</h4>
                  <div className="space-y-2">
                    {routes.map((route) => (
                      <label
                        key={route.path}
                        className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.selectedPermissions.includes(route.path)}
                          onChange={() =>
                            togglePermission(route.path, formData.selectedPermissions, (perms) =>
                              setFormData((prev) => ({ ...prev, selectedPermissions: perms }))
                            )
                          }
                          disabled={role.isSystemRole}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                        />
                        <span className={`text-sm ${role.isSystemRole ? 'text-gray-400' : 'text-gray-700'}`}>
                          {route.name}
                        </span>
                        <span className="text-xs text-gray-400 ml-auto">{route.path}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {role.isSystemRole && (
              <p className="mt-2 text-sm text-gray-500">
                System roles cannot be modified. Only custom roles can be edited.
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || role.isSystemRole}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Updating...' : 'Update Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Delete Role Modal Component
function DeleteRoleModal({
  role,
  onConfirm,
  onCancel,
  deleting,
}: {
  role: Role;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onCancel();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [onCancel]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div ref={modalRef} className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Delete Role</h2>
              <p className="text-sm text-gray-500 mt-1">This action cannot be undone</p>
            </div>
          </div>

          <p className="text-gray-700 mb-4">
            Are you sure you want to delete the role <strong>{role.roleName}</strong>? This will remove all permissions associated with this role. Make sure no employees are assigned to this role before deleting.
          </p>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={deleting}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete Role'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

