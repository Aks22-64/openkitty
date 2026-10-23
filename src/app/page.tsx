import AppExplorer from "@/components/AppExplorer";

export default function HomePage() {
  return (
    <AppExplorer
      catalog="all"
      title="Mobile App Market Intelligence"
      subtitle="Track estimated app revenue, downloads, winning ad campaigns, and rank velocity updated daily."
      defaultSort="revenue"
    />
  );
}
