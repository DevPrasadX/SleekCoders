import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface AddInventoryItemRequest {
  productID: number;
  lotID: number;
  barcode: string;
  quantity: number;
  manufacturingDate?: string;
  expiryDate?: string;
  batchNumber?: string;
  employeeID: string;
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

export async function POST(request: Request) {
  try {
    const body: AddInventoryItemRequest = await request.json();
    const {
      productID,
      lotID,
      barcode,
      quantity,
      manufacturingDate,
      expiryDate,
      batchNumber,
      employeeID,
    } = body;

    if (!productID || !lotID || !barcode || !quantity || !employeeID) {
      return NextResponse.json(
        { error: 'productID, lotID, barcode, quantity, and employeeID are required' },
        { status: 400 },
      );
    }

    // Check if barcode already exists
    const [existing] = await query<Array<{ itemID: number; createdByEmployeeID: string }>>(
      'SELECT itemID, createdByEmployeeID FROM InventoryItems WHERE barcode = ?',
      [barcode]
    );

    if (existing && existing.length > 0) {
      const existingItem = existing[0];
      if (existingItem.createdByEmployeeID !== employeeID) {
        return NextResponse.json(
          {
            error: 'This barcode is already registered by another receiving clerk.',
          },
          { status: 409 },
        );
      }

      // Update quantity if item exists
      await query(
        `UPDATE InventoryItems 
         SET quantity = quantity + ?, 
             updatedAt = NOW()
         WHERE barcode = ? AND createdByEmployeeID = ?`,
        [quantity, barcode, employeeID]
      );

      const [updated] = await query<Array<{
        itemID: number;
        PRODUCT_ID: number;
        LOT_ID: number;
        barcode: string;
        quantity: number;
        createdByEmployeeID: string;
      }>>(
        'SELECT itemID, PRODUCT_ID, LOT_ID, barcode, quantity, createdByEmployeeID FROM InventoryItems WHERE barcode = ? AND createdByEmployeeID = ?',
        [barcode, employeeID]
      );

      return NextResponse.json(
        {
          success: true,
          message: 'Inventory updated',
          item: updated[0],
        },
        { status: 200 }
      );
    } else {
      // Insert new inventory item
      const [result] = await query<{ insertId: number }>(
        `INSERT INTO InventoryItems (
          PRODUCT_ID, 
          LOT_ID, 
          barcode, 
          quantity, 
          manufacturingDate, 
          expiryDate, 
          batchNumber,
          createdByEmployeeID
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          productID,
          lotID,
          barcode,
          quantity,
          manufacturingDate || null,
          expiryDate || null,
          batchNumber || null,
          employeeID,
        ]
      );

      const [newItem] = await query<Array<{
        itemID: number;
        PRODUCT_ID: number;
        LOT_ID: number;
        barcode: string;
        quantity: number;
        manufacturingDate: string | null;
        expiryDate: string | null;
        batchNumber: string | null;
        createdByEmployeeID: string;
      }>>(
        'SELECT itemID, PRODUCT_ID, LOT_ID, barcode, quantity, manufacturingDate, expiryDate, batchNumber, createdByEmployeeID FROM InventoryItems WHERE itemID = ?',
        [result.insertId]
      );

      return NextResponse.json(
        {
          success: true,
          message: 'Inventory item added',
          item: newItem[0],
        },
        { status: 201 }
      );
    }
  } catch (error) {
    return buildErrorResponse(error, 'Unable to add inventory item');
  }
}

