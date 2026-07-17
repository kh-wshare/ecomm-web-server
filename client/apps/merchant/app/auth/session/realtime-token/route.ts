import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  const accessToken = cookieValue(cookieHeader, "access_token");

  if (!accessToken) {
    return NextResponse.json(
      { message: "Missing merchant session", statusCode: 401 },
      { status: 401 },
    );
  }

  const merchantId = cookieValue(cookieHeader, "merchant_session");

  return NextResponse.json({
    accessToken,
    merchantId: merchantId === "none" ? null : merchantId,
  });
}

function cookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;

  const match = cookieHeader
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}
