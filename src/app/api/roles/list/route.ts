import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET endpoint to fetch list of role names
 * This is used for dropdowns in login, user management, etc.
 * No authentication required - roles are public information
 */
export async function GET() {
  try {
    const [roles] = await query<Array<{
      roleName: string;
      roleDescription: string | null;
    }>>(
      `SELECT roleName, roleDescription
       FROM Roles
       ORDER BY roleName ASC`
    );

    // Return just role names as an array
    const roleNames = roles.map((r) => r.roleName);

    return NextResponse.json(roleNames);
  } catch (error) {
    const err = error as Error;
    return NextResponse.json(
      { error: 'Unable to fetch roles', details: err.message },
      { status: 500 },
    );
  }
}

