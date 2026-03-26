import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, url, token, groupId, language } = await req.json();
  const site = await prisma.site.update({
    where: { id: parseInt(id) },
    data: {
      name,
      url: url?.replace(/\/$/, ""),
      token,
      groupId: groupId ?? null,
      language: language ?? "english",
    },
    include: { group: true },
  });
  return NextResponse.json(site);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.site.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
