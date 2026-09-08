"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AREAS_BY_STATE, BRIDAL_EVENTS, NON_BRIDAL_EVENTS, MALAYSIA_STATES } from "@/lib/data";
import { filterArtists, DEFAULT_ARTIST_FILTERS, hasActiveArtistFilters } from "@/lib/artists";
import type { ArtistFilters } from "@/lib/artists";
import { Artist } from "@/lib/types";
import { ArtistCard } from "@/components/ArtistCard";
import { trackSearch } from "@/lib/agnost-client";

const CATEGORY_TO_FILTER: Record<string, Partial<Pick<ArtistFilters, "state" | "area" | "bridal" | "nonBridal" | "budget">>> = {
  bridal: { bridal: "full-package" },
  engagement: { bridal: "engagement" },
  graduation: { nonBridal: "graduation" },
  corporate: { nonBridal: "corporate" },
};

export default function DesignMockupPage() {
  const searchParams = useSearchParams();
  const category = searchParams.get("category") ?? "";
  const preset = CATEGORY_TO_FILTER[category];

  const [filters, setFilters] = useState<ArtistFilters>({
    ...DEFAULT_ARTIST_FILTERS,
    ...preset,
    budget: 0,
    query: "",
  });

  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [artists, setArtists] = useState<Artist[]>([]);
  const router = useRouter();

  useEffect(() => {
    // Mock artist data demonstrating the design system
    const mockArtists: Artist[] = [
      {
        id: "aisha-azman",
        name: "Aisha Azman",
        slug: "aisha-azman",
        state: "Kuala Lumpur",
        area: "Bukit Bintang",
        tagline: "Bridal & editorial specialist",
        bio: "Specialist in bridal and editorial makeup with 8+ years experience.",
        rating: 4.9,
        reviewCount: 128,
        priceFrom: 200,
        specialties: ["bridal", "editorial"],
        services: [],
        bridal: ["full-package"],
        nonBridal: [],
        availability: ["today"],
        portfolio: [],
        image: "/images/artists/aisha-azman.jpg",
        verified: true,
        yearsExperience: 8,
        reviews: [],
      },
      {
        id: "siti-nor",
        name: "Siti Nor",
        slug: "siti-nor",
        state: "Selangor",
        area: "Kuala Lumpur",
        tagline: "Natural bridal looks",
        bio: "Bridal makeup artist focusing on natural, glowing looks.",
        rating: 4.7,
        reviewCount: 89,
        priceFrom: 180,
        specialties: ["bridal"],
        services: [],
        bridal: ["full-package"],
        nonBridal: [],
        availability: ["tomorrow"],
        portfolio: [],
        image: "/images/artists/siti-nor.jpg",
        verified: true,
        yearsExperience: 5,
        reviews: [],
      },
      {
        id: "maria-santiago",
        name: "Maria Santiago",
        slug: "maria-santiago",
        state: "Johor Bahru",
        area: "CIQ",
        tagline: "Award-winning international artist",
        bio: "International award-winning makeup artist for bridal and editorial.",
        rating: 5.0,
        reviewCount: 234,
        priceFrom: 300,
        specialties: ["bridal", "editorial"],
        services: [],
        bridal: ["full-package"],
        nonBridal: ["corporate"],
        availability: ["nextweek"],
        portfolio: [],
        image: "/images/artists/maria-santiago.jpg",
        verified: true,
        yearsExperience: 10,
        reviews: [],
      },
      {
        id: "kawaii-chan",
        name: "Kawaii Chan",
        slug: "kawaii-chan",
        state: "Penang",
        area: "Gurney Drive",
        tagline: "Korean aesthetics specialist",
        bio: "Specialist in bridal and non-bridal event makeup with Korean aesthetics.",
        rating: 4.8,
        reviewCount: 67,
        priceFrom: 150,
        specialties: ["bridal", "non-bridal"],
        services: [],
        bridal: ["engagement"],
        nonBridal: ["graduation"],
        availability: ["custom"],
        portfolio: [],
        image: "/images/artists/kawaii-chan.jpg",
        verified: true,
        yearsExperience: 6,
        reviews: [],
      },
    ];

    setArtists(mockArtists);
  }, []);

  useEffect(() => {
    const active = hasActiveArtistFilters(filters);
    if (active) {
      trackSearch("", {
        state: filters.state,
        area: filters.area,
        bridal: filters.bridal,
        nonBridal: filters.nonBridal,
        budget: filters.budget,
        resultsCount: artists.length,
      });
    }
  }, [filters, artists.length]);

  function set<K extends keyof typeof filters>(key: K, value: typeof filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  const areas = filters.state ? AREAS_BY_STATE[filters.state as keyof typeof AREAS_BY_STATE] : [];

  const results = filterArtists(artists, filters);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      {/* Theme toggle via localStorage */}
      <button
        onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        className="fixed top-4 right-4 z-10 rounded-full px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/15"
        style={{ background: theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}
      >
        Theme: {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
      </button>

      {/* Hero section with design system colors */}
      <section className="relative min-h-[80vh] overflow-hidden">
        {/* Gradient background */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-[--leish-header-from] to-[--leish-header-to] dark:from-[--leish-header-from-dark] dark:to-[--leish-header-to-dark]"
        />
        {/* Blob animations */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-rose-500/20 rounded-full animate-blobFloat opacity-70"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-500/10 rounded-full animate-blobFloat delay-7s opacity-50"></div>
        <div className="absolute bottom-1/2 left-1/2 w-48 h-48 bg-rose-500/15 rounded-full animate-blobFloat delay-14s opacity-30"></div>

        <div className="relative flex flex-col h-full pt-20 px-6 sm:px-8">
          <h1 className="font-display text-5xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            Leash! — Beauty Booking Marketplace
          </h1>
          <p className="mt-2 text-stone-500 dark:text-stone-400 max-w-2xl">
            Discover top-rated makeup artists and studios across Malaysia. Book in minutes.
          </p>

          {/* Search bar in hero */}
          <div className="mt-6 rounded-2xl border border-stone-200 bg-white dark:border-stone-800 p-4 sm:p-6 max-w-md">
            <div className="relative">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
                className="pointer-events-none left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-stone-500"
              >
                <circle cx="11" cy="11" r="7" />
                <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
              </svg>
              <input
                type="text"
                value={filters.query}
                onChange={(e) => set("query", e.target.value)}
                placeholder="Search artists, styles, or area…"
                className="w-full pl-10 pr-2 text-sm focus:outline-none focus:ring-rose-400 focus:border-rose-200 dark:bg-stone-800 dark:text-stone-100"
              />
            </div>
          </div>

          {/* CTA buttons */}
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Link
              href="/artists"
              className="col-span-1 bg-rose-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-rose-500 transition-colors dark:bg-rose-500 dark:text-white"
            >
              Browse Artists
            </Link>
            <Link
              href="/studios"
              className="col-span-1 bg-white text-rose-600 px-4 py-2 rounded-full text-sm font-medium border border-rose-400 hover:bg-rose-50 hover:text-rose-600 dark:border-rose-600 dark:text-rose-400 dark:hover:bg-rose-900/30"
            >
              View Studios
            </Link>
          </div>
        </div>
      </section>

      {/* Filters section */}
      <section className="py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-sm font-medium text-rose-600 dark:text-rose-500">Refine your search</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            Find Your Artist
          </h1>

          <div className="mt-8 rounded-2xl border border-stone-200 bg-white dark:border-stone-800 p-6 sm:p-8">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <label htmlFor="artist-search" className="sr-only">
                  Search artists
                </label>
                <input
                  id="artist-search"
                  value={filters.query}
                  onChange={(e) => set("query", e.target.value)}
                  placeholder="Search artist, style, area…"
                  className={cn(
                    "w-full pl-10 pr-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 text-stone-600 dark:text-stone-200 focus:outline-none focus:ring-rose-400 focus:border-rose-200 dark:focus:ring-rose-500/40",
                    "py-2.5 px-3 text-sm leading-relaxed"
                  )}
                />
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-stone-500"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
                </svg>
              </div>

              <label className="sr-only" htmlFor="filter-state">
                State
              </label>
              <select
                id="filter-state"
                value={filters.state}
                onChange={(e) => {
                  set("state", e.target.value);
                  set("area", "");
                }}
                className={cn(
                  "w-full rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 py-2.5 px-3 text-sm text-stone-600 dark:text-stone-200 focus:outline-none focus:ring-rose-400 focus:border-rose-200 dark:focus:ring-rose-500/40",
                  "appearance-none",
                  "pr-9"
                )}
              >
                <option value="">All States</option>
                {MALAYSIA_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              {filters.state && (
                <div>
                  <label className="sr-only" htmlFor="filter-area">
                    Area
                  </label>
                  <select
                    id="filter-area"
                    value={filters.area}
                    onChange={(e) => set("area", e.target.value)}
                    disabled={!filters.state}
                    className={cn(
                      "w-full rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 py-2.5 px-3 text-sm text-stone-600 dark:text-stone-200 focus:outline-none focus:ring-rose-400 focus:border-rose-200 dark:focus:ring-rose-500/40",
                      "appearance-none",
                      "pr-9"
                    )}
                  >
                    <option value="">{filters.state ? "All Areas" : "Select state first"}</option>
                    {areas.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="mt-2">
                <label className="sr-only" htmlFor="filter-budget">
                  Max budget (RM)
                </label>
                <select
                  id="filter-budget"
                  value={filters.budget}
                  onChange={(e) => set("budget", Number(e.target.value))}
                  className={cn(
                    "w-full rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 py-2.5 px-3 text-sm text-stone-600 dark:text-stone-200 focus:outline-none focus:ring-rose-400 focus:border-rose-200 dark:focus:ring-rose-500/40",
                    "appearance-none",
                    "pr-9"
                  )}
                >
                  <option value={0}>Any budget</option>
                  {[300, 400, 500, 600, 800, 1000].map((b) => (
                    <option key={b} value={b}>
                      Under RM {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Event type filters */}
              <div>
                <fieldset>
                  <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Bridal event
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      aria-pressed={filters.bridal === "any"}
                      onClick={() => set("bridal", "any")}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        filters.bridal === "any"
                          ? "border-rose-600 bg-rose-600 text-white"
                          : "border-stone-300 bg-white text-stone-600 hover:border-rose-300 hover:text-rose-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:border-rose-700 dark:hover:text-rose-400"
                      )}
                    >
                      Any
                    </button>
                    {BRIDAL_EVENTS.map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        aria-pressed={filters.bridal === ev.id}
                        onClick={() => set("bridal", ev.id)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                          filters.bridal === ev.id
                            ? "border-rose-600 bg-rose-600 text-white"
                            : "border-stone-300 bg-white text-stone-600 hover:border-rose-300 hover:text-rose-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:border-rose-700 dark:hover:text-rose-400"
                        )}
                      >
                        {ev.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Non-bridal event
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      aria-pressed={filters.nonBridal === "any"}
                      onClick={() => set("nonBridal", "any")}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        filters.nonBridal === "any"
                          ? "border-rose-600 bg-rose-600 text-white"
                          : "border-stone-300 bg-white text-stone-600 hover:border-rose-300 hover:text-rose-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:border-rose-700 dark:hover:text-rose-400"
                      )}
                    >
                      Any
                    </button>
                    {NON_BRIDAL_EVENTS.map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        aria-pressed={filters.nonBridal === ev.id}
                        onClick={() => set("nonBridal", ev.id)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                          filters.nonBridal === ev.id
                            ? "border-rose-600 bg-rose-600 text-white"
                            : "border-stone-300 bg-white text-stone-600 hover:border-rose-300 hover:text-rose-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:border-rose-700 dark:hover:text-rose-400"
                        )}
                      >
                        {ev.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Artists grid */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mt-8 flex items-center justify-between">
            <p className="text-sm font-medium text-rose-600 dark:text-rose-500">Results</p>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
              {results.length} Artist{s(results.length)}
            </h1>
          </div>

          {results.length > 0 ? (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {results.map((artist) => (
                <ArtistCard key={artist.id} artist={artist} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-stone-300 bg-white p-16 text-center dark:border-stone-700 dark:bg-stone-900">
              <p className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                No artists match your filters
              </p>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                Try widening your search — new artists join Leish! every week.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFilters({
                    ...DEFAULT_ARTIST_FILTERS,
                    budget: 0,
                    query: "",
                    state: "",
                    area: "",
                    bridal: "any",
                    nonBridal: "any",
                  });
                }}
                className="mt-5 text-sm font-medium text-rose-600 hover:text-rose-700 dark:text-rose-500 dark:hover:text-rose-400"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function s(count: number) {
  return count === 1 ? "" : "s";
}