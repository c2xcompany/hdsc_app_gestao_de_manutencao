"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./auth-actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, null);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-display text-5xl tracking-wide">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Hidro Suce" className="h-16 w-auto" />
          </div>
          <p className="text-sm text-[color:var(--color-muted)] mt-1">
            Histórico de manutenção das empilhadeiras
          </p>
        </div>

        <form action={formAction} className="card p-6 grid gap-4">
          <div>
            <label className="label" htmlFor="identifier">Usuário ou CNPJ</label>
            <input
              id="identifier"
              name="identifier"
              className="field"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              placeholder="seu usuário ou o CNPJ da empresa"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="password">Senha</label>
            <input
              id="password"
              name="password"
              type="password"
              className="field"
              autoComplete="current-password"
              required
            />
          </div>

          {state?.error ? (
            <p className="text-sm text-[color:var(--color-magenta)]">{state.error}</p>
          ) : null}

          <button className="btn btn-primary w-full" disabled={pending}>
            {pending ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="text-center text-xs text-[color:var(--color-faint)] mt-6">
          Hidro Suce · Manutenção de empilhadeiras
        </p>
      </div>
    </div>
  );
}
