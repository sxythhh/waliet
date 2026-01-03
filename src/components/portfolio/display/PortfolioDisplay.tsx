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

const SECTION_TITLES: Record<PortfolioSectionType, string> = {
  resume: "Experience & Education",
  skills: "Skills",
  media: "Media Showcase",
  platforms: "Social Platforms",
  creator_info: "Creator Info",
  custom: "Custom Section",
};

export function PortfolioDisplay({ portfolio }: PortfolioDisplayProps) {
  const defaultOrder: PortfolioSectionType[] = ["resume", "skills", "media", "platforms", "creator_info"];
  const sectionOrder: PortfolioSectionType[] = portfolio.section_order.length > 0
    ? portfolio.section_order.filter((s): s is PortfolioSectionType => 
        ["resume", "skills", "media", "platforms", "creator_info", "custom"].includes(s)
      )
    : defaultOrder;

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
            <h2 className="text-base font-semibold text-foreground font-['Inter'] tracking-[-0.3px]">
              {SECTION_TITLES[sectionId]}
            </h2>
            {content}
          </section>
        );
      })}
    </div>
  );
}
