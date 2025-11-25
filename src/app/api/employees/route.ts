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

export async function GET() {
  try {
    const [rows] = await query<EmployeeRecord[]>(EMPLOYEE_LIST_QUERY);
    return NextResponse.json(rows);
  } catch (error) {
    return buildErrorResponse(error, 'Unable to fetch employees');
  }
}

export async function POST(request: Request) {
  try {
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

