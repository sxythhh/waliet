import { useState, useCallback } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ExpandableCard, AddCardButton } from "./ExpandableCard";
import { DraggableItem } from "./DraggableItem";
import { cn } from "@/lib/utils";
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

  const [expandedWorkId, setExpandedWorkId] = useState<string | null>(null);
  const [expandedEduId, setExpandedEduId] = useState<string | null>(null);
  const [expandedCertId, setExpandedCertId] = useState<string | null>(null);

  const [editingWork, setEditingWork] = useState<WorkExperience | null>(null);
  const [editingEdu, setEditingEdu] = useState<Education | null>(null);
  const [editingCert, setEditingCert] = useState<Certification | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Work Experience handlers
  const handleWorkDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = workExperience.findIndex((w) => w.id === active.id);
      const newIndex = workExperience.findIndex((w) => w.id === over.id);
      onWorkExperienceChange(arrayMove(workExperience, oldIndex, newIndex));
    }
  }, [workExperience, onWorkExperienceChange]);

  const handleSaveWork = (item: WorkExperience) => {
    const existing = workExperience.find((w) => w.id === item.id);
    if (existing) {
      onWorkExperienceChange(workExperience.map((w) => (w.id === item.id ? item : w)));
    } else {
      onWorkExperienceChange([...workExperience, item]);
    }
    setExpandedWorkId(null);
    setEditingWork(null);
  };

  const handleDeleteWork = (id: string) => {
    onWorkExperienceChange(workExperience.filter((w) => w.id !== id));
    setExpandedWorkId(null);
  };

  // Education handlers
  const handleEduDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = education.findIndex((e) => e.id === active.id);
      const newIndex = education.findIndex((e) => e.id === over.id);
      onEducationChange(arrayMove(education, oldIndex, newIndex));
    }
  }, [education, onEducationChange]);

  const handleSaveEdu = (item: Education) => {
    const existing = education.find((e) => e.id === item.id);
    if (existing) {
      onEducationChange(education.map((e) => (e.id === item.id ? item : e)));
    } else {
      onEducationChange([...education, item]);
    }
    setExpandedEduId(null);
    setEditingEdu(null);
  };

  const handleDeleteEdu = (id: string) => {
    onEducationChange(education.filter((e) => e.id !== id));
    setExpandedEduId(null);
  };

  // Certification handlers
  const handleCertDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = certifications.findIndex((c) => c.id === active.id);
      const newIndex = certifications.findIndex((c) => c.id === over.id);
      onCertificationsChange(arrayMove(certifications, oldIndex, newIndex));
    }
  }, [certifications, onCertificationsChange]);

  const handleSaveCert = (item: Certification) => {
    const existing = certifications.find((c) => c.id === item.id);
    if (existing) {
      onCertificationsChange(certifications.map((c) => (c.id === item.id ? item : c)));
    } else {
      onCertificationsChange([...certifications, item]);
    }
    setExpandedCertId(null);
    setEditingCert(null);
  };

  const handleDeleteCert = (id: string) => {
    onCertificationsChange(certifications.filter((c) => c.id !== id));
    setExpandedCertId(null);
  };

  const formatDateRange = (startDate: string, endDate?: string, current?: boolean) => {
    const start = startDate ? new Date(startDate + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "";
    if (current) return `${start} - Present`;
    const end = endDate ? new Date(endDate + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "";
    return `${start} - ${end}`;
  };

  return (
    <div className="space-y-6">
      {/* Work Experience */}
      <Collapsible open={workOpen} onOpenChange={setWorkOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2.5">
              <span className="font-medium text-sm tracking-[-0.5px]">Work Experience</span>
              {workExperience.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-muted text-muted-foreground">
                  {workExperience.length}
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{workOpen ? "Hide" : "Show"}</span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-3">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleWorkDragEnd}>
            <SortableContext items={workExperience.map((w) => w.id)} strategy={verticalListSortingStrategy}>
              {workExperience.map((item) => (
                <DraggableItem key={item.id} id={item.id}>
                  {({ dragHandleProps, isDragging }) => (
                    <WorkExperienceCard
                      item={item}
                      isExpanded={expandedWorkId === item.id}
                      onToggle={() => setExpandedWorkId(expandedWorkId === item.id ? null : item.id)}
                      onSave={handleSaveWork}
                      onDelete={() => handleDeleteWork(item.id)}
                      dragHandleProps={dragHandleProps}
                      formatDateRange={formatDateRange}
                    />
                  )}
                </DraggableItem>
              ))}
            </SortableContext>
          </DndContext>

          {editingWork ? (
            <WorkExperienceCard
              item={editingWork}
              isExpanded={true}
              onToggle={() => setEditingWork(null)}
              onSave={handleSaveWork}
              onDelete={() => setEditingWork(null)}
              showDragHandle={false}
              formatDateRange={formatDateRange}
            />
          ) : (
            <AddCardButton
              onClick={() => setEditingWork({
                id: crypto.randomUUID(),
                company: "",
                role: "",
                description: "",
                startDate: "",
                current: false,
                highlights: [],
              })}
              label="Add Work Experience"
              icon={<Plus className="h-4 w-4" />}
            />
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Education */}
      <Collapsible open={eduOpen} onOpenChange={setEduOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2.5">
              <span className="font-medium text-sm tracking-[-0.5px]">Education</span>
              {education.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-muted text-muted-foreground">
                  {education.length}
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{eduOpen ? "Hide" : "Show"}</span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-3">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleEduDragEnd}>
            <SortableContext items={education.map((e) => e.id)} strategy={verticalListSortingStrategy}>
              {education.map((item) => (
                <DraggableItem key={item.id} id={item.id}>
                  {({ dragHandleProps, isDragging }) => (
                    <EducationCard
                      item={item}
                      isExpanded={expandedEduId === item.id}
                      onToggle={() => setExpandedEduId(expandedEduId === item.id ? null : item.id)}
                      onSave={handleSaveEdu}
                      onDelete={() => handleDeleteEdu(item.id)}
                      dragHandleProps={dragHandleProps}
                      formatDateRange={formatDateRange}
                    />
                  )}
                </DraggableItem>
              ))}
            </SortableContext>
          </DndContext>

          {editingEdu ? (
            <EducationCard
              item={editingEdu}
              isExpanded={true}
              onToggle={() => setEditingEdu(null)}
              onSave={handleSaveEdu}
              onDelete={() => setEditingEdu(null)}
              showDragHandle={false}
              formatDateRange={formatDateRange}
            />
          ) : (
            <AddCardButton
              onClick={() => setEditingEdu({
                id: crypto.randomUUID(),
                institution: "",
                degree: "",
                field: "",
                startDate: "",
                current: false,
              })}
              label="Add Education"
              icon={<Plus className="h-4 w-4" />}
            />
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Certifications */}
      <Collapsible open={certOpen} onOpenChange={setCertOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2.5">
              <span className="font-medium text-sm tracking-[-0.5px]">Certifications</span>
              {certifications.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-muted text-muted-foreground">
                  {certifications.length}
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{certOpen ? "Hide" : "Show"}</span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-3">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCertDragEnd}>
            <SortableContext items={certifications.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              {certifications.map((item) => (
                <DraggableItem key={item.id} id={item.id}>
                  {({ dragHandleProps, isDragging }) => (
                    <CertificationCard
                      item={item}
                      isExpanded={expandedCertId === item.id}
                      onToggle={() => setExpandedCertId(expandedCertId === item.id ? null : item.id)}
                      onSave={handleSaveCert}
                      onDelete={() => handleDeleteCert(item.id)}
                      dragHandleProps={dragHandleProps}
                    />
                  )}
                </DraggableItem>
              ))}
            </SortableContext>
          </DndContext>

          {editingCert ? (
            <CertificationCard
              item={editingCert}
              isExpanded={true}
              onToggle={() => setEditingCert(null)}
              onSave={handleSaveCert}
              onDelete={() => setEditingCert(null)}
              showDragHandle={false}
            />
          ) : (
            <AddCardButton
              onClick={() => setEditingCert({
                id: crypto.randomUUID(),
                name: "",
                issuer: "",
                date: "",
              })}
              label="Add Certification"
              icon={<Plus className="h-4 w-4" />}
            />
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// Work Experience Card
function WorkExperienceCard({
  item,
  isExpanded,
  onToggle,
  onSave,
  onDelete,
  dragHandleProps,
  showDragHandle = true,
  formatDateRange,
}: {
  item: WorkExperience;
  isExpanded: boolean;
  onToggle: () => void;
  onSave: (item: WorkExperience) => void;
  onDelete: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  showDragHandle?: boolean;
  formatDateRange: (start: string, end?: string, current?: boolean) => string;
}) {
  const [form, setForm] = useState<WorkExperience>(item);

  if (item.id !== form.id) {
    setForm(item);
  }

  return (
    <ExpandableCard
      id={item.id}
      isExpanded={isExpanded}
      onToggle={onToggle}
      onSave={() => onSave(form)}
      onDelete={onDelete}
      dragHandleProps={dragHandleProps}
      showDragHandle={showDragHandle}
      preview={
        <div className="min-w-0">
          <p className="font-medium text-sm tracking-[-0.5px] truncate">
            {item.role || "New Position"}
          </p>
          <p className="text-sm text-muted-foreground truncate">
            {item.company || "Company name"}
          </p>
          {item.startDate && (
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              {formatDateRange(item.startDate, item.endDate, item.current)}
            </p>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Role / Title</Label>
            <Input
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              placeholder="e.g., Content Creator"
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Company</Label>
            <Input
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Company name"
              className="h-9"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Description</Label>
          <Textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What did you do in this role?"
            rows={3}
            className="resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Start Date</Label>
            <Input
              type="month"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">End Date</Label>
            <Input
              type="month"
              value={form.endDate || ""}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              disabled={form.current}
              className="h-9"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={form.current}
            onCheckedChange={(checked) => setForm({ ...form, current: checked, endDate: checked ? undefined : form.endDate })}
          />
          <Label className="text-sm text-muted-foreground">I currently work here</Label>
        </div>
      </div>
    </ExpandableCard>
  );
}

// Education Card
function EducationCard({
  item,
  isExpanded,
  onToggle,
  onSave,
  onDelete,
  dragHandleProps,
  showDragHandle = true,
  formatDateRange,
}: {
  item: Education;
  isExpanded: boolean;
  onToggle: () => void;
  onSave: (item: Education) => void;
  onDelete: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  showDragHandle?: boolean;
  formatDateRange: (start: string, end?: string, current?: boolean) => string;
}) {
  const [form, setForm] = useState<Education>(item);

  if (item.id !== form.id) {
    setForm(item);
  }

  return (
    <ExpandableCard
      id={item.id}
      isExpanded={isExpanded}
      onToggle={onToggle}
      onSave={() => onSave(form)}
      onDelete={onDelete}
      dragHandleProps={dragHandleProps}
      showDragHandle={showDragHandle}
      preview={
        <div className="min-w-0">
          <p className="font-medium text-sm tracking-[-0.5px] truncate">
            {item.degree && item.field ? `${item.degree} in ${item.field}` : "New Education"}
          </p>
          <p className="text-sm text-muted-foreground truncate">
            {item.institution || "Institution name"}
          </p>
          {item.startDate && (
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              {formatDateRange(item.startDate, item.endDate, item.current)}
            </p>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Institution</Label>
          <Input
            value={form.institution}
            onChange={(e) => setForm({ ...form, institution: e.target.value })}
            placeholder="School or university"
            className="h-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Degree</Label>
            <Input
              value={form.degree}
              onChange={(e) => setForm({ ...form, degree: e.target.value })}
              placeholder="e.g., Bachelor's"
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Field of Study</Label>
            <Input
              value={form.field}
              onChange={(e) => setForm({ ...form, field: e.target.value })}
              placeholder="e.g., Marketing"
              className="h-9"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Start Date</Label>
            <Input
              type="month"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">End Date</Label>
            <Input
              type="month"
              value={form.endDate || ""}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              disabled={form.current}
              className="h-9"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={form.current}
            onCheckedChange={(checked) => setForm({ ...form, current: checked, endDate: checked ? undefined : form.endDate })}
          />
          <Label className="text-sm text-muted-foreground">Currently studying here</Label>
        </div>
      </div>
    </ExpandableCard>
  );
}

// Certification Card
function CertificationCard({
  item,
  isExpanded,
  onToggle,
  onSave,
  onDelete,
  dragHandleProps,
  showDragHandle = true,
}: {
  item: Certification;
  isExpanded: boolean;
  onToggle: () => void;
  onSave: (item: Certification) => void;
  onDelete: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  showDragHandle?: boolean;
}) {
  const [form, setForm] = useState<Certification>(item);

  if (item.id !== form.id) {
    setForm(item);
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  return (
    <ExpandableCard
      id={item.id}
      isExpanded={isExpanded}
      onToggle={onToggle}
      onSave={() => onSave(form)}
      onDelete={onDelete}
      dragHandleProps={dragHandleProps}
      showDragHandle={showDragHandle}
      preview={
        <div className="min-w-0">
          <p className="font-medium text-sm tracking-[-0.5px] truncate">
            {item.name || "New Certification"}
          </p>
          <p className="text-sm text-muted-foreground truncate">
            {item.issuer || "Issuing organization"}
          </p>
          {item.date && (
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              {formatDate(item.date)}
            </p>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Certification Name</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., Google Analytics Certified"
            className="h-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Issuing Organization</Label>
            <Input
              value={form.issuer}
              onChange={(e) => setForm({ ...form, issuer: e.target.value })}
              placeholder="e.g., Google"
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Date Issued</Label>
            <Input
              type="month"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="h-9"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Credential URL (optional)</Label>
          <Input
            type="url"
            value={form.url || ""}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="https://..."
            className="h-9"
          />
        </div>
      </div>
    </ExpandableCard>
  );
}
