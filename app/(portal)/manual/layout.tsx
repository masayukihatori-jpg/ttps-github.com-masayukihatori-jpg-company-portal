import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SectionLayout from "@/components/layout/SectionLayout";
import ManualNav from "./ManualNav";

export default async function ManualLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  const categories = await prisma.manualCategory.findMany({
    orderBy: { order: "asc" },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: {
          pages: { orderBy: { order: "asc" }, select: { id: true, title: true } },
        },
      },
    },
  });

  return (
    <SectionLayout nav={<ManualNav categories={categories} />}>
      {children}
    </SectionLayout>
  );
}
