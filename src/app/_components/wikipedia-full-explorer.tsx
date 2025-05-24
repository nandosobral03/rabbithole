"use client";

import { ArrowLeft, ExternalLink, Loader2, Search } from "lucide-react";
import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";
import {
	WikipediaArticleViewer,
	wikipediaStyles,
} from "./wikipedia-article-viewer";

interface WikipediaLink {
	title: string;
	url: string;
}

interface WikipediaFullPageData {
	title: string;
	content: string;
	fullHtml: string;
	links: WikipediaLink[];
	url: string;
}

export function WikipediaFullExplorer() {
	const [searchQuery, setSearchQuery] = useState("");
	const [currentPage, setCurrentPage] = useState<WikipediaFullPageData | null>(
		null,
	);
	const [visitedPages, setVisitedPages] = useState<string[]>([]);

	const fetchPageMutation = api.wikipedia.fetchFullPageWithLinks.useMutation({
		onSuccess: (data) => {
			setCurrentPage(data);
			if (!visitedPages.includes(data.title)) {
				setVisitedPages((prev) => [...prev, data.title]);
			}
		},
		onError: (error) => {
			console.error("Error fetching Wikipedia page:", error);
		},
	});

	const handleSearch = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!searchQuery.trim()) return;

		await fetchPageMutation.mutateAsync({ title: searchQuery.trim() });
		setSearchQuery("");
	};

	const handleLinkClick = async (title: string) => {
		await fetchPageMutation.mutateAsync({ title });
	};

	const handleBackClick = () => {
		setCurrentPage(null);
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
			<style>{wikipediaStyles}</style>

			<div className="container mx-auto max-w-6xl p-4">
				{/* Header */}
				<div className="mb-8 text-center">
					<h1 className="mb-2 font-bold text-4xl text-gray-900">
						Wikipedia Deep Dive 📚
					</h1>
					<p className="text-gray-600 text-lg">
						Read full Wikipedia articles with clickable links for seamless
						exploration
					</p>
				</div>

				{/* Search */}
				<Card className="mb-6">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Search className="h-5 w-5" />
							Search Wikipedia
						</CardTitle>
						<CardDescription>
							Enter a Wikipedia article title to start reading
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSearch} className="flex gap-2">
							<Input
								type="text"
								placeholder="Enter Wikipedia article title (e.g., 'Quantum mechanics')"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="flex-1"
								disabled={fetchPageMutation.isPending}
							/>
							<Button
								type="submit"
								disabled={fetchPageMutation.isPending || !searchQuery.trim()}
								className="min-w-[100px]"
							>
								{fetchPageMutation.isPending ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Loading...
									</>
								) : (
									"Search"
								)}
							</Button>
						</form>

						{fetchPageMutation.error && (
							<div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3">
								<p className="text-red-700 text-sm">
									{fetchPageMutation.error.message}
								</p>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Breadcrumb / Navigation */}
				{visitedPages.length > 0 && (
					<Card className="mb-6">
						<CardContent className="pt-6">
							<div className="flex items-center gap-2 text-sm">
								<span className="text-gray-500">Recently visited:</span>
								<div className="flex flex-wrap gap-2">
									{visitedPages.slice(-5).map((page, index) => (
										<Badge
											key={page}
											variant={
												page === currentPage?.title ? "default" : "secondary"
											}
											className="cursor-pointer hover:bg-gray-200"
											onClick={() => handleLinkClick(page)}
										>
											{page}
										</Badge>
									))}
								</div>
							</div>
						</CardContent>
					</Card>
				)}

				{/* Main Content */}
				{currentPage ? (
					<div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
						{/* Article Content */}
						<div className="lg:col-span-3">
							<Card>
								<CardHeader>
									<div className="flex items-start justify-between">
										<div>
											<CardTitle className="text-2xl">
												{currentPage.title}
											</CardTitle>
											<CardDescription className="mt-2 flex items-center gap-2">
												<ExternalLink className="h-4 w-4" />
												<a
													href={currentPage.url}
													target="_blank"
													rel="noopener noreferrer"
													className="text-blue-600 hover:underline"
												>
													View on Wikipedia
												</a>
											</CardDescription>
										</div>
										<Button
											variant="outline"
											size="sm"
											onClick={handleBackClick}
											className="flex items-center gap-1"
										>
											<ArrowLeft className="h-4 w-4" />
											Back to Search
										</Button>
									</div>
								</CardHeader>
								<CardContent>
									<WikipediaArticleViewer
										htmlContent={currentPage.fullHtml}
										title={currentPage.title}
										onLinkClick={handleLinkClick}
									/>
								</CardContent>
							</Card>
						</div>

						{/* Sidebar with Outgoing Links */}
						<div className="lg:col-span-1">
							<Card className="sticky top-4">
								<CardHeader>
									<CardTitle className="text-lg">
										Outgoing Links ({currentPage.links.length})
									</CardTitle>
									<CardDescription>
										Click any link to navigate to that article
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="max-h-96 space-y-2 overflow-y-auto">
										{currentPage.links.map((link, index) => (
											<button
												key={link.url}
												onClick={() => handleLinkClick(link.title)}
												className="w-full rounded border bg-gray-50 p-2 text-left text-sm transition-colors duration-200 hover:bg-blue-50"
												disabled={fetchPageMutation.isPending}
												type="button"
											>
												<span className="font-medium text-blue-600 hover:text-blue-800">
													{link.title}
												</span>
											</button>
										))}
									</div>

									{currentPage.links.length === 0 && (
										<p className="text-gray-500 text-sm italic">
											No outgoing links found for this page.
										</p>
									)}
								</CardContent>
							</Card>
						</div>
					</div>
				) : (
					/* Welcome message when no page is loaded */
					<Card>
						<CardContent className="py-12 text-center">
							<div className="mb-4 text-6xl">📖</div>
							<h3 className="mb-2 font-semibold text-gray-900 text-xl">
								Ready to explore Wikipedia?
							</h3>
							<p className="mx-auto max-w-md text-gray-600">
								Search for any Wikipedia article above to start reading the
								complete content. Click on any link within the article or in the
								sidebar to seamlessly navigate to related topics.
							</p>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
