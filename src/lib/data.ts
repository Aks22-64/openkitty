import appsRaw from "@/data/apps.json";
import { AppItem } from "./types";

export const allApps = appsRaw as AppItem[];

export function getAppBySlug(slug: string): AppItem | undefined {
  return allApps.find(a => a.slug === slug || a.id === slug);
}
