import AppExplorer from "@/components/AppExplorer";
export default function RecentPage() {
  return <AppExplorer title="Release dates" subtitle="Browse this catalog by original App Store release date." defaultSort="newest"
    notice="Growth and rising-star scores: Unavailable. A recent release date does not indicate growth, adoption or rank momentum." />;
}
