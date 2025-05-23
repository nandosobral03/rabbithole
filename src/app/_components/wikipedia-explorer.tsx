"use client";

import { ExternalLink, Loader2, Search } from "lucide-react";
import { useState } from "react";
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

interface WikipediaLink {
	title: string;
	url: string;
}

interface WikipediaPageData {
	title: string;
	content: string;
	links: WikipediaLink[];
	url: string;
}

export function WikipediaExplorer() {
	const [searchQuery, setSearchQuery] = useState("");
	const [currentPage, setCurrentPage] = useState<WikipediaPageData | null>(
		null,
	);

	const fetchPageMutation = api.wikipedia.fetchPageWithLinks.useMutation({
		onSuccess: (data) => {
			setCurrentPage(data);
		},
		onError: (error) => {
			console.error("Error fetching Wikipedia page:", error);
		},
	});

	const handleSearch = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!searchQuery.trim()) return;

		await fetchPageMutation.mutateAsync({ title: searchQuery.trim() });
	};

	const handleLinkClick = async (linkTitle: string) => {
		setSearchQuery(linkTitle);
		await fetchPageMutation.mutateAsync({ title: linkTitle });
	};

	return (
		<div className="space-y-6">
			{/* Search Form */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Search className="h-5 w-5" />
						Search Wikipedia
					</CardTitle>
					<CardDescription>
						Enter a Wikipedia article title to start your rabbit hole journey
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

			{/* Current Page */}
			{currentPage && (
				<Card>
					<CardHeader>
						<div className="flex items-start justify-between">
							<div>
								<CardTitle className="text-2xl">{currentPage.title}</CardTitle>
								<CardDescription className="mt-2 flex items-center gap-1">
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
						</div>
					</CardHeader>
					<CardContent>
						<p className="mb-6 text-gray-700 leading-relaxed">
							{currentPage.content}
						</p>

						<div>
							<h3 className="mb-4 font-semibold text-gray-900 text-lg">
								Outgoing Links ({currentPage.links.length})
							</h3>
							<div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
								{currentPage.links.map((link) => (
									<button
										key={link.title}
										type="button"
										onClick={() => handleLinkClick(link.title)}
										className="rounded-lg border border-gray-200 bg-white p-3 text-left text-sm transition-colors duration-200 hover:border-blue-300 hover:bg-blue-50"
										disabled={fetchPageMutation.isPending}
									>
										<span className="font-medium text-blue-600 hover:text-blue-800">
											{link.title}
										</span>
									</button>
								))}
							</div>

							{currentPage.links.length === 0 && (
								<p className="text-gray-500 italic">
									No outgoing links found for this page.
								</p>
							)}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Welcome message when no page is loaded */}
			{!currentPage && !fetchPageMutation.isPending && (
				<Card>
					<CardContent className="py-12 text-center">
						<div className="mb-4 text-6xl">🐰</div>
						<h3 className="mb-2 font-semibold text-gray-900 text-xl">
							Ready to dive down the rabbit hole?
						</h3>
						<p className="text-gray-600">
							Search for any Wikipedia article to discover the interconnected
							web of human knowledge. Each article contains links to other
							articles, creating endless paths to explore.
						</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
