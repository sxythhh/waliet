import { useState } from "react";
import { Plus, Pencil, Trash2, Building2, GraduationCap, Award, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { WorkExperience, Education, Certification } from "@/types/portfolio";

interface ResumeSectionProps {
  workExperience: WorkExperience[];
  education: Education[];
  certifications: Certification[];
  onWorkExperienceChange: (value: WorkExperience[]) => void;
  onEducationChange: (value: Education[]) => void;
  onCertificationsChange: (value: Certification[]) => void;
}

export function ResumeSection({
  workExperience,
  education,
  certifications,
  onWorkExperienceChange,
  onEducationChange,
  onCertificationsChange,
}: ResumeSectionProps) {
  const [workOpen, setWorkOpen] = useState(true);
  const [eduOpen, setEduOpen] = useState(true);
  const [certOpen, setCertOpen] = useState(true);

  const [editingWork, setEditingWork] = useState<WorkExperience | null>(null);
  const [editingEdu, setEditingEdu] = useState<Education | null>(null);
  const [editingCert, setEditingCert] = useState<Certification | null>(null);

  // Work Experience handlers
  const handleSaveWork = (item: WorkExperience) => {
    const existing = workExperience.find((w) => w.id === item.id);
    if (existing) {
      onWorkExperienceChange(workExperience.map((w) => (w.id === item.id ? item : w)));
    } else {
      onWorkExperienceChange([...workExperience, item]);
    }
    setEditingWork(null);
  };

  const handleDeleteWork = (id: string) => {
    onWorkExperienceChange(workExperience.filter((w) => w.id !== id));
  };

  // Education handlers
  const handleSaveEdu = (item: Education) => {
    const existing = education.find((e) => e.id === item.id);
    if (existing) {
      onEducationChange(education.map((e) => (e.id === item.id ? item : e)));
    } else {
      onEducationChange([...education, item]);
    }
    setEditingEdu(null);
  };

  const handleDeleteEdu = (id: string) => {
    onEducationChange(education.filter((e) => e.id !== id));
  };

  // Certification handlers
  const handleSaveCert = (item: Certification) => {
    const existing = certifications.find((c) => c.id === item.id);
    if (existing) {
      onCertificationsChange(certifications.map((c) => (c.id === item.id ? item : c)));
    } else {
      onCertificationsChange([...certifications, item]);
    }
    setEditingCert(null);
  };

  const handleDeleteCert = (id: string) => {
    onCertificationsChange(certifications.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Work Experience */}
      <Collapsible open={workOpen} onOpenChange={setWorkOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Work Experience</span>
              <span className="text-xs text-muted-foreground">({workExperience.length})</span>
            </div>
            {workOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-2">
          {workExperience.map((item) => (
            <div key={item.id} className="flex items-start justify-between p-3 border border-border rounded-lg bg-background">
              <div>
                <p className="font-medium text-sm">{item.role}</p>
                <p className="text-sm text-muted-foreground">{item.company}</p>
                <p className="text-xs text-muted-foreground">
                  {item.startDate} - {item.current ? "Present" : item.endDate}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingWork(item)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteWork(item.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setEditingWork({ id: crypto.randomUUID(), company: "", role: "", description: "", startDate: "", current: false, highlights: [] })}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Work Experience
          </Button>
        </CollapsibleContent>
      </Collapsible>

      {/* Education */}
      <Collapsible open={eduOpen} onOpenChange={setEduOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Education</span>
              <span className="text-xs text-muted-foreground">({education.length})</span>
            </div>
            {eduOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-2">
          {education.map((item) => (
            <div key={item.id} className="flex items-start justify-between p-3 border border-border rounded-lg bg-background">
              <div>
                <p className="font-medium text-sm">{item.degree} in {item.field}</p>
                <p className="text-sm text-muted-foreground">{item.institution}</p>
                <p className="text-xs text-muted-foreground">
                  {item.startDate} - {item.current ? "Present" : item.endDate}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingEdu(item)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteEdu(item.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setEditingEdu({ id: crypto.randomUUID(), institution: "", degree: "", field: "", startDate: "", current: false })}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Education
          </Button>
        </CollapsibleContent>
      </Collapsible>

      {/* Certifications */}
      <Collapsible open={certOpen} onOpenChange={setCertOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Certifications</span>
              <span className="text-xs text-muted-foreground">({certifications.length})</span>
            </div>
            {certOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-2">
          {certifications.map((item) => (
            <div key={item.id} className="flex items-start justify-between p-3 border border-border rounded-lg bg-background">
              <div>
                <p className="font-medium text-sm">{item.name}</p>
                <p className="text-sm text-muted-foreground">{item.issuer}</p>
                <p className="text-xs text-muted-foreground">{item.date}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingCert(item)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteCert(item.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setEditingCert({ id: crypto.randomUUID(), name: "", issuer: "", date: "" })}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Certification
          </Button>
        </CollapsibleContent>
      </Collapsible>

      {/* Work Experience Dialog */}
      <WorkExperienceDialog
        item={editingWork}
        onSave={handleSaveWork}
        onClose={() => setEditingWork(null)}
      />

      {/* Education Dialog */}
      <EducationDialog
        item={editingEdu}
        onSave={handleSaveEdu}
        onClose={() => setEditingEdu(null)}
      />

      {/* Certification Dialog */}
      <CertificationDialog
        item={editingCert}
        onSave={handleSaveCert}
        onClose={() => setEditingCert(null)}
      />
    </div>
  );
}

// Work Experience Dialog
function WorkExperienceDialog({
  item,
  onSave,
  onClose,
}: {
  item: WorkExperience | null;
  onSave: (item: WorkExperience) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<WorkExperience | null>(null);

  // Update form when item changes
  if (item && !form) {
    setForm(item);
  }
  if (!item && form) {
    setForm(null);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form) {
      onSave(form);
      setForm(null);
    }
  };

  return (
    <Dialog open={!!item} onOpenChange={() => { setForm(null); onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{form?.company ? "Edit" : "Add"} Work Experience</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Company</Label>
            <Input
              value={form?.company || ""}
              onChange={(e) => setForm((prev) => prev ? { ...prev, company: e.target.value } : null)}
              placeholder="Company name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Input
              value={form?.role || ""}
              onChange={(e) => setForm((prev) => prev ? { ...prev, role: e.target.value } : null)}
              placeholder="Job title"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={form?.description || ""}
              onChange={(e) => setForm((prev) => prev ? { ...prev, description: e.target.value } : null)}
              placeholder="Describe your role and responsibilities"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="month"
                value={form?.startDate || ""}
                onChange={(e) => setForm((prev) => prev ? { ...prev, startDate: e.target.value } : null)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="month"
                value={form?.endDate || ""}
                onChange={(e) => setForm((prev) => prev ? { ...prev, endDate: e.target.value } : null)}
                disabled={form?.current}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form?.current || false}
              onCheckedChange={(checked) => setForm((prev) => prev ? { ...prev, current: checked, endDate: checked ? undefined : prev.endDate } : null)}
            />
            <Label>Currently working here</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setForm(null); onClose(); }}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Education Dialog
function EducationDialog({
  item,
  onSave,
  onClose,
}: {
  item: Education | null;
  onSave: (item: Education) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Education | null>(null);

  if (item && !form) {
    setForm(item);
  }
  if (!item && form) {
    setForm(null);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form) {
      onSave(form);
      setForm(null);
    }
  };

  return (
    <Dialog open={!!item} onOpenChange={() => { setForm(null); onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{form?.institution ? "Edit" : "Add"} Education</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Institution</Label>
            <Input
              value={form?.institution || ""}
              onChange={(e) => setForm((prev) => prev ? { ...prev, institution: e.target.value } : null)}
              placeholder="School or university"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Degree</Label>
              <Input
                value={form?.degree || ""}
                onChange={(e) => setForm((prev) => prev ? { ...prev, degree: e.target.value } : null)}
                placeholder="e.g., Bachelor's, Master's"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Field of Study</Label>
              <Input
                value={form?.field || ""}
                onChange={(e) => setForm((prev) => prev ? { ...prev, field: e.target.value } : null)}
                placeholder="e.g., Computer Science"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="month"
                value={form?.startDate || ""}
                onChange={(e) => setForm((prev) => prev ? { ...prev, startDate: e.target.value } : null)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="month"
                value={form?.endDate || ""}
                onChange={(e) => setForm((prev) => prev ? { ...prev, endDate: e.target.value } : null)}
                disabled={form?.current}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form?.current || false}
              onCheckedChange={(checked) => setForm((prev) => prev ? { ...prev, current: checked, endDate: checked ? undefined : prev.endDate } : null)}
            />
            <Label>Currently studying</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setForm(null); onClose(); }}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Certification Dialog
function CertificationDialog({
  item,
  onSave,
  onClose,
}: {
  item: Certification | null;
  onSave: (item: Certification) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Certification | null>(null);

  if (item && !form) {
    setForm(item);
  }
  if (!item && form) {
    setForm(null);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form) {
      onSave(form);
      setForm(null);
    }
  };

  return (
    <Dialog open={!!item} onOpenChange={() => { setForm(null); onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{form?.name ? "Edit" : "Add"} Certification</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Certification Name</Label>
            <Input
              value={form?.name || ""}
              onChange={(e) => setForm((prev) => prev ? { ...prev, name: e.target.value } : null)}
              placeholder="e.g., Google Analytics Certified"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Issuing Organization</Label>
            <Input
              value={form?.issuer || ""}
              onChange={(e) => setForm((prev) => prev ? { ...prev, issuer: e.target.value } : null)}
              placeholder="e.g., Google"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Date Issued</Label>
            <Input
              type="month"
              value={form?.date || ""}
              onChange={(e) => setForm((prev) => prev ? { ...prev, date: e.target.value } : null)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Credential URL (optional)</Label>
            <Input
              type="url"
              value={form?.url || ""}
              onChange={(e) => setForm((prev) => prev ? { ...prev, url: e.target.value } : null)}
              placeholder="https://..."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setForm(null); onClose(); }}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
