import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: Array<{
    path: string;
    priority: number;
    changeFrequency: "weekly" | "monthly";
  }> = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/calculator", priority: 0.9, changeFrequency: "monthly" },
    { path: "/scenarios", priority: 0.9, changeFrequency: "monthly" },
    { path: "/cap-table", priority: 0.8, changeFrequency: "monthly" },
    { path: "/rounds", priority: 0.8, changeFrequency: "monthly" },
    { path: "/forecast", priority: 0.8, changeFrequency: "monthly" },
    { path: "/returns", priority: 0.7, changeFrequency: "monthly" },
    { path: "/sensitivity", priority: 0.7, changeFrequency: "monthly" },
    { path: "/reports", priority: 0.7, changeFrequency: "monthly" },
    { path: "/guide", priority: 0.6, changeFrequency: "monthly" },
  ];
  return routes.map((route) => ({
    url: `${site.url}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
