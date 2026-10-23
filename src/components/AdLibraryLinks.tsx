import { adLibraryLinks } from "@/lib/store-data.mjs";

export default function AdLibraryLinks({ name, developer, detailed = false }: { name: string; developer?: string; detailed?: boolean }) {
  return <div className="space-y-3">
    {detailed && <p className="text-sm text-zinc-400">Search for <strong className="text-white">{name || "an app"}</strong>{developer ? ` or its developer, ${developer}` : ""}. These links do not confirm that an app runs ads. Libraries may require sign-in and have regional or coverage limits.</p>}
    <div className="flex flex-wrap gap-2">
      {adLibraryLinks(name).map(library => <a key={library.name} href={library.url} target="_blank" rel="noopener noreferrer"
        title={library.description} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium hover:border-white">
        {library.name} ↗
      </a>)}
    </div>
    {detailed && <p className="text-xs text-zinc-400">Meta opens a name search. Enter the app or developer name in Google and TikTok. Spend, ad counts and performance are unavailable in OpenKitty.</p>}
  </div>;
}
