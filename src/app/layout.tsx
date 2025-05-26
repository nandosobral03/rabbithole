import "~/styles/globals.css";

import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { getThemeFromCookies } from "~/lib/theme";
import { TRPCReactProvider } from "~/trpc/react";
import { ThemeProvider } from "./_components/providers/theme-provider";

export const metadata: Metadata = {
	title: "rabbithole",
	description: "Explore Wikipedia rabbit holes and share them with the world",
	icons: [{ rel: "icon", url: "/favicon.png" }],
};

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

export default async function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const theme = await getThemeFromCookies();

	return (
		<html
			lang="en"
			className={`${geist.variable} ${theme === "system" ? "dark" : theme}`}
		>
			<head>
				<link
					href="https://api.fontshare.com/v2/css?f[]=chillax@200,300,400,500,600,700,1&display=swap"
					rel="stylesheet"
				/>
			</head>
			<body>
				<ThemeProvider defaultTheme={theme}>
					<TRPCReactProvider>{children}</TRPCReactProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
