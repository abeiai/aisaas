import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getApiBaseUrl() {
  return process.env.API_BASE_URL ?? "http://localhost:7342/api";
}

export async function POST(request: Request) {
  const requestHeaders = await headers();
  const contentType = request.headers.get("content-type");

  if (!request.body || !contentType?.includes("multipart/form-data")) {
    return Response.json(
      {
        code: 40001,
        message: "请选择要上传的图片",
        data: null
      },
      { status: 400 }
    );
  }

  const response = await fetch(`${getApiBaseUrl()}/media/admin/upload`, {
    body: request.body,
    cache: "no-store",
    duplex: "half",
    headers: {
      "Content-Type": contentType,
      Cookie: requestHeaders.get("cookie") ?? ""
    },
    method: "POST"
  } as RequestInit & { duplex: "half" });

  return new Response(await response.text(), {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json; charset=utf-8"
    }
  });
}
