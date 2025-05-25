"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

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

export function SearchForm() {
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState("");
	const [validationError, setValidationError] = useState<string | null>(null);

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

	return (
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
	);
}
