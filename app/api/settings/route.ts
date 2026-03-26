import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const ALLOWED_KEYS = ["grok_api_key", "custom_prompt", "dashboard_password"];

export async function GET() {
  const settings = await prisma.setting.findMany();
  const map: Record<string, string> = {};
  for (const s of settings) {
    // Mask API keys in GET response — return only whether they're set
    if (s.key === "grok_api_key") {
      map[s.key] = s.value ? "••••••••" : "";
    } else {
      map[s.key] = s.value;
    }
  }
  return NextResponse.json(map);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const updates: { key: string; value: string }[] = [];

  for (const key of ALLOWED_KEYS) {
    if (key in body && typeof body[key] === "string") {
      updates.push({ key, value: body[key] });
    }
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "No valid settings provided" }, { status: 400 });
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
