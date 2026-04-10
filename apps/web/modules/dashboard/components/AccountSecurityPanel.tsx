"use client";

import { ShieldCheck } from "lucide-react";
import { type FormEvent, type ReactElement, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { AuthField } from "@/modules/auth/components/AuthField";
import { authPrimaryButtonClassName } from "@/modules/auth/lib/styles";

export function AccountSecurityPanel(): ReactElement {
  const sessionQuery = authClient.useSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleChangePassword(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setFeedback(null);

    if (nextPassword.length < 8) {
      setFeedback("新密码至少需要 8 位。");
      return;
    }

    if (nextPassword !== confirmPassword) {
      setFeedback("两次输入的新密码不一致。");
      return;
    }

    setIsPending(true);

    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword: nextPassword,
      revokeOtherSessions: true,
    });

    setIsPending(false);

    if (error) {
      setFeedback(error.message ?? "密码更新失败，请稍后重试。");
      return;
    }

    setCurrentPassword("");
    setNextPassword("");
    setConfirmPassword("");
    setFeedback("密码已更新，其他会话已失效。");
  }

  const session = sessionQuery.data;

  return (
    <section className="rounded-[28px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-muted)]">
            账户安全
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[color:var(--color-ink)]">
            修改密码
          </h3>
          <p className="mt-2 text-sm leading-6 text-[color:var(--color-ink-soft)]">
            当前账户 {session?.user.email ?? "加载中..."}
            。改密后会注销其他登录中的会话。
          </p>
        </div>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-soft)] text-[color:var(--color-blue)]">
          <ShieldCheck className="size-4" />
        </span>
      </div>

      <form className="mt-5 grid gap-3" onSubmit={handleChangePassword}>
        <AuthField
          autoComplete="current-password"
          label="当前密码"
          onChange={(event) => setCurrentPassword(event.target.value)}
          placeholder="输入当前密码"
          required
          type="password"
          value={currentPassword}
        />
        <AuthField
          autoComplete="new-password"
          hint="最少 8 位，建议使用独立密码。"
          label="新密码"
          onChange={(event) => setNextPassword(event.target.value)}
          placeholder="设置新的登录密码"
          required
          type="password"
          value={nextPassword}
        />
        <AuthField
          autoComplete="new-password"
          label="确认新密码"
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="再次输入新密码"
          required
          type="password"
          value={confirmPassword}
        />

        {feedback ? (
          <p
            className={
              feedback.includes("已更新")
                ? "rounded-[18px] border border-[color:var(--color-bull)]/18 bg-[color:var(--color-bull-soft)] px-4 py-3 text-sm text-[color:var(--color-bull)]"
                : "rounded-[18px] border border-[color:var(--color-bear)]/18 bg-[color:var(--color-bear-soft)] px-4 py-3 text-sm text-[color:var(--color-bear)]"
            }
          >
            {feedback}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            className={authPrimaryButtonClassName}
            disabled={isPending || sessionQuery.isPending}
            type="submit"
          >
            {isPending ? "更新中..." : "更新密码"}
          </button>
        </div>
      </form>
    </section>
  );
}
