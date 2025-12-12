import { NextResponse } from 'next/server';
import { query, callProcedure } from '@/lib/db';

interface Role {
  roleID: number;
  roleName: string;
  roleDescription: string | null;
  isSystemRole: boolean;
  permissions: Array<{
    permissionID: number;
    routePath: string;
    routeName: string;
  }>;
}

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

/**
 * Check if the requesting user is a Store Manager
 */
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

// GET all roles with their permissions
export async function GET(request: Request) {
  try {
    const authError = await requireStoreManager(request);
    if (authError) return authError;

    const [roles] = await query<Array<{
      roleID: number;
      roleName: string;
      roleDescription: string | null;
      isSystemRole: boolean;
    }>>(
      `SELECT roleID, roleName, roleDescription, isSystemRole
       FROM Roles
       ORDER BY roleName ASC`
    );

    // Get permissions for each role
    const rolesWithPermissions: Role[] = await Promise.all(
      roles.map(async (role) => {
        const [permissions] = await query<Array<{
          permissionID: number;
          routePath: string;
          routeName: string;
        }>>(
          `SELECT permissionID, routePath, routeName
           FROM RolePermissions
           WHERE roleID = ?
           ORDER BY routeName ASC`,
          [role.roleID]
        );

        return {
          ...role,
          permissions: permissions || [],
        };
      })
    );

    return NextResponse.json(rolesWithPermissions);
  } catch (error) {
    return buildErrorResponse(error, 'Unable to fetch roles');
  }
}

// POST - Create a new role with permissions
export async function POST(request: Request) {
  try {
    const authError = await requireStoreManager(request);
    if (authError) return authError;

    const body = await request.json();
    const { roleName, roleDescription, permissions } = body;

    if (!roleName || !Array.isArray(permissions)) {
      return NextResponse.json(
        { error: 'roleName and permissions array are required' },
        { status: 400 },
      );
    }

    // Check if role name already exists
    const [existing] = await query<Array<{ roleID: number }>>(
      'SELECT roleID FROM Roles WHERE roleName = ?',
      [roleName]
    );

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: 'Role with this name already exists' },
        { status: 409 },
      );
    }

    // Insert role
    const [result] = await query<{ insertId: number }>(
      `INSERT INTO Roles (roleName, roleDescription, isSystemRole)
       VALUES (?, ?, FALSE)`,
      [roleName, roleDescription || null]
    );

    const roleID = result.insertId;

    // Insert permissions
    if (permissions.length > 0) {
      for (const perm of permissions) {
        await query(
          `INSERT INTO RolePermissions (roleID, routePath, routeName)
           VALUES (?, ?, ?)`,
          [roleID, perm.routePath, perm.routeName]
        );
      }
    }

    // Return the created role with permissions
    const [createdRole] = await query<Array<Role>>(
      `SELECT roleID, roleName, roleDescription, isSystemRole
       FROM Roles
       WHERE roleID = ?`,
      [roleID]
    );

    const [permissionsList] = await query<Array<{
      permissionID: number;
      routePath: string;
      routeName: string;
    }>>(
      `SELECT permissionID, routePath, routeName
       FROM RolePermissions
       WHERE roleID = ?`,
      [roleID]
    );

    return NextResponse.json(
      {
        ...createdRole[0],
        permissions: permissionsList || [],
      },
      { status: 201 }
    );
  } catch (error) {
    return buildErrorResponse(error, 'Unable to create role');
  }
}

