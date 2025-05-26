"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
	theme: Theme;
	setTheme: (theme: Theme) => void;
	resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
	children: React.ReactNode;
	defaultTheme?: Theme;
	storageKey?: string;
}

export function ThemeProvider({
	children,
	defaultTheme = "system",
	storageKey = "theme",
}: ThemeProviderProps) {
	const [theme, setTheme] = useState<Theme>(defaultTheme);
	const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

	useEffect(() => {
		// Get theme from cookie on client side
		const savedTheme = document.cookie
			.split("; ")
			.find((row) => row.startsWith(`${storageKey}=`))
			?.split("=")[1] as Theme | undefined;

		if (savedTheme) {
			setTheme(savedTheme);
		}
	}, [storageKey]);

	useEffect(() => {
		const root = window.document.documentElement;

		// Remove previous theme classes
		root.classList.remove("light", "dark");

		let systemTheme: "light" | "dark" = "light";

		if (theme === "system") {
			systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
				? "dark"
				: "light";
		}

		const resolvedTheme = theme === "system" ? systemTheme : theme;
		setResolvedTheme(resolvedTheme);

		// Apply theme class
		root.classList.add(resolvedTheme);

		// Save to cookie
		document.cookie = `${storageKey}=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
	}, [theme, storageKey]);

	// Listen for system theme changes
	useEffect(() => {
		if (theme !== "system") return;

		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const handleChange = () => {
			const systemTheme = mediaQuery.matches ? "dark" : "light";
			setResolvedTheme(systemTheme);
			const root = window.document.documentElement;
			root.classList.remove("light", "dark");
			root.classList.add(systemTheme);
		};

		mediaQuery.addEventListener("change", handleChange);
		return () => mediaQuery.removeEventListener("change", handleChange);
	}, [theme]);

	return (
		<ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme() {
	const context = useContext(ThemeContext);
	if (context === undefined) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return context;
}
