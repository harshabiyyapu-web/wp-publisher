import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  // Build update data only from fields that were provided
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.url !== undefined) data.url = body.url.replace(/\/$/, "");
  if (body.token !== undefined) data.token = body.token;
  if (body.language !== undefined) data.language = body.language;
  if ("groupId" in body) data.groupId = body.groupId ?? null;

  const site = await prisma.site.update({
    where: { id: parseInt(id) },
    data,
    include: { group: true },
  });
  return NextResponse.json(site);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.site.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
