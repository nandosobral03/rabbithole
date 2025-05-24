"use client";

import {
	BarChart3,
	Mouse,
	MousePointer,
	MousePointer2,
	Rocket,
	Star,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";

// Function to validate and extract Wikipedia article title
function validateWikipediaInput(input: string): {
	isValid: boolean;
	title?: string;
	error?: string;
} {
	const trimmed = input.trim();

	if (!trimmed) {
		return {
			isValid: false,
			error: "Please enter a Wikipedia article title or URL",
		};
	}

	// Check if it's a Wikipedia URL
	const wikipediaUrlRegex =
		/(?:https?:\/\/)?(?:www\.)?(?:en\.)?wikipedia\.org\/wiki\/([^#?]+)/i;
	const urlMatch = trimmed.match(wikipediaUrlRegex);

	if (urlMatch?.[1]) {
		const title = decodeURIComponent(urlMatch[1].replace(/_/g, " "));
		return { isValid: true, title };
	}

	// If it's not a URL, treat it as an article title
	// Basic validation - no special characters that would break Wikipedia URLs
	if (
		trimmed.includes("|") ||
		trimmed.includes("#") ||
		trimmed.includes("[") ||
		trimmed.includes("]")
	) {
		return {
			isValid: false,
			error: "Please enter a valid Wikipedia article title",
		};
	}

	return { isValid: true, title: trimmed };
}

// Hardcoded popular starting points for exploration
const POPULAR_STARTING_POINTS = [
	"Albert Einstein",
	"World War II",
	"Ancient Rome",
	"Quantum mechanics",
	"Leonardo da Vinci",
	"Evolution",
	"Solar System",
	"Artificial intelligence",
	"Renaissance",
	"DNA",
	"Black hole",
	"Philosophy",
	"Climate change",
	"Ancient Egypt",
	"Computer science",
];

// Function to fetch Wikipedia's featured article of the day
async function fetchArticleOfTheDay(): Promise<{
	title: string;
	url: string;
} | null> {
	try {
		const today = new Date();
		const year = today.getFullYear();
		const month = String(today.getMonth() + 1).padStart(2, "0");
		const day = String(today.getDate()).padStart(2, "0");

		const response = await fetch(
			`https://en.wikipedia.org/api/rest_v1/feed/featured/${year}/${month}/${day}`,
		);

		if (!response.ok) {
			throw new Error(`Wikipedia API returned ${response.status}`);
		}

		const data = await response.json();

		if (!data.tfa?.title) {
			throw new Error("No featured article found for today");
		}

		// Get the proper article title and construct the full URL
		const articleTitle = data.tfa.title.replace(/_/g, " ");
		const articleUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(data.tfa.title)}`;

		return {
			title: articleTitle,
			url: articleUrl,
		};
	} catch (error) {
		console.error("Failed to fetch article of the day:", error);
		return null;
	}
}

export default function HomePage() {
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState("");
	const [validationError, setValidationError] = useState<string | null>(null);
	const [articleOfTheDay, setArticleOfTheDay] = useState<{
		title: string;
		url: string;
	} | null>(null);
	const [articleOfTheDayError, setArticleOfTheDayError] = useState<
		string | null
	>(null);

	const { data: stats, isLoading } =
		api.rabbithole.getRabbitholeStats.useQuery();
	const { data: popularArticles } = api.rabbithole.getPopularArticles.useQuery({
		limit: 5,
	});

	// Fetch article of the day on component mount
	useEffect(() => {
		fetchArticleOfTheDay()
			.then((result) => {
				if (result) {
					setArticleOfTheDay(result);
					setArticleOfTheDayError(null);
				} else {
					setArticleOfTheDayError("Could not load today's featured article");
				}
			})
			.catch(() => {
				setArticleOfTheDayError("Could not load today's featured article");
			});
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setValidationError(null);

		const validation = validateWikipediaInput(searchQuery);

		if (!validation.isValid) {
			setValidationError(validation.error || "Invalid input");
			return;
		}

		if (!validation.title) {
			setValidationError("No title found");
			return;
		}

		// Navigate to rabbithole page with validated title
		router.push(`/rabbithole?search=${encodeURIComponent(validation.title)}`);
	};

	const handleArticleClick = (articleTitle: string) => {
		router.push(`/rabbithole?search=${encodeURIComponent(articleTitle)}`);
	};

	const handleArticleOfTheDayClick = () => {
		if (articleOfTheDay) {
			// Set the full Wikipedia URL in the search input
			setSearchQuery(articleOfTheDay.url);
			// Clear any existing validation errors
			setValidationError(null);
		}
	};

	return (
		<div className="min-h-screen bg-background font-chillax">
			{/* Header */}
			<div className="flex justify-end border-border/50 border-b p-4">
				<Link
					href="/analytics"
					className="flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
				>
					<BarChart3 className="h-4 w-4" />
					Analytics
				</Link>
			</div>

			{/* Main Content */}
			<div className="flex flex-1 items-center justify-center px-6 py-8">
				<div className="w-full max-w-6xl">
					<div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
						{/* Left Sidebar */}
						<div className="space-y-6 lg:col-span-3">
							{/* Featured Article */}
							{articleOfTheDay && (
								<div className="rounded-lg border border-border bg-card p-4 shadow-sm">
									<div className="mb-3 flex items-center gap-2">
										<Star className="h-4 w-4 text-amber-500" />
										<h3 className="font-semibold text-foreground text-sm">
											Today's Featured
										</h3>
									</div>
									<button
										type="button"
										onClick={handleArticleOfTheDayClick}
										className="w-full rounded-md border border-amber-200 bg-amber-50 p-3 text-left font-medium text-amber-900 text-sm transition-colors hover:bg-amber-100"
									>
										{articleOfTheDay.title}
									</button>
									<p className="mt-2 text-muted-foreground text-xs">
										Click to explore this featured article
									</p>
								</div>
							)}

							{/* Featured Article Error */}
							{articleOfTheDayError && !articleOfTheDay && (
								<div className="rounded-lg border border-border bg-card p-4 shadow-sm">
									<div className="mb-2 flex items-center gap-2">
										<Star className="h-4 w-4 text-muted-foreground" />
										<h3 className="font-semibold text-foreground text-sm">
											Today's Featured
										</h3>
									</div>
									<p className="text-muted-foreground text-xs">
										{articleOfTheDayError}
									</p>
								</div>
							)}

							{/* Popular Topics */}
							<div className="rounded-lg border border-border bg-card p-4 shadow-sm">
								<div className="mb-3 flex items-center gap-2">
									<Rocket className="h-4 w-4 text-blue-500" />
									<h3 className="font-semibold text-foreground text-sm">
										Popular Topics
									</h3>
								</div>
								<div className="space-y-2">
									{POPULAR_STARTING_POINTS.slice(0, 4).map((article) => (
										<button
											key={article}
											type="button"
											onClick={() => handleArticleClick(article)}
											className="w-full rounded bg-muted px-3 py-2 text-left text-muted-foreground text-xs transition-colors hover:bg-muted/80 hover:text-foreground"
										>
											{article}
										</button>
									))}
								</div>
							</div>
						</div>

						{/* Center Content */}
						<div className="space-y-8 text-center lg:col-span-6">
							{/* Hero Section */}
							<div className="space-y-4">
								<h1 className="font-bold text-4xl text-foreground">
									rabbithole
								</h1>
								<p className="mx-auto max-w-md text-lg text-muted-foreground">
									Explore the interconnected world of knowledge through
									interactive graphs
								</p>
							</div>

							{/* Search Form */}
							<div className="mx-auto max-w-md">
								<form onSubmit={handleSubmit} className="space-y-4">
									<div className="flex gap-2">
										<Input
											type="text"
											placeholder="Enter Wikipedia article or URL..."
											value={searchQuery}
											onChange={(e) => {
												setSearchQuery(e.target.value);
												setValidationError(null);
											}}
											className="h-12 flex-1 border-border text-center text-base focus:border-primary focus:ring-primary"
										/>
										<Button
											type="submit"
											className="h-12 bg-primary px-6 text-primary-foreground hover:bg-primary/90"
										>
											Start Exploring
										</Button>
									</div>
									{validationError && (
										<p className="text-center text-destructive text-sm">
											{validationError}
										</p>
									)}
								</form>
							</div>

							{/* Navigation Guide */}
							<div className="mx-auto max-w-lg rounded-lg border border-border bg-muted/30 p-6">
								<div className="mb-4 flex items-center justify-center gap-2">
									<Mouse className="h-4 w-4 text-primary" />
									<h4 className="font-semibold text-foreground text-sm">
										Navigation Guide
									</h4>
								</div>
								<div className="space-y-3 text-sm">
									<div className="flex items-center gap-3">
										<div className="flex min-w-0 items-center gap-1">
											<MousePointer className="h-3 w-3 text-muted-foreground" />
											<span className="rounded border bg-background px-2 py-1 font-mono text-xs">
												Left Click
											</span>
										</div>
										<span className="text-muted-foreground">
											Follow link & switch view
										</span>
									</div>
									<div className="flex items-center gap-3">
										<div className="flex min-w-0 items-center gap-1">
											<MousePointer2 className="h-3 w-3 text-muted-foreground" />
											<span className="rounded border bg-background px-2 py-1 font-mono text-xs">
												Middle Click
											</span>
										</div>
										<span className="text-muted-foreground">
											Add without switching
										</span>
									</div>
								</div>
							</div>
						</div>

						{/* Right Sidebar */}
						<div className="space-y-6 lg:col-span-3">
							{/* Community Picks */}
							{popularArticles && popularArticles.length > 0 && (
								<div className="rounded-lg border border-border bg-card p-4 shadow-sm">
									<div className="mb-3 flex items-center gap-2">
										<Users className="h-4 w-4 text-green-500" />
										<h3 className="font-semibold text-foreground text-sm">
											Community Picks
										</h3>
									</div>
									<div className="space-y-2">
										{popularArticles.slice(0, 3).map((article) => (
											<button
												key={article.id}
												type="button"
												onClick={() => handleArticleClick(article.articleTitle)}
												className="w-full rounded border border-green-200 bg-green-50 p-3 text-left text-green-900 transition-colors hover:bg-green-100"
											>
												<div className="truncate font-medium text-xs">
													{article.articleTitle}
												</div>
												<div className="mt-1 text-green-700 text-xs">
													{article.totalAppearances} rabbit holes
												</div>
											</button>
										))}
									</div>
								</div>
							)}

							{/* Platform Stats */}
							{!isLoading && stats && (
								<div className="rounded-lg border border-border bg-card p-4 shadow-sm">
									<div className="mb-3 flex items-center gap-2">
										<BarChart3 className="h-4 w-4 text-purple-500" />
										<h3 className="font-semibold text-foreground text-sm">
											Platform Stats
										</h3>
									</div>
									<div className="space-y-2 text-sm">
										<div className="flex justify-between">
											<span className="text-muted-foreground">
												Rabbit holes
											</span>
											<span className="font-medium">
												{stats.totalRabbitholes.toLocaleString()}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-muted-foreground">Articles</span>
											<span className="font-medium">
												{stats.totalArticles.toLocaleString()}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-muted-foreground">Connections</span>
											<span className="font-medium">
												{stats.totalConnections.toLocaleString()}
											</span>
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
