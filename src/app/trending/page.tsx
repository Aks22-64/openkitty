import AppExplorer from "@/components/AppExplorer";

export default function TrendingPage() {
  return (
    <AppExplorer
      catalog="trending"
      title="Trending & Breakout Apps"
      subtitle="Mobile apps gaining the fastest rank momentum, climbing daily store ranks with rapid adoption velocity."
      defaultSort="momentum"
    />
  );
}
