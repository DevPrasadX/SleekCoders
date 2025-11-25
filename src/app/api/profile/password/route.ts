import { NextResponse } from 'next/server';
import { callProcedure } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { employeeID, currentPassword, newPassword } = await request.json();

    if (!employeeID || !currentPassword || !newPassword) {
      return NextResponse.json(
        {
          error:
            'employeeID, currentPassword, and newPassword are required fields',
        },
        { status: 400 },
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password should be at least 6 characters long' },
        { status: 400 },
      );
    }

    const [rows] = await callProcedure('updateEmployeePassword', [
      employeeID,
      currentPassword,
      newPassword,
    ]);

    const resultSet = Array.isArray(rows) ? rows[0] : rows;
    const affected =
      Array.isArray(resultSet) && resultSet.length > 0
        ? Number((resultSet[0] as { affectedRows?: number }).affectedRows ?? 0)
        : Number((resultSet as { affectedRows?: number })?.affectedRows ?? 0);

    if (!affected) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json(
      { error: 'Unable to update password', details: err.message },
      { status: 500 },
    );
  }
}

