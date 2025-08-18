"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
	const [mounted, setMounted] = useState(false);
	const [isDark, setIsDark] = useState(false);

	// Initialize from saved preference or system setting
	useEffect(() => {
		setMounted(true);
		try {
			const root = document.documentElement;
			let initial = root.classList.contains("dark");
			const saved = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
			if (saved === "dark") initial = true;
			if (saved === "light") initial = false;
			if (saved == null && !initial && typeof window !== "undefined" && window.matchMedia) {
				initial = window.matchMedia("(prefers-color-scheme: dark)").matches;
			}
			if (initial) root.classList.add("dark");
			else root.classList.remove("dark");
			setIsDark(initial);
		} catch {
			// no-op
		}
	}, []);

	const toggleTheme = () => {
		const next = !isDark;
		setIsDark(next);
		const root = document.documentElement;
		if (next) root.classList.add("dark");
		else root.classList.remove("dark");
		try {
			localStorage.setItem("theme", next ? "dark" : "light");
		} catch {}
		// Ensure sidebar styles re-apply for the active theme
		requestAnimationFrame(() => {
			import("@/lib/themeUtils").then(({ reapplyCurrentSidebarColors }) => {
				reapplyCurrentSidebarColors();
			});
		});
	};

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
			aria-pressed={isDark}
			aria-label="Toggle dark mode"
			onClick={toggleTheme}
			type="button"
			className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-transparent hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
		>
			<Sun className={`h-5 w-5 transition-opacity ${isDark ? "opacity-0" : "opacity-100"}`} />
			<Moon className={`absolute h-5 w-5 transition-opacity ${isDark ? "opacity-100" : "opacity-0"}`} />
			<span className="sr-only">Toggle dark mode</span>
		</button>
	);
}


