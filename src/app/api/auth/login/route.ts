import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { email, password, role } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'email and password are required' },
        { status: 400 },
      );
    }

    const [rows] = await query<
      Array<{
        employeeID: string;
        employeeName: string;
        employeeEmail: string;
        employeeRole: string | null;
        employeePassword: string;
        employeePhoneNumber: string;
        employeeAddress: string;
      }>
    >(
      `SELECT employeeID,
              employeeName,
              employeeEmail,
              employeeRole,
              employeePassword,
              employeePhoneNumber,
              employeeAddress
       FROM EmployeeDetails
       WHERE employeeEmail = ?`,
      [email],
    );

    const user = rows[0];

    if (!user || user.employeePassword !== password) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 },
      );
    }

    if (role && user.employeeRole !== role) {
      return NextResponse.json(
        { error: 'Role mismatch for this user' },
        { status: 403 },
      );
    }

    const sanitizedUser = {
      employeeID: user.employeeID,
      employeeName: user.employeeName,
      employeeEmail: user.employeeEmail,
      employeeRole: user.employeeRole,
      employeePhoneNumber: user.employeePhoneNumber,
      employeeAddress: user.employeeAddress,
    };

    return NextResponse.json(sanitizedUser);
  } catch (error) {
    const err = error as Error;
    return NextResponse.json(
      { error: 'Unable to log in', details: err.message },
      { status: 500 },
    );
  }
}

