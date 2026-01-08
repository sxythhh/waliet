import type { WorkExperience, Education, Certification } from "@/types/portfolio";

interface ResumeDisplayProps {
  workExperience: WorkExperience[];
  education: Education[];
  certifications: Certification[];
}

export function ResumeDisplay({ workExperience, education, certifications }: ResumeDisplayProps) {
  const formatDate = (date: string) => {
    if (!date) return "";
    const [year, month] = date.split("-");
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
  };

  return (
    <div className="space-y-6">
      {/* Work Experience */}
      {workExperience.length > 0 && (
        <div className="space-y-4">
          <span className="text-sm font-medium text-muted-foreground font-['Inter'] tracking-[-0.3px]">Work Experience</span>
          <div className="space-y-4 pl-6 border-l-2 border-muted">
            {workExperience.map((exp) => (
              <div key={exp.id} className="relative">
                <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full bg-primary" />
                <div className="space-y-1">
                  <h4 className="font-medium">{exp.role}</h4>
                  <p className="text-sm text-muted-foreground">{exp.company}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(exp.startDate)} - {exp.current ? "Present" : formatDate(exp.endDate || "")}
                  </p>
                  {exp.description && (
                    <p className="text-sm text-muted-foreground mt-2">{exp.description}</p>
                  )}
                  {exp.highlights.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {exp.highlights.map((highlight, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex gap-2">
                          <span className="text-primary">\u2022</span>
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {education.length > 0 && (
        <div className="space-y-4">
          <span className="text-sm font-medium text-muted-foreground font-['Inter'] tracking-[-0.3px]">Education</span>
          <div className="space-y-4 pl-6 border-l-2 border-muted">
            {education.map((edu) => (
              <div key={edu.id} className="relative">
                <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full bg-blue-500" />
                <div className="space-y-1">
                  <h4 className="font-medium">{edu.degree} in {edu.field}</h4>
                  <p className="text-sm text-muted-foreground">{edu.institution}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(edu.startDate)} - {edu.current ? "Present" : formatDate(edu.endDate || "")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {certifications.length > 0 && (
        <div className="space-y-4">
          <span className="text-sm font-medium text-muted-foreground font-['Inter'] tracking-[-0.3px]">Certifications</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {certifications.map((cert) => (
              <a
                key={cert.id}
                href={cert.url || undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors block"
              >
                <h4 className="font-medium text-sm font-['Inter'] tracking-[-0.3px]">{cert.name}</h4>
                <p className="text-xs text-muted-foreground font-['Inter']">{cert.issuer}</p>
                <p className="text-xs text-muted-foreground font-['Inter']">{formatDate(cert.date)}</p>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
