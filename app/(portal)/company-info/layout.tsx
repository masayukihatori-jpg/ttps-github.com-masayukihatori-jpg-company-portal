import SectionLayout from "@/components/layout/SectionLayout";
import CompanyInfoNav from "./CompanyInfoNav";

export default function CompanyInfoLayout({ children }: { children: React.ReactNode }) {
  return (
    <SectionLayout nav={<CompanyInfoNav />}>
      {children}
    </SectionLayout>
  );
}
