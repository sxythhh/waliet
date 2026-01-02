import { Building2, GraduationCap, Award, ExternalLink } from "lucide-react";
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
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  return (
    <div className="space-y-6">
      {/* Work Experience */}
      {workExperience.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span className="text-sm font-medium">Work Experience</span>
          </div>
          <div className="space-y-4 pl-6 border-l-2 border-border">
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
          <div className="flex items-center gap-2 text-muted-foreground">
            <GraduationCap className="h-4 w-4" />
            <span className="text-sm font-medium">Education</span>
          </div>
          <div className="space-y-4 pl-6 border-l-2 border-border">
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
          <div className="flex items-center gap-2 text-muted-foreground">
            <Award className="h-4 w-4" />
            <span className="text-sm font-medium">Certifications</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {certifications.map((cert) => (
              <div
                key={cert.id}
                className="p-3 border border-border rounded-lg bg-card"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-sm">{cert.name}</h4>
                    <p className="text-xs text-muted-foreground">{cert.issuer}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(cert.date)}</p>
                  </div>
                  {cert.url && (
                    <a
                      href={cert.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-muted rounded"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
