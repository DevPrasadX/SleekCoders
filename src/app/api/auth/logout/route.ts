import { NextResponse } from 'next/server';

export async function POST() {
  // Logout logic - for server-side session management if needed in the future
  // Currently, logout is handled client-side by clearing sessionStorage
  return NextResponse.json({ message: 'Logged out successfully' });
}

