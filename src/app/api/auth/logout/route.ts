import { NextResponse } from "next/server";
import { clearSession } from "@/lib/server/session";

export async function POST() {
  const res = NextResponse.json({ success: true, data: null });
  clearSession(res);
  return res;
}
