import { NextResponse } from 'next/server';
import { callProcedure, query } from '@/lib/db';
import { EmployeeRecord } from '@/types/database';

const DEFAULT_EMPLOYEE_PASSWORD =
  process.env.DEFAULT_EMPLOYEE_PASSWORD ?? 'ChangeMe123!';

const EMPLOYEE_LIST_QUERY = `
  SELECT
    employeeID,
    employeeName,
    employeePhoneNumber,
    employeeEmail,
    employeeAddress,
    employeeRole
  FROM EmployeeDetails
  ORDER BY employeeName ASC
`;

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
 * Helper function to check if the requesting user is a Store Manager
 * Currently checks for user role in request headers
 * In production, this should use JWT tokens or secure cookies
 */
async function isStoreManager(request: Request): Promise<boolean> {
  try {
    // Check for user role in custom header (set by frontend)
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

export async function GET(request: Request) {
  try {
    // Allow all authenticated users to view employees (for dashboard metrics)
    // Role management operations (POST, PUT, DELETE) are restricted to Store Managers
    const [rows] = await query<EmployeeRecord[]>(EMPLOYEE_LIST_QUERY);
    return NextResponse.json(rows);
  } catch (error) {
    return buildErrorResponse(error, 'Unable to fetch employees');
  }
}

export async function POST(request: Request) {
  try {
    // Check authorization - only Store Managers can create users
    const authError = await requireStoreManager(request);
    if (authError) return authError;

    const body = await request.json();
    const { name, phoneNumber, email, address, role, password } = body;

    if (!name || !phoneNumber || !email || !address || !role) {
      return NextResponse.json(
        {
          error:
            'name, phoneNumber, email, address and role are required fields',
        },
        { status: 400 },
      );
    }

    const passwordToUse = password || DEFAULT_EMPLOYEE_PASSWORD;

    await callProcedure('addEmployee', [
      name,
      phoneNumber,
      email,
      address,
      role,
      passwordToUse,
    ]);

    const [rows] = await query<EmployeeRecord[]>(EMPLOYEE_LIST_QUERY);
    return NextResponse.json(rows, { status: 201 });
  } catch (error) {
    return buildErrorResponse(error, 'Unable to add employee');
  }
}

export async function PUT(request: Request) {
  try {
    // Check authorization - only Store Managers can update users
    const authError = await requireStoreManager(request);
    if (authError) return authError;

    const body = await request.json();
    const { employeeID, name, phoneNumber, email, address, role } = body;

    if (!employeeID || !name || !phoneNumber || !email || !address || !role) {
      return NextResponse.json(
        {
          error:
            'employeeID, name, phoneNumber, email, address and role are required',
        },
        { status: 400 },
      );
    }

    await callProcedure('updateEmployeeDetails', [
      name,
      phoneNumber,
      email,
      address,
      role,
      employeeID,
    ]);

    const [rows] = await query<EmployeeRecord[]>(EMPLOYEE_LIST_QUERY);
    return NextResponse.json(rows);
  } catch (error) {
    return buildErrorResponse(error, 'Unable to update employee');
  }
}

export async function DELETE(request: Request) {
  try {
    // Check authorization - only Store Managers can delete users
    const authError = await requireStoreManager(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const employeeID = searchParams.get('employeeID');

    if (!employeeID) {
      return NextResponse.json(
        { error: 'employeeID is required' },
        { status: 400 },
      );
    }

    await query('DELETE FROM EmployeeDetails WHERE employeeID = ?', [employeeID]);

    const [rows] = await query<EmployeeRecord[]>(EMPLOYEE_LIST_QUERY);
    return NextResponse.json(rows);
  } catch (error) {
    return buildErrorResponse(error, 'Unable to delete employee');
  }
}

