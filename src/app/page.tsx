import Link from "next/link";

import { LatestPost } from "~/app/_components/post";
import { HydrateClient, api } from "~/trpc/server";

export default async function Home() {
  const hello = await api.post.hello({ text: "from tRPC" });

  void api.post.getLatest.prefetch();

  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <h1 className="font-extrabold text-5xl tracking-tight sm:text-[5rem]">
            Wikipedia <span className="text-[hsl(280,100%,70%)]">Rabbit Hole</span>
          </h1>
          <p className="text-xl text-center max-w-3xl">Discover the interconnected web of human knowledge through Wikipedia's endless connections. Choose your preferred exploration style below.</p>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 md:gap-8">
            <Link className="flex max-w-sm flex-col gap-4 rounded-xl bg-white/10 p-6 hover:bg-white/20 transition-all duration-200" href="/rabbit-hole">
              <h3 className="font-bold text-2xl">📜 List Explorer</h3>
              <div className="text-lg">Traditional interface with article summaries and clickable outgoing links in an organized list format.</div>
            </Link>

            <Link className="flex max-w-sm flex-col gap-4 rounded-xl bg-white/10 p-6 hover:bg-white/20 transition-all duration-200" href="/full-rabbit-hole">
              <h3 className="font-bold text-2xl">📚 Full Article Reader</h3>
              <div className="text-lg">Read complete Wikipedia articles with clickable inline links for seamless navigation between topics.</div>
            </Link>

            <Link className="flex max-w-sm flex-col gap-4 rounded-xl bg-white/10 p-6 hover:bg-white/20 transition-all duration-200" href="/graph-rabbit-hole">
              <h3 className="font-bold text-2xl">🕸️ Graph Explorer</h3>
              <div className="text-lg">Interactive graph visualization like Obsidian - click nodes to explore, right-click to expand connections.</div>
            </Link>
          </div>

          <div className="flex flex-col items-center gap-2">
            <p className="text-2xl text-white">{hello ? hello.greeting : "Loading tRPC query..."}</p>
          </div>

          <LatestPost />
        </div>
      </main>
    </HydrateClient>
  );
}
