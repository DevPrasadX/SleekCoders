import { NextResponse } from 'next/server';
import { callProcedure, query } from '@/lib/db';
import { Product } from '@/types';

const SELECT_PRODUCTS = `
  SELECT
    PRODUCT_ID AS productId,
    PRODUCT_NAME AS name,
    COALESCE(PRODUCT_DESCRIPTION, '') AS description,
    PRODUCT_STANDARD_PRICE AS standardPrice,
    PRODUCT_CATEGORY AS category
  FROM PRODUCT
  ORDER BY PRODUCT_NAME ASC
`;

function errorResponse(error: unknown, message: string) {
  const err = error as Error & { code?: string };
  return NextResponse.json(
    { error: message, details: err.message, code: err.code ?? 'UNKNOWN' },
    { status: 500 },
  );
}

export async function GET() {
  try {
    const [rows] = await query<Product[]>(SELECT_PRODUCTS);
    return NextResponse.json(rows);
  } catch (error) {
    return errorResponse(error, 'Unable to fetch products');
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      description = '',
      standardPrice,
      category,
    }: {
      name?: string;
      description?: string;
      standardPrice?: number;
      category?: string;
    } = body;

    if (!name || standardPrice === undefined || !category) {
      return NextResponse.json(
        {
          error:
            'name, standardPrice, and category are required fields; description is optional',
        },
        { status: 400 },
      );
    }

    await callProcedure('addProductDetails', [
      name,
      description,
      Number(standardPrice),
      category,
    ]);

    const [rows] = await query<Product[]>(SELECT_PRODUCTS);
    return NextResponse.json(rows, { status: 201 });
  } catch (error) {
    return errorResponse(error, 'Unable to add product');
  }
}

