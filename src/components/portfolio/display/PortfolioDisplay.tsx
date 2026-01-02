import { Briefcase, Wrench, Video, Share2, User, Layout } from "lucide-react";
import type { CreatorPortfolio, PortfolioSectionType } from "@/types/portfolio";
import { ResumeDisplay } from "./ResumeDisplay";
import { SkillsDisplay } from "./SkillsDisplay";
import { MediaGallery } from "./MediaGallery";
import { PlatformLinks } from "./PlatformLinks";
import { CreatorStats } from "./CreatorStats";
import { CustomSectionDisplay } from "./CustomSectionDisplay";

interface PortfolioDisplayProps {
  portfolio: CreatorPortfolio;
}

const SECTION_ICONS: Record<PortfolioSectionType, React.ReactNode> = {
  resume: <Briefcase className="h-5 w-5" />,
  skills: <Wrench className="h-5 w-5" />,
  media: <Video className="h-5 w-5" />,
  platforms: <Share2 className="h-5 w-5" />,
  creator_info: <User className="h-5 w-5" />,
  custom: <Layout className="h-5 w-5" />,
};

const SECTION_TITLES: Record<PortfolioSectionType, string> = {
  resume: "Experience & Education",
  skills: "Skills",
  media: "Media Showcase",
  platforms: "Social Platforms",
  creator_info: "Creator Info",
  custom: "Custom Section",
};

export function PortfolioDisplay({ portfolio }: PortfolioDisplayProps) {
  const sectionOrder = portfolio.section_order.length > 0
    ? portfolio.section_order as PortfolioSectionType[]
    : ["resume", "skills", "media", "platforms", "creator_info"];

  const renderSection = (sectionId: PortfolioSectionType) => {
    switch (sectionId) {
      case "resume":
        if (
          portfolio.work_experience.length === 0 &&
          portfolio.education.length === 0 &&
          portfolio.certifications.length === 0
        ) {
          return null;
        }
        return (
          <ResumeDisplay
            workExperience={portfolio.work_experience}
            education={portfolio.education}
            certifications={portfolio.certifications}
          />
        );
      case "skills":
        if (portfolio.skills.length === 0) return null;
        return <SkillsDisplay skills={portfolio.skills} />;
      case "media":
        if (portfolio.featured_videos.length === 0 && portfolio.showcase_items.length === 0) {
          return null;
        }
        return (
          <MediaGallery
            featuredVideos={portfolio.featured_videos}
            showcaseItems={portfolio.showcase_items}
          />
        );
      case "platforms":
        if (portfolio.platforms.length === 0) return null;
        return <PlatformLinks platforms={portfolio.platforms} />;
      case "creator_info":
        if (
          portfolio.content_niches.length === 0 &&
          portfolio.equipment.length === 0 &&
          portfolio.languages.length === 0 &&
          !portfolio.availability &&
          !portfolio.rate_range
        ) {
          return null;
        }
        return (
          <CreatorStats
            contentNiches={portfolio.content_niches}
            equipment={portfolio.equipment}
            languages={portfolio.languages}
            availability={portfolio.availability}
            rateRange={portfolio.rate_range}
          />
        );
      case "custom":
        if (portfolio.custom_sections.length === 0) return null;
        return <CustomSectionDisplay sections={portfolio.custom_sections} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {sectionOrder.map((sectionId) => {
        const content = renderSection(sectionId);
        if (!content) return null;

        return (
          <section key={sectionId} className="space-y-4">
            <div className="flex items-center gap-2 text-foreground">
              {SECTION_ICONS[sectionId]}
              <h2 className="text-lg font-semibold">{SECTION_TITLES[sectionId]}</h2>
            </div>
            {content}
          </section>
        );
      })}
    </div>
  );
}
