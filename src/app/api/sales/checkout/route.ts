import { NextResponse } from 'next/server';
import { query, getConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';

interface CartItem {
  itemID: number;
  quantity: number;
  unitPrice: number;
}

interface CheckoutRequest {
  items: CartItem[];
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
  let connection: PoolConnection | null = null;
  
  try {
    const body: CheckoutRequest = await request.json();
    const { items, employeeID } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items array is required and must not be empty' },
        { status: 400 },
      );
    }

    if (!employeeID) {
      return NextResponse.json(
        { error: 'employeeID is required' },
        { status: 400 },
      );
    }

    // Get a connection for the transaction
    connection = await getConnection();
    
    // Start database transaction
    await connection.beginTransaction();

    // Validate all items exist and have sufficient quantity (with row lock)
    for (const item of items) {
      const [inventoryItems] = await connection.query(
        'SELECT quantity FROM InventoryItems WHERE itemID = ? FOR UPDATE',
        [item.itemID]
      ) as [Array<{ quantity: number }>, any];

      if (!inventoryItems || inventoryItems.length === 0) {
        await connection.rollback();
        connection.release();
        return NextResponse.json(
          { error: `Item with ID ${item.itemID} not found` },
          { status: 404 },
        );
      }

      if (inventoryItems[0].quantity < item.quantity) {
        await connection.rollback();
        connection.release();
        return NextResponse.json(
          { error: `Insufficient quantity for item ID ${item.itemID}. Available: ${inventoryItems[0].quantity}, Requested: ${item.quantity}` },
          { status: 400 },
        );
      }
    }

    // Calculate total
    const totalAmount = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    // Create sales transaction
    const [transactionResult] = await connection.query(
      `INSERT INTO SalesTransactions (employeeID, totalAmount, transactionDate)
       VALUES (?, ?, NOW())`,
      [employeeID, totalAmount]
    ) as any;

    const transactionID = transactionResult.insertId;

    // Insert transaction items and deduct inventory
    for (const item of items) {
      // Get the LOT_ID for this inventory item
      const [inventoryItemData] = await connection.query(
        'SELECT LOT_ID FROM InventoryItems WHERE itemID = ?',
        [item.itemID]
      ) as [Array<{ LOT_ID: number }>, any];

      if (!inventoryItemData || inventoryItemData.length === 0) {
        await connection.rollback();
        connection.release();
        return NextResponse.json(
          { error: `Inventory item with ID ${item.itemID} not found` },
          { status: 404 },
        );
      }

      const lotID = inventoryItemData[0].LOT_ID;

      // Insert transaction item
      const subtotal = item.unitPrice * item.quantity;
      await connection.query(
        `INSERT INTO SalesTransactionItems (transactionID, itemID, quantity, unitPrice, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [transactionID, item.itemID, item.quantity, item.unitPrice, subtotal]
      );

      // Deduct from inventory item
      const [updateResult] = await connection.query(
        `UPDATE InventoryItems 
         SET quantity = quantity - ?
         WHERE itemID = ?`,
        [item.quantity, item.itemID]
      ) as any;

      // Verify the update affected a row
      if (updateResult.affectedRows === 0) {
        await connection.rollback();
        connection.release();
        return NextResponse.json(
          { error: `Failed to update inventory for item ID ${item.itemID}` },
          { status: 500 },
        );
      }

      // Deduct from lot quantity
      const [lotUpdateResult] = await connection.query(
        `UPDATE LOT 
         SET LOT_QUANTITY = LOT_QUANTITY - ?
         WHERE LOT_ID = ?`,
        [item.quantity, lotID]
      ) as any;

      // Verify the lot update affected a row
      if (lotUpdateResult.affectedRows === 0) {
        await connection.rollback();
        connection.release();
        return NextResponse.json(
          { error: `Failed to update lot quantity for lot ID ${lotID}` },
          { status: 500 },
        );
      }
    }

    // Commit the transaction
    await connection.commit();

    // Get complete transaction details
    const [transaction] = await connection.query(
      `SELECT transactionID, employeeID, transactionDate, totalAmount
       FROM SalesTransactions
       WHERE transactionID = ?`,
      [transactionID]
    ) as [Array<{
      transactionID: number;
      employeeID: string;
      transactionDate: string;
      totalAmount: number;
    }>, any];

    connection.release();

    return NextResponse.json(
      {
        success: true,
        transaction: transaction[0],
        itemsCount: items.length,
        totalAmount,
      },
      { status: 201 }
    );
  } catch (error) {
    // Rollback transaction on error
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
      connection.release();
    }
    return buildErrorResponse(error, 'Unable to process checkout');
  }
}

