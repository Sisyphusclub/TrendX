import { getDefaultOperatorLoginPreset } from "@trendx/api/lib/default-operator";
import type { Route } from "next";
import { redirect } from "next/navigation";
import type { ReactElement } from "react";

import { getServerSession } from "@/lib/server-auth";
import { AuthShell } from "@/modules/auth/components/AuthShell";
import { LoginForm } from "@/modules/auth/components/LoginForm";

export default async function LoginPage(): Promise<ReactElement> {
  const session = await getServerSession();
  const defaultOperatorPreset = getDefaultOperatorLoginPreset();

  if (session) {
    redirect("/" as Route);
  }

  return (
    <AuthShell
      description="使用已授权账户登录 TrendX。所有核心页面都基于登录态保护，未登录不会暴露任何交易信号和执行数据。"
      footerHref={"/register" as Route}
      footerLabel="去注册"
      footerText="还没有账户？"
      title="连接你的执行台"
    >
      <LoginForm
        defaultEmail={defaultOperatorPreset?.email}
        defaultPassword={defaultOperatorPreset?.password}
      />
    </AuthShell>
  );
}
