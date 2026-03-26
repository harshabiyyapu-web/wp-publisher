import { NextRequest, NextResponse } from "next/server";

const PASSWORD = "2008";
const AUTH_COOKIE = "wp_auth";
const AUTH_TOKEN = "wp_publisher_authenticated";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (password === PASSWORD) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(AUTH_COOKIE, AUTH_TOKEN, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: THIRTY_DAYS,
      path: "/",
    });
    return res;
  }

  return NextResponse.json({ ok: false, error: "Wrong password" }, { status: 401 });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(AUTH_COOKIE);
  return res;
}
