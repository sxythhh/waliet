import PublicNavbar from "@/components/PublicNavbar";

export default function New() {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#0a0a0a]">
      <PublicNavbar />

      {/* Embedded Content */}
      <iframe
        src="https://join.virality.gg/new"
        className="flex-1 w-full border-0 mt-14"
        title="New"
      />
    </div>
  );
}
