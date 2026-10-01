"use client";

import { useActionState } from "react";
import { unlockByQr, type LoginState } from "@/app/auth-actions";

export function UnlockForm({
  equipmentId,
  clientName,
  equipmentLabel,
  serial,
}: {
  equipmentId: string;
  clientName: string;
  equipmentLabel: string | null;
  serial: string;
}) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(unlockByQr, null);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="font-display text-3xl tracking-wide">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Hidro Suce" className="block mx-auto h-16 w-auto" />
          </div>
          <p className="text-xs text-[color:var(--color-faint)] mt-1">Manutenção de empilhadeiras</p>
        </div>

        <div className="card p-6">
          <div className="text-xs text-[color:var(--color-faint)]">Você está acessando</div>
          <div className="font-display text-2xl tracking-wide mt-1">
            {equipmentLabel || "Equipamento"}
          </div>
          <div className="font-mono text-xs text-[color:var(--color-blue-strong)]">{serial}</div>
          <div className="text-sm text-[color:var(--color-muted)] mt-1">{clientName}</div>

          <form action={formAction} className="grid gap-4 mt-5">
            <input type="hidden" name="equipment_id" value={equipmentId} />
            <div>
              <label className="label" htmlFor="password">Senha de acesso</label>
              <input
                id="password"
                name="password"
                type="password"
                className="field"
                autoComplete="current-password"
                autoFocus
                required
              />
            </div>
            {state?.error ? (
              <p className="text-sm text-[color:var(--color-magenta)]">{state.error}</p>
            ) : null}
            <button className="btn btn-primary w-full" disabled={pending}>
              {pending ? "Abrindo…" : "Ver histórico"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
