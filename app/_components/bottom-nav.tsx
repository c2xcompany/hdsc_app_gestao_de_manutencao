"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHome, IconClients, IconTeam, IconEquip, IconLogout, IconTag } from "./icons";

export function AdminBottomNav({
  isSuper,
  onLogout,
}: {
  isSuper: boolean;
  onLogout: () => Promise<void>;
}) {
  const path = usePathname();
  const homeActive = path === "/admin";
  const clientsActive =
    path.startsWith("/admin/clientes") ||
    path.startsWith("/admin/equipamentos") ||
    path.startsWith("/etiqueta");
  const teamActive = path.startsWith("/admin/tecnicos");
  const catActive = path.startsWith("/admin/categorias");

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
        {isSuper ? (
          <Link href="/admin" className={`bottom-nav-item ${homeActive ? "active" : ""}`}>
            <IconHome />
            <span>Início</span>
          </Link>
        ) : null}
        <Link href="/admin/clientes" className={`bottom-nav-item ${clientsActive ? "active" : ""}`}>
          <IconClients />
          <span>Clientes</span>
        </Link>
        {isSuper ? (
          <Link href="/admin/categorias" className={`bottom-nav-item ${catActive ? "active" : ""}`}>
            <IconTag />
            <span>Categorias</span>
          </Link>
        ) : null}
        {isSuper ? (
          <Link href="/admin/tecnicos" className={`bottom-nav-item ${teamActive ? "active" : ""}`}>
            <IconTeam />
            <span>Equipe</span>
          </Link>
        ) : null}
        <form action={onLogout} className="contents">
          <button type="submit" className="bottom-nav-item">
            <IconLogout />
            <span>Sair</span>
          </button>
        </form>
      </div>
    </nav>
  );
}

export function ClientBottomNav({ onLogout }: { onLogout: () => Promise<void> }) {
  const path = usePathname();
  const equipActive = path === "/cliente" || path.startsWith("/cliente/equipamento");

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
        <Link href="/cliente" className={`bottom-nav-item ${equipActive ? "active" : ""}`}>
          <IconEquip />
          <span>Equipamentos</span>
        </Link>
        <form action={onLogout} className="contents">
          <button type="submit" className="bottom-nav-item">
            <IconLogout />
            <span>Sair</span>
          </button>
        </form>
      </div>
    </nav>
  );
}
