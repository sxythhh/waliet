import { SEOHead } from "@/components/SEOHead";

const Support = () => {
  return (
    <div className="h-screen w-full">
      <SEOHead
        title="Support"
        description="Get help with Virality. Access our support resources, FAQs, and contact our team for assistance with your creator or brand account."
        keywords={['support', 'help', 'FAQ', 'customer service']}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Support', url: '/support' },
        ]}
      />
      <iframe 
        src="https://join.virality.gg/support" 
        className="w-full h-full border-0"
        title="Virality Support"
        loading="lazy"
      />
    </div>
  );
};

export default Support;
