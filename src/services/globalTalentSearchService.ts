"use client";

export type GlobalTalentSearchResultType = "applicant" | "position" | "user";

export interface GlobalTalentSearchResult {
  id: string;
  type: GlobalTalentSearchResultType;
  title: string;
  subtitle?: string;
  meta?: string;
}

export interface GlobalTalentSearchResponse {
  query: string;
  results: {
    applicants: GlobalTalentSearchResult[];
    positions: GlobalTalentSearchResult[];
    users: GlobalTalentSearchResult[];
  };
}

class GlobalTalentSearchService {
  async search(query: string): Promise<GlobalTalentSearchResponse> {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      return {
        query: trimmed,
        results: {
          applicants: [],
          positions: [],
          users: [],
        },
      };
    }

    const response = await fetch(`/api/search/global-talent?q=${encodeURIComponent(trimmed)}`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Search failed");
    }

    return response.json();
  }
}

export const globalTalentSearchService = new GlobalTalentSearchService();
