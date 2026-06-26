import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Header from "@/components/layout/Header";
import DepartmentManager from "./DepartmentManager";

export default async function DepartmentsPage() {


  const departments = await prisma.department.findMany({ orderBy: { order: "asc" } });

  return (
    <>
      <Header title="部門マスタ管理" />
      <main className="flex-1 p-6 max-w-2xl">
        <p className="text-sm text-gray-500 mb-5">
          マニュアルの管掌部門として選択できる部門一覧を管理します。
        </p>
        <DepartmentManager initial={departments} />
      </main>
    </>
  );
}
