import { AppItem } from "@/lib/types";

export default function DataSource({ app }: { app: AppItem }) {
  return <p className="text-xs leading-relaxed text-zinc-400">
    Source: <a href={app.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">{app.sourceName}</a>
    {" · US · iOS · "}{app.sourceMode === "snapshot" ? "Snapshot retrieved" : "Retrieved"}{" "}
    <time dateTime={app.sourceRetrievedAt}>{app.sourceRetrievedAt.replace("T", " ").replace(/\.\d{3}Z$/, " UTC")}</time>.
  </p>;
}
