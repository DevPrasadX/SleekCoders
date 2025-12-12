import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

type InventoryItemResponse = {
  itemID: number;
  PRODUCT_ID: number;
  LOT_ID: number;
  barcode: string;
  quantity: number;
  manufacturingDate: string | null;
  expiryDate: string | null;
  batchNumber: string | null;
  createdAt: string;
  updatedAt: string;
  createdByEmployeeID: string;
  productName: string;
  productCategory: string;
  productPrice: number;
  lotName: string;
  supplierName: string | null;
};

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeID = searchParams.get('employeeID');

    if (!employeeID) {
      return NextResponse.json(
        { error: 'employeeID query parameter is required' },
        { status: 400 },
      );
    }

    const [items] = await query<InventoryItemResponse[]>(
      `SELECT
         ii.itemID,
         ii.PRODUCT_ID,
         ii.LOT_ID,
         ii.barcode,
         ii.quantity,
         ii.manufacturingDate,
         ii.expiryDate,
         ii.batchNumber,
         ii.createdAt,
         ii.updatedAt,
         ii.createdByEmployeeID,
         p.PRODUCT_NAME AS productName,
         p.PRODUCT_CATEGORY AS productCategory,
         p.PRODUCT_STANDARD_PRICE AS productPrice,
         l.LOT_NAME AS lotName,
         s.SUPPLIER_NAME AS supplierName
       FROM InventoryItems ii
       INNER JOIN PRODUCT p ON ii.PRODUCT_ID = p.PRODUCT_ID
       INNER JOIN LOT l ON ii.LOT_ID = l.LOT_ID
       LEFT JOIN SUPPLIER s ON l.SUPPLIER_ID = s.SUPPLIER_ID
       WHERE ii.createdByEmployeeID = ?
       ORDER BY ii.updatedAt DESC`,
      [employeeID],
    );

    return NextResponse.json(items);
  } catch (error) {
    return buildErrorResponse(error, 'Unable to fetch inventory for employee');
  }
}


