import { WikipediaExplorer } from "~/app/_components/wikipedia-explorer";

export default function RabbitHolePage() {
	return (
		<main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
			<div className="container mx-auto max-w-4xl">
				<div className="mb-8 text-center">
					<h1 className="mb-2 font-bold text-4xl text-gray-900">
						Wikipedia Rabbit Hole 🐰
					</h1>
					<p className="text-gray-600 text-lg">
						Discover the endless connections in human knowledge
					</p>
				</div>

				<WikipediaExplorer />
			</div>
		</main>
	);
}
