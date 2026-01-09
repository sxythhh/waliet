import { useState } from "react";
import { Plus, Trash2, GripVertical, Type, List, Image, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CustomSection } from "@/types/portfolio";

interface CustomSectionEditorProps {
  customSections: CustomSection[];
  onChange: (sections: CustomSection[]) => void;
}

const SECTION_TYPES = [
  { id: "text", label: "Text", icon: Type, description: "Rich text content" },
  { id: "list", label: "List", icon: List, description: "Bullet list" },
  { id: "gallery", label: "Gallery", icon: Image, description: "Image gallery" },
  { id: "links", label: "Links", icon: Link, description: "Link collection" },
] as const;

export function CustomSectionEditor({ customSections, onChange }: CustomSectionEditorProps) {
  const [editingSection, setEditingSection] = useState<CustomSection | null>(null);

  const handleSave = (section: CustomSection) => {
    const existing = customSections.find((s) => s.id === section.id);
    if (existing) {
      onChange(customSections.map((s) => (s.id === section.id ? section : s)));
    } else {
      onChange([...customSections, { ...section, order: customSections.length }]);
    }
    setEditingSection(null);
  };

  const handleDelete = (id: string) => {
    onChange(customSections.filter((s) => s.id !== id));
  };

  const getIcon = (type: CustomSection["type"]) => {
    const Icon = SECTION_TYPES.find((t) => t.id === type)?.icon || Type;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      {customSections.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <p className="text-sm">No custom sections yet</p>
          <p className="text-xs mt-1">Add your own sections to personalize your portfolio</p>
        </div>
      ) : (
        <div className="space-y-3">
          {customSections.map((section) => (
            <div
              key={section.id}
              className="flex items-start gap-3 p-3 border border-border rounded-lg bg-background"
            >
              <div className="p-2 bg-muted rounded-lg cursor-grab">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {getIcon(section.type)}
                  <span className="font-medium text-sm">{section.title}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {typeof section.content === "string"
                    ? section.content.slice(0, 100)
                    : `${(section.content as string[]).length} items`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setEditingSection(section)}
                >
                  <Type className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => handleDelete(section.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setEditingSection({
          id: crypto.randomUUID(),
          title: "",
          type: "text",
          content: "",
          order: customSections.length,
        })}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Custom Section
      </Button>

      {/* Custom Section Dialog */}
      <CustomSectionDialog
        item={editingSection}
        onSave={handleSave}
        onClose={() => setEditingSection(null)}
      />
    </div>
  );
}

// Custom Section Dialog
function CustomSectionDialog({
  item,
  onSave,
  onClose,
}: {
  item: CustomSection | null;
  onSave: (item: CustomSection) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CustomSection | null>(null);
  const [listItems, setListItems] = useState<string[]>([]);

  if (item && !form) {
    setForm(item);
    if (item.type === "list" || item.type === "links" || item.type === "gallery") {
      setListItems(Array.isArray(item.content) ? item.content : []);
    }
  }
  if (!item && form) {
    setForm(null);
    setListItems([]);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form) {
      const content = (form.type === "list" || form.type === "links" || form.type === "gallery")
        ? listItems.filter((i) => i.trim())
        : form.content;
      onSave({ ...form, content });
      setForm(null);
      setListItems([]);
    }
  };

  const handleAddListItem = () => {
    setListItems([...listItems, ""]);
  };

  const handleUpdateListItem = (index: number, value: string) => {
    setListItems(listItems.map((item, i) => (i === index ? value : item)));
  };

  const handleRemoveListItem = (index: number) => {
    setListItems(listItems.filter((_, i) => i !== index));
  };

  const handleTypeChange = (type: CustomSection["type"]) => {
    setForm((prev) => prev ? { ...prev, type, content: type === "text" ? "" : [] } : null);
    if (type !== "text") {
      setListItems([]);
    }
  };

  return (
    <Dialog open={!!item} onOpenChange={() => { setForm(null); setListItems([]); onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{form?.title ? "Edit" : "Add"} Custom Section</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Section Title</Label>
            <Input
              value={form?.title || ""}
              onChange={(e) => setForm((prev) => prev ? { ...prev, title: e.target.value } : null)}
              placeholder="e.g., My Process, Testimonials"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Section Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {SECTION_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleTypeChange(type.id)}
                    className={`p-3 border rounded-lg text-left transition-colors ${
                      form?.type === type.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="font-medium text-sm">{type.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content based on type */}
          {form?.type === "text" && (
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={typeof form.content === "string" ? form.content : ""}
                onChange={(e) => setForm((prev) => prev ? { ...prev, content: e.target.value } : null)}
                placeholder="Write your content here..."
                rows={5}
              />
            </div>
          )}

          {(form?.type === "list" || form?.type === "links" || form?.type === "gallery") && (
            <div className="space-y-2">
              <Label>
                {form.type === "list" && "List Items"}
                {form.type === "links" && "Link URLs"}
                {form.type === "gallery" && "Image URLs"}
              </Label>
              <div className="space-y-2">
                {listItems.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => handleUpdateListItem(index, e.target.value)}
                      placeholder={
                        form.type === "list" ? "Item text" :
                        form.type === "links" ? "https://..." :
                        "Image URL"
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveListItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={handleAddListItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add {form.type === "list" ? "Item" : form.type === "links" ? "Link" : "Image"}
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setForm(null); setListItems([]); onClose(); }}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
