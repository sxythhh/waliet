import PublicNavbar from "@/components/PublicNavbar";
import { SEOHead } from "@/components/SEOHead";

export default function Contact() {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#0a0a0a]">
      <SEOHead
        title="Contact Us"
        description="Get in touch with the Virality team. We're here to help creators and brands connect for successful content partnerships."
        keywords={['contact', 'support', 'help', 'virality contact']}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Contact', url: '/contact' },
        ]}
      />
      <PublicNavbar />

      {/* Embedded Content */}
      <iframe
        src="https://join.virality.gg/contact"
        className="flex-1 w-full border-0 mt-14"
        title="Contact Virality"
        loading="lazy"
      />
    </div>
  );
}
