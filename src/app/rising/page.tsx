import AppExplorer from "@/components/AppExplorer";

export default function RisingPage() {
  return (
    <AppExplorer
      catalog="rising"
      title="Rising Stars"
      subtitle="Newly surfaced mobile apps with rapid 24h category climbing velocity."
      defaultSort="momentum"
    />
  );
}
