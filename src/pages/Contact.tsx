import PublicNavbar from "@/components/PublicNavbar";

export default function Contact() {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#0a0a0a]">
      <PublicNavbar />

      {/* Embedded Content */}
      <iframe
        src="https://join.virality.gg/contact"
        className="flex-1 w-full border-0 mt-14"
        title="Contact"
      />
    </div>
  );
}
