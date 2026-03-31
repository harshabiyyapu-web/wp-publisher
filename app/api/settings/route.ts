import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const ALLOWED_KEYS = ["grok_api_key", "custom_prompt", "dashboard_password"];

export async function GET() {
  const settings = await prisma.setting.findMany();
  const map: Record<string, string> = {};
  for (const s of settings) {
    if (s.key === "grok_api_key") {
      // Mask the key — never expose the real value over the wire
      map[s.key] = s.value ? "••••••••" : "";
    } else if (s.key !== "dashboard_password") {
      map[s.key] = s.value;
    }
  }

  return NextResponse.json(map);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const updates: { key: string; value: string }[] = [];

  for (const key of ALLOWED_KEYS) {
    if (key in body && typeof body[key] === "string" && body[key].trim()) {
      updates.push({ key, value: body[key].trim() });
    }
  }

  if (updates.length === 0) {
    return NextResponse.json({ ok: true });
  }

  await Promise.all(
    updates.map(({ key, value }) =>
      prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
