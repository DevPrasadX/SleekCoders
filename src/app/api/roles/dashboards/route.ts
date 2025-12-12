import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET endpoint to fetch roles with their default dashboard routes
 * Used for login redirection
 */
export async function GET() {
  try {
    const [roles] = await query<Array<{
      roleName: string;
      routePath: string;
      routeName: string;
    }>>(
      `SELECT DISTINCT r.roleName, rp.routePath, rp.routeName
       FROM Roles r
       INNER JOIN RolePermissions rp ON r.roleID = rp.roleID
       WHERE rp.routePath LIKE '%/dashboard'
       ORDER BY r.roleName ASC, rp.routePath ASC`
    );

    // Group by role and get first dashboard route
    const roleDashboards: Record<string, string> = {};
    roles.forEach((item) => {
      if (!roleDashboards[item.roleName]) {
        roleDashboards[item.roleName] = item.routePath;
      }
    });

    return NextResponse.json(roleDashboards);
  } catch (error) {
    const err = error as Error;
    return NextResponse.json(
      { error: 'Unable to fetch role dashboards', details: err.message },
      { status: 500 },
    );
  }
}

