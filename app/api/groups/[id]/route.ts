import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, geography, color } = await req.json();
  const group = await prisma.group.update({
    where: { id: parseInt(id) },
    data: { name, geography, color },
  });
  return NextResponse.json(group);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.group.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
