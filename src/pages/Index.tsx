import PublicNavbar from "@/components/PublicNavbar";

export default function Index() {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#0a0a0a]">
      <PublicNavbar />

      {/* Embedded Content */}
      <div className="flex-1 pt-14">
        <iframe 
          src="https://join.virality.gg" 
          className="w-full h-full border-0" 
          title="Virality" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        />
      </div>
    </div>
  );
}
