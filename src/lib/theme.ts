import { cookies } from "next/headers";

export type Theme = "light" | "dark" | "system";

export async function getThemeFromCookies(): Promise<Theme> {
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value as Theme;
  return theme || "system";
}

export function getResolvedTheme(theme: Theme, userAgent?: string): "light" | "dark" {
  if (theme === "system") {
    // On server, we can't detect system preference, so default to light
    // The client will hydrate with the correct theme
    return "light";
  }
  return theme;
}
