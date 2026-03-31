import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
import { testConnection } from "@/lib/wordpress";

export async function GET() {
  const sites = await prisma.site.findMany({
    include: { group: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(sites);
}

export async function POST(req: NextRequest) {
  const { name, url, token, groupId, language } = await req.json();
  if (!name || !url || !token) {
    return NextResponse.json({ error: "name, url and token required" }, { status: 400 });
  }

  const site = await prisma.site.create({
    data: {
      name,
      url: url.replace(/\/$/, ""),
      token,
      groupId: groupId ?? null,
      language: language ?? "english",
    },
    include: { group: true },
  });
  return NextResponse.json(site, { status: 201 });
}
