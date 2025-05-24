import { redirect } from "next/navigation";
import { WikipediaGraphExplorer } from "~/app/_components/wikipedia-graph-explorer";

interface RabbitholePageProps {
	searchParams: Promise<{ search?: string }>;
}

export default async function RabbitholePage({
	searchParams,
}: RabbitholePageProps) {
	const searchQuery = (await searchParams).search;
	console.log("searchQuery", searchQuery);
	// If no search query is provided, redirect to homepage
	if (!searchQuery) {
		console.log("redirecting to homepage");
		redirect("/");
	}

	return <WikipediaGraphExplorer initialSearchQuery={searchQuery} />;
}
