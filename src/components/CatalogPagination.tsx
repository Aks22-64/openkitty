"use client";

export const CATALOG_PAGE_SIZE = 48;

export default function CatalogPagination({ page, total, onPageChange }: {
  page: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));
  if (pages <= 1) return null;
  return (
    <nav aria-label="Catalog pages" className="flex items-center justify-center gap-4 py-4 text-sm text-zinc-300">
      <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}
        className="rounded-lg border border-zinc-700 px-4 py-2 disabled:opacity-40 hover:border-white">
        Previous page
      </button>
      <span aria-live="polite">Page {page} of {pages}</span>
      <button type="button" disabled={page >= pages} onClick={() => onPageChange(page + 1)}
        className="rounded-lg border border-zinc-700 px-4 py-2 disabled:opacity-40 hover:border-white">
        Next page
      </button>
    </nav>
  );
}
