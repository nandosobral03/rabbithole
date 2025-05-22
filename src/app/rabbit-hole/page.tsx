import { WikipediaExplorer } from "~/app/_components/wikipedia-explorer";

export default function RabbitHolePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Wikipedia Rabbit Hole 🐰</h1>
          <p className="text-gray-600 text-lg">Discover the endless connections in human knowledge</p>
        </div>

        <WikipediaExplorer />
      </div>
    </main>
  );
}
