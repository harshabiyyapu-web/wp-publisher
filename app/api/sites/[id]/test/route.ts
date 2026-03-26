import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { testConnection } from "@/lib/wordpress";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const site = await prisma.site.findUnique({ where: { id: parseInt(id) } });
  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

  const result = await testConnection(site.url, site.token);
  return NextResponse.json(result);
}
