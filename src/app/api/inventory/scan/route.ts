import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface InventoryItem {
  itemID: number;
  PRODUCT_ID: number;
  LOT_ID: number;
  barcode: string;
  quantity: number;
  manufacturingDate: string | null;
  expiryDate: string | null;
  batchNumber: string | null;
  productName: string;
  productPrice: number;
  productCategory: string;
  lotName: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const barcode = searchParams.get('barcode');

    if (!barcode) {
      return NextResponse.json(
        { error: 'Barcode is required' },
        { status: 400 },
      );
    }

    // Find inventory item by barcode with product details
    const [items] = await query<InventoryItem[]>(
      `SELECT 
        ii.itemID,
        ii.PRODUCT_ID,
        ii.LOT_ID,
        ii.barcode,
        ii.quantity,
        ii.manufacturingDate,
        ii.expiryDate,
        ii.batchNumber,
        p.PRODUCT_NAME as productName,
        p.PRODUCT_STANDARD_PRICE as productPrice,
        p.PRODUCT_CATEGORY as productCategory,
        l.LOT_NAME as lotName
       FROM InventoryItems ii
       INNER JOIN PRODUCT p ON ii.PRODUCT_ID = p.PRODUCT_ID
       INNER JOIN LOT l ON ii.LOT_ID = l.LOT_ID
       WHERE ii.barcode = ? AND ii.quantity > 0
       LIMIT 1`,
      [barcode]
    );

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Product not found or out of stock' },
        { status: 404 },
      );
    }

    const item = items[0];

    return NextResponse.json({
      itemID: item.itemID,
      barcode: item.barcode,
      productID: item.PRODUCT_ID,
      productName: item.productName,
      productPrice: Number(item.productPrice),
      productCategory: item.productCategory,
      quantity: item.quantity,
      lotID: item.LOT_ID,
      lotName: item.lotName,
      batchNumber: item.batchNumber,
      manufacturingDate: item.manufacturingDate,
      expiryDate: item.expiryDate,
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json(
      { error: 'Unable to scan product', details: err.message },
      { status: 500 },
    );
  }
}

