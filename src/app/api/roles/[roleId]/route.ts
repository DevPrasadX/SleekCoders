import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

function buildErrorResponse(error: unknown, message: string) {
  const err = error as Error & { code?: string };
  return NextResponse.json(
    {
      error: message,
      details: err.message,
      code: err.code ?? 'UNKNOWN',
    },
    { status: 500 },
  );
}

async function isStoreManager(request: Request): Promise<boolean> {
  try {
    const userRole = request.headers.get('x-user-role');
    return userRole === 'Store Manager';
  } catch {
    return false;
  }
}

async function requireStoreManager(request: Request) {
  const isAuthorized = await isStoreManager(request);
  if (!isAuthorized) {
    return NextResponse.json(
      { error: 'Unauthorized: Store Manager role required' },
      { status: 403 },
    );
  }
  return null;
}

// PUT - Update role and its permissions
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ roleId: string }> | { roleId: string } }
) {
  try {
    const authError = await requireStoreManager(request);
    if (authError) return authError;

    // Handle both sync and async params (Next.js 15+ compatibility)
    const resolvedParams = await Promise.resolve(params);
    const roleIdParam = resolvedParams.roleId;

    if (!roleIdParam || typeof roleIdParam !== 'string') {
      return NextResponse.json(
        { error: 'Invalid role ID: roleId parameter is missing or invalid' },
        { status: 400 },
      );
    }

    const roleId = parseInt(roleIdParam, 10);
    if (isNaN(roleId) || roleId <= 0) {
      return NextResponse.json(
        { error: `Invalid role ID: "${roleIdParam}" is not a valid number` },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { roleName, roleDescription, permissions } = body;

    // Check if role exists and is not a system role
    const [existingRole] = await query<Array<{
      roleID: number;
      isSystemRole: boolean;
    }>>(
      'SELECT roleID, isSystemRole FROM Roles WHERE roleID = ?',
      [roleId]
    );

    if (!existingRole || existingRole.length === 0) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 },
      );
    }

    if (existingRole[0].isSystemRole) {
      return NextResponse.json(
        { error: 'Cannot modify system roles' },
        { status: 403 },
      );
    }

    // Update role
    if (roleName || roleDescription !== undefined) {
      await query(
        `UPDATE Roles
         SET roleName = COALESCE(?, roleName),
             roleDescription = COALESCE(?, roleDescription)
         WHERE roleID = ?`,
        [roleName || null, roleDescription || null, roleId]
      );
    }

    // Update permissions if provided
    if (Array.isArray(permissions)) {
      // Delete existing permissions
      await query('DELETE FROM RolePermissions WHERE roleID = ?', [roleId]);

      // Insert new permissions
      if (permissions.length > 0) {
        for (const perm of permissions) {
          await query(
            `INSERT INTO RolePermissions (roleID, routePath, routeName)
             VALUES (?, ?, ?)`,
            [roleId, perm.routePath, perm.routeName]
          );
        }
      }
    }

    // Return updated role with permissions
    const [updatedRole] = await query<Array<{
      roleID: number;
      roleName: string;
      roleDescription: string | null;
      isSystemRole: boolean;
    }>>(
      `SELECT roleID, roleName, roleDescription, isSystemRole
       FROM Roles
       WHERE roleID = ?`,
      [roleId]
    );

    const [permissionsList] = await query<Array<{
      permissionID: number;
      routePath: string;
      routeName: string;
    }>>(
      `SELECT permissionID, routePath, routeName
       FROM RolePermissions
       WHERE roleID = ?`,
      [roleId]
    );

    return NextResponse.json({
      ...updatedRole[0],
      permissions: permissionsList || [],
    });
  } catch (error) {
    return buildErrorResponse(error, 'Unable to update role');
  }
}

// DELETE - Delete a role
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ roleId: string }> | { roleId: string } }
) {
  try {
    const authError = await requireStoreManager(request);
    if (authError) return authError;

    // Handle both sync and async params (Next.js 15+ compatibility)
    const resolvedParams = await Promise.resolve(params);
    const roleIdParam = resolvedParams.roleId;

    if (!roleIdParam || typeof roleIdParam !== 'string') {
      return NextResponse.json(
        { error: 'Invalid role ID: roleId parameter is missing or invalid' },
        { status: 400 },
      );
    }

    const roleId = parseInt(roleIdParam, 10);
    if (isNaN(roleId) || roleId <= 0) {
      return NextResponse.json(
        { error: `Invalid role ID: "${roleIdParam}" is not a valid number` },
        { status: 400 },
      );
    }

    // Check if role exists and is not a system role
    const [existingRole] = await query<Array<{
      roleID: number;
      isSystemRole: boolean;
    }>>(
      'SELECT roleID, isSystemRole FROM Roles WHERE roleID = ?',
      [roleId]
    );

    if (!existingRole || existingRole.length === 0) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 },
      );
    }

    if (existingRole[0].isSystemRole) {
      return NextResponse.json(
        { error: 'Cannot delete system roles' },
        { status: 403 },
      );
    }

    // Check if any employees are using this role
    const [employeesWithRole] = await query<Array<{ count: number }>>(
      `SELECT COUNT(*) as count
       FROM EmployeeDetails
       WHERE employeeRole = (SELECT roleName FROM Roles WHERE roleID = ?)`,
      [roleId]
    );

    if (employeesWithRole && employeesWithRole[0]?.count > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete role: There are employees assigned to this role. Please reassign them first.',
        },
        { status: 409 },
      );
    }

    // Delete role (permissions will cascade delete)
    await query('DELETE FROM Roles WHERE roleID = ?', [roleId]);

    return NextResponse.json({ message: 'Role deleted successfully' });
  } catch (error) {
    return buildErrorResponse(error, 'Unable to delete role');
  }
}

