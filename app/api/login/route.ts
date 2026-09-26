import { NextResponse } from "next/server";

const PASSWORD = process.env.APP_PASSWORD ?? "ylane123";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: string };
    const password = body.password ?? "";

    if (password !== PASSWORD) {
      return NextResponse.json(
        { message: "Väärä salasana" },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: "ylane_session",
      value: "authenticated",
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch {
    return NextResponse.json(
      { message: "Virhe kirjautumisessa" },
      { status: 500 }
    );
  }
}
