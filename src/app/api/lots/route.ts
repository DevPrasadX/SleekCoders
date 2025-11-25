import { NextResponse } from 'next/server';
import { callProcedure, query } from '@/lib/db';
import { LotRecord } from '@/types/database';

function respondWithError(error: unknown, message: string) {
  const err = error as Error & { code?: string };
  return NextResponse.json(
    { error: message, details: err.message, code: err.code ?? 'UNKNOWN' },
    { status: 500 },
  );
}

export async function GET() {
  try {
    const [rows] = await query<LotRecord[]>(
      `SELECT LOT.*, SUPPLIER.SUPPLIER_NAME
       FROM LOT
       LEFT JOIN SUPPLIER ON LOT.SUPPLIER_ID = SUPPLIER.SUPPLIER_ID
       ORDER BY LOT.LOT_DATE_OF_ARRIVAL DESC`,
    );
    return NextResponse.json(rows);
  } catch (error) {
    return respondWithError(error, 'Unable to fetch lots');
  }
}

export async function POST(request: Request) {
  try {
    const {
      supplierID,
      lotName,
      dateOfArrival,
      productCount,
      quantity,
    } = await request.json();

    if (
      supplierID === undefined ||
      !lotName ||
      !dateOfArrival ||
      productCount === undefined ||
      quantity === undefined
    ) {
      return NextResponse.json(
        {
          error:
            'supplierID, lotName, dateOfArrival, productCount and quantity are required',
        },
        { status: 400 },
      );
    }

    await callProcedure('addLOTDetails', [
      Number(supplierID),
      lotName,
      dateOfArrival,
      Number(productCount),
      Number(quantity),
    ]);

    const [rows] = await query<LotRecord[]>(
      'SELECT * FROM LOT ORDER BY LOT_DATE_OF_ARRIVAL DESC',
    );
    return NextResponse.json(rows, { status: 201 });
  } catch (error) {
    return respondWithError(error, 'Unable to add lot');
  }
}

