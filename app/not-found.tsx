import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 text-center">
      <div className="font-display text-5xl tracking-wide">
        {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Hidro Suce" className="h-14 w-auto" />
      </div>
      <div className="mt-8 text-4xl">🔒</div>
      <h1 className="mt-3 font-display text-2xl tracking-wide">Conteúdo indisponível</h1>
      <p className="mt-2 max-w-sm text-sm text-[color:var(--color-muted)]">
        Esta página não existe ou você não tem acesso a ela. Confira o link ou volte ao início.
      </p>
      <Link href="/" className="btn btn-primary mt-6">
        Voltar ao início
      </Link>
    </div>
  );
}
