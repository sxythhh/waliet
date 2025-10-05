import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

export default function BrandLibrary() {
  const sidebar = useSidebar();
  const isMobile = useIsMobile();

  return (
    <div className="h-screen w-full bg-[#191919] flex flex-col">
      {/* Mobile Menu Button */}
      <div className="md:hidden p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => sidebar.setOpenMobile(true)}
          className="text-white/60 hover:text-white hover:bg-white/10"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </div>
      <iframe
        src="https://www.virality.cc/library"
        className="w-full flex-1 border-0"
        title="Brand Library"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
