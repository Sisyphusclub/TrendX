function getErrorMessage(error: unknown): string | null {
  if (typeof error === "string") {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return null;
}

function getErrorStatus(error: unknown): number | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }

  return null;
}

export function formatAuthErrorMessage(
  error: unknown,
  fallback: string,
): string {
  const message = getErrorMessage(error)?.trim();
  const status = getErrorStatus(error);
  const normalizedMessage = message?.toLowerCase() ?? "";

  if (
    status === 403 ||
    normalizedMessage.includes("invalid origin") ||
    normalizedMessage.includes("forbidden")
  ) {
    return "当前访问地址未被鉴权服务信任，请使用 localhost:3000 或 127.0.0.1:3000。";
  }

  if (
    status === 500 ||
    normalizedMessage.includes("internal server error") ||
    normalizedMessage.includes("fetch failed")
  ) {
    return "注册服务当前不可用，请先确认本地 PostgreSQL 已启动并完成迁移。";
  }

  return message || fallback;
}
