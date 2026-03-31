import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const HARDCODED_KEY = "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";
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

  // Always show that a key is available (hardcoded fallback)
  if (!map["grok_api_key"]) {
    map["grok_api_key"] = "••••••••";
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
