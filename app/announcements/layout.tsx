import Sidebar from "@/components/layout/Sidebar";
import { EditModeProvider } from "@/contexts/EditModeContext";

export default function AnnouncementsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <EditModeProvider isAdmin={false}>
      <div className="flex h-screen">
        <Sidebar isAdmin={false} customSections={[]} />
        <div className="flex-1 ml-60 flex flex-col">
          {children}
        </div>
      </div>
    </EditModeProvider>
  );
}
