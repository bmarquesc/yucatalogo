"use client";

import {
  ClipboardList,
  Copy,
  Images,
  LayoutDashboard,
  LogOut,
  Palette,
  Plus,
  Settings2,
  Wallet
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SignOutButton, UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";

import { useToast } from "@/components/painel/ToastProvider";
import { buildPublicCatalogUrl } from "@/lib/domains";

const links = [
  { href: "/painel/pedidos", label: "Pedidos", icon: Wallet },
  { href: "/painel/catalogo", label: "Catálogo", icon: Images },
  { href: "/painel/filtros", label: "Filtros", icon: Settings2 },
  { href: "/painel/perguntas", label: "Perguntas", icon: ClipboardList },
  { href: "/painel/perfil", label: "Perfil", icon: Palette }
];

export function Sidebar({
  activeCatalogoId,
  catalogos,
  nomeMarca,
  slug,
  localDev = false
}: {
  activeCatalogoId: string;
  catalogos: Array<{
    id: string;
    nomeMarca: string;
    slug: string;
  }>;
  nomeMarca: string;
  slug: string;
  localDev?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const notify = useToast();
  const [catalogoList, setCatalogoList] = useState(catalogos);
  const [activeId, setActiveId] = useState(activeCatalogoId);
  const [busy, setBusy] = useState(false);
  const [fallbackOrigin, setFallbackOrigin] = useState("");
  const activeCatalogo =
    catalogoList.find((catalogo) => catalogo.id === activeId) ?? {
      id: activeCatalogoId,
      nomeMarca,
      slug
    };

  useEffect(() => {
    setFallbackOrigin(window.location.origin);
    setCatalogoList(catalogos);
    setActiveId(activeCatalogoId);
  }, [activeCatalogoId, catalogos]);

  async function selectCatalogo(catalogoId: string) {
    if (!catalogoId || catalogoId === activeId || busy) {
      return;
    }

    setBusy(true);

    try {
      const response = await fetch("/api/catalogos/selecionar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ catalogoId })
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response, "Não foi possível trocar o catálogo."));
      }

      setActiveId(catalogoId);
      notify("Catálogo selecionado.");
      router.refresh();
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Não foi possível trocar o catálogo.",
        "error"
      );
    } finally {
      setBusy(false);
    }
  }

  async function createCatalogo() {
    const nome = window.prompt("Nome do novo catálogo", "Novo catálogo");

    if (nome === null) {
      return;
    }

    if (!nome.trim()) {
      notify("Informe o nome do catálogo.", "error");
      return;
    }

    await saveCatalogo("/api/catalogos", "Catálogo criado.", { nomeMarca: nome.trim() });
  }

  async function duplicateCatalogo() {
    const confirmed = window.confirm(
      `Duplicar o catálogo "${activeCatalogo.nomeMarca}"? Os pedidos e o caixa não serão copiados.`
    );

    if (!confirmed) {
      return;
    }

    await saveCatalogo("/api/catalogos/duplicar", "Catálogo duplicado.");
  }

  async function saveCatalogo(
    endpoint: string,
    successMessage: string,
    body?: Record<string, string>
  ) {
    if (busy) {
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response, "Não foi possível salvar o catálogo."));
      }

      const data = (await response.json()) as {
        catalogo: { id: string; nomeMarca: string; slug: string };
      };

      setCatalogoList((current) => {
        const withoutDuplicate = current.filter(
          (catalogo) => catalogo.id !== data.catalogo.id
        );
        return [...withoutDuplicate, data.catalogo];
      });
      setActiveId(data.catalogo.id);
      notify(successMessage);
      router.refresh();
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o catálogo.",
        "error"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand" aria-label="Yu Sistema">
        <img
          alt="Yu Sistema"
          className="sidebar-logo"
          src="/yu-sistema-sem-fundo.png"
        />
        <div className="sidebar-subtitle">{activeCatalogo.nomeMarca}</div>
      </div>

      <div className="catalog-switcher">
        <label className="catalog-switcher-field">
          <span>Catálogo ativo</span>
          <select
            disabled={busy}
            onChange={(event) => void selectCatalogo(event.target.value)}
            value={activeId}
          >
            {catalogoList.map((catalogo) => (
              <option key={catalogo.id} value={catalogo.id}>
                {catalogo.nomeMarca}
              </option>
            ))}
          </select>
        </label>
        <div className="catalog-switcher-actions">
          <button disabled={busy} onClick={createCatalogo} type="button">
            <Plus size={15} aria-hidden="true" />
            Novo
          </button>
          <button disabled={busy} onClick={duplicateCatalogo} type="button">
            <Copy size={15} aria-hidden="true" />
            Duplicar
          </button>
        </div>
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

      <Link
        className="sidebar-link"
        href={buildPublicCatalogUrl(activeCatalogo.slug, fallbackOrigin)}
        target="_blank"
      >
        <LayoutDashboard size={17} aria-hidden="true" />
        <span>Ver catálogo</span>
      </Link>

      <div className="sidebar-footer">
        <div className="sidebar-user-row">
          {localDev ? (
            <div className="sidebar-avatar" title="Acesso local">D</div>
          ) : (
            <UserButton afterSignOutUrl="/entrar" />
          )}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {activeCatalogo.nomeMarca}
            </div>
            <div style={{ color: "rgba(255,255,255,0.58)", fontSize: 12 }}>
              /{activeCatalogo.slug}
            </div>
          </div>
        </div>
        {localDev ? null : (
          <SignOutButton redirectUrl="/entrar">
            <button className="sidebar-signout" type="button">
              <LogOut size={16} aria-hidden="true" />
              <span>Sair</span>
            </button>
          </SignOutButton>
        )}
      </div>
    </aside>
  );
}

async function readResponseError(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error || fallback;
  } catch {
    return fallback;
  }
}
