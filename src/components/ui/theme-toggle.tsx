"use client";

import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle() {
	const { mounted, currentTheme, toggleTheme } = useTheme();

	// Avoid SSR mismatch
	if (!mounted) {
		return (
			<button
				aria-pressed={false}
				aria-label="Toggle dark mode"
				type="button"
				className="inline-flex h-9 w-9 items-center justify-center rounded-full"
			>
				<Sun className="h-4 w-4 opacity-70" />
				<span className="sr-only">Toggle dark mode</span>
			</button>
		);
	}

	return (
		<button
			aria-pressed={currentTheme === 'dark'}
			aria-label="Toggle dark mode"
			onClick={toggleTheme}
			type="button"
			className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-transparent hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
		>
			<Sun className={`h-5 w-5 transition-opacity ${currentTheme === 'dark' ? "opacity-0" : "opacity-100"}`} />
			<Moon className={`absolute h-5 w-5 transition-opacity ${currentTheme === 'dark' ? "opacity-100" : "opacity-0"}`} />
			<span className="sr-only">Toggle dark mode</span>
		</button>
	);
}


