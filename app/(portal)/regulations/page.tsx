import { prisma } from "@/lib/prisma";
import Header from "@/components/layout/Header";
import RegulationList from "./RegulationList";

export const dynamic = 'force-dynamic';

export default async function RegulationsPage() {
  const categories = await prisma.regulationCategory.findMany({
    orderBy: { order: "asc" },
    include: { regulations: { orderBy: { order: "asc" } } },
  });

  return (
    <>
      <Header title="規程" />
      <main className="flex-1 pt-6 px-6 pb-0 overflow-hidden flex flex-col min-h-0">
        <RegulationList
          initialCategories={categories.map((c) => ({
            id: c.id,
            name: c.name,
            order: c.order,
            regulations: c.regulations.map((r) => ({
              id: r.id,
              name: r.name,
              fileName: r.fileName,
              url: r.url,
              size: r.size,
              createdAt: r.createdAt.toISOString(),
              uploadedBy: r.uploadedBy,
              order: r.order,
            })),
          }))}
        />
      </main>
    </>
  );
}
