"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  type ReactElement,
  startTransition,
  useState,
} from "react";

import { authClient } from "@/lib/auth-client";

import { formatAuthErrorMessage } from "../lib/error-messages";
import { authPrimaryButtonClassName } from "../lib/styles";
import { AuthField } from "./AuthField";

interface LoginFormProps {
  defaultEmail?: string;
  defaultPassword?: string;
}

export function LoginForm({
  defaultEmail = "",
  defaultPassword = "",
}: LoginFormProps): ReactElement {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState(defaultPassword);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setErrorMessage(null);
    setIsPending(true);

    try {
      const { error } = await authClient.signIn.email({
        email,
        password,
        rememberMe: true,
      });

      setIsPending(false);

      if (error) {
        setErrorMessage(
          formatAuthErrorMessage(error, "登录失败，请稍后重试。"),
        );
        return;
      }

      startTransition(() => {
        router.replace("/" as Route);
        router.refresh();
      });
    } catch (error) {
      setIsPending(false);
      setErrorMessage(formatAuthErrorMessage(error, "登录失败，请稍后重试。"));
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div>
        <h2 className="text-[1.65rem] font-semibold tracking-[-0.05em] text-[color:var(--color-ink)]">
          登录
        </h2>
        <p className="mt-2 text-sm leading-6 text-[color:var(--color-ink-soft)]">
          进入交易台，查看信号、执行记录和账户安全设置。
        </p>
        {defaultEmail && defaultPassword ? (
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[color:var(--color-ink-soft)]">
            本地默认账户已预填，可直接登录。
          </p>
        ) : null}
      </div>

      <AuthField
        autoComplete="email"
        label="邮箱"
        onChange={(event) => setEmail(event.target.value)}
        placeholder="operator@trendx.ai"
        required
        type="email"
        value={email}
      />
      <AuthField
        autoComplete="current-password"
        label="密码"
        onChange={(event) => setPassword(event.target.value)}
        placeholder="请输入密码"
        required
        type="password"
        value={password}
      />

      {errorMessage ? (
        <p className="rounded-[18px] border border-[color:var(--color-bear)]/18 bg-[color:var(--color-bear-soft)] px-4 py-3 text-sm text-[color:var(--color-bear)]">
          {errorMessage}
        </p>
      ) : null}

      <button
        className={authPrimaryButtonClassName}
        disabled={isPending}
        type="submit"
      >
        {isPending ? "登录中..." : "进入交易台"}
      </button>

      <p className="text-sm text-[color:var(--color-muted)]">
        首次使用请先{" "}
        <Link
          className="font-semibold text-[color:var(--color-blue)] transition duration-200 ease-out hover:text-[color:var(--color-blue-soft)]"
          href={"/register" as Route}
        >
          创建账户
        </Link>
        。
      </p>
    </form>
  );
}
