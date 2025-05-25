import {
	BarChart3,
	ExternalLink,
	Mouse,
	MousePointer,
	MousePointer2,
	Rocket,
	Star,
	Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { api } from "~/trpc/server";
import { SearchForm } from "./_components/search-form";

// Function to create a seeded random number based on today's date
function getDateBasedRandom(seed: number): number {
	// Simple seeded random function using today's date
	const today = new Date();
	const dateString = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
	let hash = 0;
	for (let i = 0; i < dateString.length; i++) {
		const char = dateString.charCodeAt(i);
		hash = (hash << 5) - hash + char + seed;
		hash = hash & hash; // Convert to 32-bit integer
	}
	return Math.abs(hash) / 2147483647; // Normalize to 0-1
}

// Function to shuffle array with date-based seed
function shuffleWithDateSeed<T>(array: T[]): T[] {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(getDateBasedRandom(i) * (i + 1));
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		[shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
	}
	return shuffled;
}

// Hardcoded popular starting points for exploration
const POPULAR_STARTING_POINTS = [
	// Historical Figures & Leaders
	"Albert Einstein",
	"Leonardo da Vinci",
	"Abraham Lincoln",
	"John F. Kennedy",
	"Winston Churchill",
	"Mahatma Gandhi",
	"Nelson Mandela",
	"Queen Elizabeth II",
	"Napoleon Bonaparte",
	"Julius Caesar",
	"Alexander the Great",
	"Cleopatra",
	"Genghis Khan",
	"Joan of Arc",

	// Science & Technology
	"Quantum mechanics",
	"Evolution",
	"DNA",
	"Black hole",
	"Artificial intelligence",
	"Climate change",
	"Photosynthesis",
	"Big Bang",
	"Stephen Hawking",
	"Elon Musk",
	"Steve Jobs",
	"Mark Zuckerberg",
	"Bill Gates",

	// Wars & Conflicts
	"World War II",
	"World War I",
	"Vietnam War",
	"American Civil War",
	"Cold War",
	"September 11 attacks",
	"The Holocaust",
	"Pearl Harbor",
	"D-Day",
	"Korean War",
	"Chernobyl disaster",

	// Ancient Civilizations & Empires
	"Ancient Rome",
	"Ancient Egypt",
	"Roman Empire",
	"Byzantine Empire",
	"Ottoman Empire",
	"British Empire",
	"Soviet Union",
	"Nazi Germany",
	"Sparta",
	"Ancient Greece",
	"Mesopotamia",
	"Maya civilization",
	"Inca Empire",
	"Mongol Empire",

	// Geography & Places
	"Mount Everest",
	"Bermuda Triangle",
	"Grand Canyon",
	"Yellowstone National Park",
	"Antarctica",
	"Himalayas",
	"Amazon River",
	"Nile",
	"Sahara Desert",
	"Great Wall of China",
	"Machu Picchu",
	"Stonehenge",
	"Pyramids of Giza",

	// Space & Universe
	"Solar System",
	"Mars",
	"Moon",
	"Sun",
	"Milky Way",
	"Saturn",
	"Jupiter",
	"Pluto",
	"International Space Station",
	"Apollo 11",
	"Dark matter",
	"Supernova",

	// Philosophy & Religion
	"Philosophy",
	"Christianity",
	"Islam",
	"Buddhism",
	"Hinduism",
	"Judaism",
	"Jesus",
	"Muhammad",
	"Buddha",
	"Socrates",
	"Plato",
	"Aristotle",

	// Literature & Arts
	"William Shakespeare",
	"Harry Potter",
	"Game of Thrones",
	"The Beatles",
	"Leonardo da Vinci",
	"Mona Lisa",
	"Renaissance",
	"Impressionism",
	"Pablo Picasso",
	"Vincent van Gogh",

	// Modern Culture & Entertainment
	"Michael Jackson",
	"Elvis Presley",
	"The Beatles",
	"Star Wars",
	"Marvel Cinematic Universe",
	"Disney",
	"Netflix",
	"YouTube",
	"Social media",
	"Internet",

	// Animals & Nature
	"Dinosaurs",
	"Sharks",
	"Lions",
	"Tigers",
	"Elephants",
	"Whales",
	"Extinction",
	"Endangered species",
	"Rainforest",
	"Coral reefs",

	// Mysteries & Phenomena
	"Bermuda Triangle",
	"Area 51",
	"Roswell incident",
	"Loch Ness Monster",
	"Bigfoot",
	"Atlantis",
	"Stonehenge",
	"Easter Island",
	"Nazca Lines",
	"Voynich manuscript",

	// Disasters & Events
	"Titanic",
	"Pompeii",
	"Black Death",
	"Spanish flu",
	"Great Depression",
	"French Revolution",
	"Industrial Revolution",
	"Hiroshima and Nagasaki",
	"Fukushima disaster",

	// Sports & Competition
	"Olympic Games",
	"FIFA World Cup",
	"Super Bowl",
	"Muhammad Ali",
	"Michael Jordan",
	"Cristiano Ronaldo",
	"Lionel Messi",
	"Serena Williams",
	"Tiger Woods",
	"Formula One",

	// Countries & Cultures
	"United States",
	"China",
	"India",
	"Russia",
	"Japan",
	"United Kingdom",
	"Germany",
	"France",
	"Brazil",
	"Australia",
	"Canada",
	"Mexico",
	"Egypt",
	"South Africa",

	// Medical & Health
	"COVID-19",
	"Cancer",
	"Heart disease",
	"Mental health",
	"Vaccines",
	"Antibiotics",
	"Surgery",
	"Genetics",
	"Epidemiology",
	"Public health",

	// Economics & Politics
	"Capitalism",
	"Socialism",
	"Democracy",
	"Communism",
	"United Nations",
	"European Union",
	"NATO",
	"World Bank",
	"Stock market",
	"Cryptocurrency",
	"Bitcoin",

	// Inventions & Discoveries
	"Printing press",
	"Steam engine",
	"Electricity",
	"Telephone",
	"Computer",
	"Internet",
	"Penicillin",
	"X-rays",
	"Radioactivity",
	"Telescope",
	"Microscope",
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
			{ next: { revalidate: 3600 } }, // Cache for 1 hour
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

export default async function HomePage() {
	// Fetch all data server-side
	const [stats, recentRabbitholes, articleOfTheDay] = await Promise.all([
		api.rabbithole.getRabbitholeStats(),
		api.rabbithole.getRecentRabbitholes({ limit: 3 }),
		fetchArticleOfTheDay(),
	]);

	const shuffledTopics = shuffleWithDateSeed(POPULAR_STARTING_POINTS).slice(
		0,
		6,
	);

	return (
		<div className="min-h-screen bg-background font-chillax flex flex-col items-center">
			<div className="flex flex-1 items-center justify-center px-6 py-8">
				<div className="w-full max-w-6xl">
					<div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
						{/* Left Sidebar */}
						<div className="space-y-6 lg:col-span-3">
							{/* Featured Article */}
							{articleOfTheDay ? (
								<div className="rounded-lg border border-border bg-card p-4 shadow-sm">
									<div className="mb-3 flex items-center gap-2">
										<Star className="h-4 w-4 text-chart-1" />
										<h3 className="font-semibold text-foreground text-sm">
											Today's Featured
										</h3>
									</div>
									<Link
										href={`/rabbithole?search=${encodeURIComponent(articleOfTheDay.title)}`}
										className="block w-full rounded-md border border-chart-1/20 bg-chart-1/10 p-3 text-left font-medium text-chart-1 text-sm transition-colors hover:bg-chart-1/20"
									>
										{articleOfTheDay.title}
									</Link>
									<p className="mt-2 text-muted-foreground text-xs">
										Click to explore this featured article
									</p>
								</div>
							) : (
								<div className="rounded-lg border border-border bg-card p-4 shadow-sm">
									<div className="mb-2 flex items-center gap-2">
										<Star className="h-4 w-4 text-muted-foreground" />
										<h3 className="font-semibold text-foreground text-sm">
											Today's Featured
										</h3>
									</div>
									<p className="text-muted-foreground text-xs">
										Could not load today's featured article
									</p>
								</div>
							)}

							{/* Popular Topics */}
							<div className="rounded-lg border border-border bg-card p-4 shadow-sm">
								<div className="mb-3 flex items-center gap-2">
									<Rocket className="h-4 w-4 text-chart-2" />
									<h3 className="font-semibold text-foreground text-sm">
										Your next rabbit hole
									</h3>
								</div>
								<div className="space-y-2">
									{shuffledTopics.map((article) => (
										<Link
											key={article}
											href={`/rabbithole?search=${encodeURIComponent(article)}`}
											className="block w-full rounded bg-muted px-3 py-2 text-left text-muted-foreground text-xs transition-colors hover:bg-muted/80 hover:text-foreground"
										>
											{article}
										</Link>
									))}
								</div>
							</div>
						</div>

						{/* Center Content */}
						<div className="space-y-8 text-center lg:col-span-6">
							{/* Hero Section */}
							<div className="space-y-4 flex flex-col items-center justify-center">
								<Image
									src="/icon.png"
									alt="rabbithole"
									width={150}
									height={150}
									className="size-24"
								/>
								<h1 className="font-bold text-4xl text-foreground">
									rabbithole
								</h1>
								<p className="mx-auto max-w-md text-lg text-muted-foreground">
									Go on{" "}
									<span className="font-semibold">wikipedia rabbit holes</span>,
									keep track of your{" "}
									<span className="font-semibold">exploration</span>, share your{" "}
									<span className="font-semibold">rabbit holes</span> with the
									world.
								</p>
							</div>

							{/* Search Form */}
							<div className="mx-auto max-w-md">
								<SearchForm />
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
									<div className="flex items-center gap-3">
										<div className="flex min-w-0 items-center gap-1">
											<MousePointer2 className="h-3 w-3 text-muted-foreground" />
											<span className="rounded border bg-background px-2 py-1 font-mono text-xs">
												Right Click
											</span>
										</div>
										<span className="text-muted-foreground">
											Delete node from graph
										</span>
									</div>
								</div>
							</div>
						</div>

						{/* Right Sidebar */}
						<div className="space-y-6 lg:col-span-3">
							{/* Recent Rabbit Holes */}
							{recentRabbitholes && recentRabbitholes.length > 0 && (
								<div className="rounded-lg border border-border bg-card p-4 shadow-sm">
									<div className="mb-3 flex items-center gap-2">
										<Users className="h-4 w-4 text-chart-3" />
										<h3 className="font-semibold text-foreground text-sm">
											Recent Rabbit Holes
										</h3>
									</div>
									<div className="space-y-2">
										{recentRabbitholes.slice(0, 3).map((rabbithole) => (
											<Link
												key={rabbithole.id}
												href={`/${rabbithole.id}`}
												className="block w-full rounded border border-chart-3/20 bg-chart-3/10 p-3 text-left text-chart-3 transition-colors hover:bg-chart-3/20"
											>
												<div className="truncate font-medium text-xs">
													{rabbithole.title}
												</div>
												<div className="mt-1 text-chart-3/80 text-xs">
													{rabbithole.nodeCount} articles •{" "}
													{rabbithole.viewCount} views
													{rabbithole.creatorName && (
														<span> • by {rabbithole.creatorName}</span>
													)}
												</div>
											</Link>
										))}
									</div>
								</div>
							)}

							{/* Platform Stats */}
							{stats && (
								<div className="rounded-lg border border-border bg-card p-4 shadow-sm">
									<Link
										href="/analytics"
										className="mb-3 flex items-center justify-between transition-colors hover:text-foreground"
									>
										<div className="flex items-center gap-2">
											<BarChart3 className="h-4 w-4 text-chart-4" />
											<h3 className="font-semibold text-foreground text-sm">
												Platform Stats
											</h3>
										</div>
										<ExternalLink className="h-3 w-3 text-muted-foreground" />
									</Link>
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
