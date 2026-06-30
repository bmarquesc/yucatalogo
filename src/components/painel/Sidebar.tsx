"use client";

import {
  ClipboardList,
  Images,
  LayoutDashboard,
  Palette,
  Settings2
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

const links = [
  { href: "/painel/catalogo", label: "Catálogo", icon: Images },
  { href: "/painel/filtros", label: "Filtros", icon: Settings2 },
  { href: "/painel/perguntas", label: "Perguntas", icon: ClipboardList },
  { href: "/painel/perfil", label: "Perfil", icon: Palette }
];

export function Sidebar({
  nomeMarca,
  slug
}: {
  nomeMarca: string;
  slug: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-title">Yu Catálogo</div>
        <div className="sidebar-subtitle">{nomeMarca}</div>
      </div>

      <nav className="sidebar-nav" aria-label="Navegação do painel">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              className="sidebar-link"
              data-active={pathname.startsWith(link.href)}
              href={link.href}
              key={link.href}
            >
              <Icon size={17} aria-hidden="true" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <Link className="sidebar-link" href={`/${slug}`} target="_blank">
        <LayoutDashboard size={17} aria-hidden="true" />
        <span>Ver catálogo</span>
      </Link>

      <div className="sidebar-footer">
        <UserButton afterSignOutUrl="/entrar" />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{nomeMarca}</div>
          <div style={{ color: "rgba(255,255,255,0.58)", fontSize: 12 }}>
            /{slug}
          </div>
        </div>
      </div>
    </aside>
  );
}
