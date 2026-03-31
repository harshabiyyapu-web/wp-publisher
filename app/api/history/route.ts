import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
  const skip = (page - 1) * limit;

  const articles = await prisma.article.findMany({
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
    include: {
      pubJobs: {
        include: { site: { include: { group: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const total = await prisma.article.count();

  return NextResponse.json({ articles, total, page, limit });
}
