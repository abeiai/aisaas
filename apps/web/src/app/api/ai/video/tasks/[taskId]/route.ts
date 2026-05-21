import { headers } from "next/headers";

function getApiBaseUrl() {
  return process.env.API_BASE_URL ?? "http://localhost:7342/api";
}

export async function GET(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const requestHeaders = await headers();
  const { taskId } = await params;
  const url = new URL(request.url);
  const modelInstanceId = url.searchParams.get("modelInstanceId") ?? "";
  const response = await fetch(
    `${getApiBaseUrl()}/ai/video/tasks/${encodeURIComponent(taskId)}?modelInstanceId=${encodeURIComponent(modelInstanceId)}`,
    {
      headers: {
        Cookie: requestHeaders.get("cookie") ?? ""
      },
      cache: "no-store"
    }
  );

  return new Response(await response.text(), {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json; charset=utf-8"
    }
  });
}
