import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  // ✅ CORRECT: In Next.js 15+, cookies() is async
  const cookieStore = await cookies();
  cookieStore.delete('admin_session');

  return NextResponse.json({ success: true });
}