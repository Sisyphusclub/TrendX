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

export function RegisterForm(): ReactElement {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage("密码至少需要 8 位。");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("两次输入的密码不一致。");
      return;
    }

    setIsPending(true);

    try {
      const { error } = await authClient.signUp.email({
        email,
        name,
        password,
      });

      setIsPending(false);

      if (error) {
        setErrorMessage(
          formatAuthErrorMessage(error, "注册失败，请稍后重试。"),
        );
        return;
      }

      startTransition(() => {
        router.replace("/" as Route);
        router.refresh();
      });
    } catch (error) {
      setIsPending(false);
      setErrorMessage(formatAuthErrorMessage(error, "注册失败，请稍后重试。"));
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div>
        <h2 className="text-[1.65rem] font-semibold tracking-[-0.05em] text-[color:var(--color-ink)]">
          注册
        </h2>
        <p className="mt-2 text-sm leading-6 text-[color:var(--color-ink-soft)]">
          创建单操作员账户，用于访问 TrendX 的执行控制台。
        </p>
      </div>

      <AuthField
        autoComplete="name"
        label="操作者名称"
        onChange={(event) => setName(event.target.value)}
        placeholder="Blur"
        required
        value={name}
      />
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
        autoComplete="new-password"
        hint="至少 8 位字符。"
        label="密码"
        onChange={(event) => setPassword(event.target.value)}
        placeholder="设置登录密码"
        required
        type="password"
        value={password}
      />
      <AuthField
        autoComplete="new-password"
        label="确认密码"
        onChange={(event) => setConfirmPassword(event.target.value)}
        placeholder="再次输入密码"
        required
        type="password"
        value={confirmPassword}
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
        {isPending ? "创建中..." : "创建并进入"}
      </button>

      <p className="text-sm text-[color:var(--color-muted)]">
        已有账户？{" "}
        <Link
          className="font-semibold text-[color:var(--color-blue)] transition duration-200 ease-out hover:text-[color:var(--color-blue-soft)]"
          href={"/login" as Route}
        >
          直接登录
        </Link>
        。
      </p>
    </form>
  );
}
