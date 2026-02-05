import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  // ✅ FIX: await cookies() before calling .delete()
  const cookieStore = await cookies();
  cookieStore.delete('admin_session');

  return NextResponse.json({ success: true });
}