import type { Route } from "next";
import { redirect } from "next/navigation";
import type { ReactElement } from "react";

import { getServerSession } from "@/lib/server-auth";
import { AuthShell } from "@/modules/auth/components/AuthShell";
import { RegisterForm } from "@/modules/auth/components/RegisterForm";

export default async function RegisterPage(): Promise<ReactElement> {
  const session = await getServerSession();

  if (session) {
    redirect("/" as Route);
  }

  return (
    <AuthShell
      description="创建一个受控访问账户，后续可在设置里修改密码。TrendX 当前面向单操作员场景，不提供公开匿名访问。"
      footerHref={"/login" as Route}
      footerLabel="去登录"
      footerText="已经有账户？"
      title="创建访问凭证"
    >
      <RegisterForm />
    </AuthShell>
  );
}
