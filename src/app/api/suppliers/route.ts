import { NextResponse } from 'next/server';
import { callProcedure, query } from '@/lib/db';
import { SupplierRecord } from '@/types/database';

function errorResponse(error: unknown, message: string) {
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
    const [rows] = await query<SupplierRecord[]>(
      'SELECT * FROM SUPPLIER ORDER BY SUPPLIER_NAME ASC',
    );
    return NextResponse.json(rows);
  } catch (error) {
    return errorResponse(error, 'Unable to fetch suppliers');
  }
}

export async function POST(request: Request) {
  try {
    const {
      name,
      dateOfJoining,
      poc,
      contactNumber,
      productCount = 0,
    } = await request.json();

    if (!name || !dateOfJoining || !poc || !contactNumber) {
      return NextResponse.json(
        {
          error:
            'name, dateOfJoining, poc and contactNumber are required fields',
        },
        { status: 400 },
      );
    }

    await callProcedure('addSupplierDetails', [
      name,
      dateOfJoining,
      poc,
      contactNumber,
      Number(productCount),
    ]);

    const [rows] = await query<SupplierRecord[]>(
      'SELECT * FROM SUPPLIER ORDER BY SUPPLIER_NAME ASC',
    );
    return NextResponse.json(rows, { status: 201 });
  } catch (error) {
    return errorResponse(error, 'Unable to add supplier');
  }
}

