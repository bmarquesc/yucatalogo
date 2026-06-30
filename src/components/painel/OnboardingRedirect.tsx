"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export function OnboardingRedirect({
  shouldRedirect
}: {
  shouldRedirect: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (shouldRedirect && pathname !== "/painel/perfil") {
      router.replace("/painel/perfil?novo=1");
    }
  }, [pathname, router, shouldRedirect]);

  return null;
}
