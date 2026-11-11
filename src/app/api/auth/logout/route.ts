import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (user) {
    await logAudit({
      actorUserId: user.id,
      actorRole: user.roleCodes[0] || "user",
      action: "LOGOUT",
      module: "auth",
      entityType: "user",
      entityId: user.id,
      source: "human",
    });
  }

  await clearSessionCookie();

  const loginUrl = new URL("/login", req.url);
  return NextResponse.redirect(loginUrl, { status: 303 });
}
