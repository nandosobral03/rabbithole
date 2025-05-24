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
			<div className="flex justify-end p-4 border-b border-border/50">
				<Link
					href="/analytics"
					className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
				>
					<BarChart3 className="w-4 h-4" />
					Analytics
				</Link>
			</div>

			{/* Main Content */}
			<div className="flex-1 flex items-center justify-center px-6 py-8">
				<div className="w-full max-w-6xl">
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
						{/* Left Sidebar */}
						<div className="lg:col-span-3 space-y-6">
							{/* Featured Article */}
							{articleOfTheDay && (
								<div className="bg-card border border-border rounded-lg p-4 shadow-sm">
									<div className="flex items-center gap-2 mb-3">
										<Star className="w-4 h-4 text-amber-500" />
										<h3 className="font-semibold text-sm text-foreground">
											Today's Featured
										</h3>
									</div>
									<button
										type="button"
										onClick={handleArticleOfTheDayClick}
										className="w-full p-3 text-sm bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md text-amber-900 font-medium transition-colors text-left"
									>
										{articleOfTheDay.title}
									</button>
									<p className="text-xs text-muted-foreground mt-2">
										Click to explore this featured article
									</p>
								</div>
							)}

							{/* Featured Article Error */}
							{articleOfTheDayError && !articleOfTheDay && (
								<div className="bg-card border border-border rounded-lg p-4 shadow-sm">
									<div className="flex items-center gap-2 mb-2">
										<Star className="w-4 h-4 text-muted-foreground" />
										<h3 className="font-semibold text-sm text-foreground">
											Today's Featured
										</h3>
									</div>
									<p className="text-xs text-muted-foreground">
										{articleOfTheDayError}
									</p>
								</div>
							)}

							{/* Popular Topics */}
							<div className="bg-card border border-border rounded-lg p-4 shadow-sm">
								<div className="flex items-center gap-2 mb-3">
									<Rocket className="w-4 h-4 text-blue-500" />
									<h3 className="font-semibold text-sm text-foreground">
										Popular Topics
									</h3>
								</div>
								<div className="space-y-2">
									{POPULAR_STARTING_POINTS.slice(0, 4).map((article) => (
										<button
											key={article}
											type="button"
											onClick={() => handleArticleClick(article)}
											className="w-full px-3 py-2 text-xs bg-muted hover:bg-muted/80 rounded text-muted-foreground hover:text-foreground transition-colors text-left"
										>
											{article}
										</button>
									))}
								</div>
							</div>
						</div>

						{/* Center Content */}
						<div className="lg:col-span-6 text-center space-y-8">
							{/* Hero Section */}
							<div className="space-y-4">
								<h1 className="text-4xl font-bold text-foreground">
									rabbithole
								</h1>
								<p className="text-lg text-muted-foreground max-w-md mx-auto">
									Explore the interconnected world of knowledge through
									interactive graphs
								</p>
							</div>

							{/* Search Form */}
							<div className="max-w-md mx-auto">
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
											className="flex-1 text-center h-12 text-base border-border focus:border-primary focus:ring-primary"
										/>
										<Button
											type="submit"
											className="bg-primary hover:bg-primary/90 text-primary-foreground h-12 px-6"
										>
											Start Exploring
										</Button>
									</div>
									{validationError && (
										<p className="text-sm text-destructive text-center">
											{validationError}
										</p>
									)}
								</form>
							</div>

							{/* Navigation Guide */}
							<div className="bg-muted/30 border border-border rounded-lg p-6 max-w-lg mx-auto">
								<div className="flex items-center gap-2 mb-4 justify-center">
									<Mouse className="w-4 h-4 text-primary" />
									<h4 className="font-semibold text-sm text-foreground">
										Navigation Guide
									</h4>
								</div>
								<div className="space-y-3 text-sm">
									<div className="flex items-center gap-3">
										<div className="flex items-center gap-1 min-w-0">
											<MousePointer className="w-3 h-3 text-muted-foreground" />
											<span className="font-mono text-xs bg-background px-2 py-1 rounded border">
												Left Click
											</span>
										</div>
										<span className="text-muted-foreground">
											Follow link & switch view
										</span>
									</div>
									<div className="flex items-center gap-3">
										<div className="flex items-center gap-1 min-w-0">
											<MousePointer2 className="w-3 h-3 text-muted-foreground" />
											<span className="font-mono text-xs bg-background px-2 py-1 rounded border">
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
						<div className="lg:col-span-3 space-y-6">
							{/* Community Picks */}
							{popularArticles && popularArticles.length > 0 && (
								<div className="bg-card border border-border rounded-lg p-4 shadow-sm">
									<div className="flex items-center gap-2 mb-3">
										<Users className="w-4 h-4 text-green-500" />
										<h3 className="font-semibold text-sm text-foreground">
											Community Picks
										</h3>
									</div>
									<div className="space-y-2">
										{popularArticles.slice(0, 3).map((article) => (
											<button
												key={article.id}
												type="button"
												onClick={() => handleArticleClick(article.articleTitle)}
												className="w-full p-3 bg-green-50 hover:bg-green-100 border border-green-200 rounded text-green-900 transition-colors text-left"
											>
												<div className="font-medium text-xs truncate">
													{article.articleTitle}
												</div>
												<div className="text-xs text-green-700 mt-1">
													{article.totalAppearances} rabbit holes
												</div>
											</button>
										))}
									</div>
								</div>
							)}

							{/* Platform Stats */}
							{!isLoading && stats && (
								<div className="bg-card border border-border rounded-lg p-4 shadow-sm">
									<div className="flex items-center gap-2 mb-3">
										<BarChart3 className="w-4 h-4 text-purple-500" />
										<h3 className="font-semibold text-sm text-foreground">
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
