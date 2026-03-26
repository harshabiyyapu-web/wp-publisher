import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const groups = await prisma.group.findMany({
    include: { sites: { select: { id: true, name: true, language: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  const { name, geography, color } = await req.json();
  if (!name || !geography) {
    return NextResponse.json({ error: "name and geography required" }, { status: 400 });
  }
  const group = await prisma.group.create({
    data: { name, geography, color: color ?? "#6366f1" },
  });
  return NextResponse.json(group, { status: 201 });
}
