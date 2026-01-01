import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  GripVertical,
  Trash2,
  Plus,
  Video,
  FileText,
  HelpCircle,
  X,
  Check,
  Pencil,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
}

export interface TrainingModule {
  id: string;
  title: string;
  content: string;
  video_url: string | null;
  quiz: QuizQuestion[] | null;
  order_index: number;
  required: boolean;
}

interface TrainingModuleEditorProps {
  modules: TrainingModule[];
  onChange: (modules: TrainingModule[]) => void;
}

interface ModuleDialogProps {
  module: TrainingModule | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (module: TrainingModule) => void;
}

function ModuleDialog({ module, open, onOpenChange, onSave }: ModuleDialogProps) {
  const [title, setTitle] = useState(module?.title || "");
  const [content, setContent] = useState(module?.content || "");
  const [videoUrl, setVideoUrl] = useState(module?.video_url || "");
  const [required, setRequired] = useState(module?.required ?? true);
  const [quiz, setQuiz] = useState<QuizQuestion[]>(module?.quiz || []);

  const handleSave = () => {
    onSave({
      id: module?.id || uuidv4(),
      title,
      content,
      video_url: videoUrl || null,
      quiz: quiz.length > 0 ? quiz : null,
      order_index: module?.order_index ?? 0,
      required,
    });
    onOpenChange(false);
  };

  const addQuizQuestion = () => {
    setQuiz([
      ...quiz,
      { question: "", options: ["", "", "", ""], correct: 0 },
    ]);
  };

  const updateQuizQuestion = (index: number, field: keyof QuizQuestion, value: any) => {
    const newQuiz = [...quiz];
    newQuiz[index] = { ...newQuiz[index], [field]: value };
    setQuiz(newQuiz);
  };

  const updateQuizOption = (qIndex: number, oIndex: number, value: string) => {
    const newQuiz = [...quiz];
    const newOptions = [...newQuiz[qIndex].options];
    newOptions[oIndex] = value;
    newQuiz[qIndex] = { ...newQuiz[qIndex], options: newOptions };
    setQuiz(newQuiz);
  };

  const removeQuizQuestion = (index: number) => {
    setQuiz(quiz.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {module ? "Edit Training Module" : "Add Training Module"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Module Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Brand Guidelines Overview"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Explain what creators need to know..."
              rows={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="videoUrl">Video URL (optional)</Label>
            <Input
              id="videoUrl"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Required Module</Label>
              <p className="text-xs text-muted-foreground">
                Creators must complete this before submitting
              </p>
            </div>
            <Switch checked={required} onCheckedChange={setRequired} />
          </div>

          {/* Quiz Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                Quiz Questions (optional)
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addQuizQuestion}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Question
              </Button>
            </div>

            {quiz.map((q, qIndex) => (
              <Card key={qIndex} className="bg-muted/30">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <Input
                        value={q.question}
                        onChange={(e) =>
                          updateQuizQuestion(qIndex, "question", e.target.value)
                        }
                        placeholder={`Question ${qIndex + 1}`}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive"
                      onClick={() => removeQuizQuestion(qIndex)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2 pl-4">
                    {q.options.map((option, oIndex) => (
                      <div key={oIndex} className="flex items-center gap-2">
                        <button
                          type="button"
                          className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            q.correct === oIndex
                              ? "border-green-500 bg-green-500 text-white"
                              : "border-muted-foreground/30 hover:border-green-500"
                          }`}
                          onClick={() => updateQuizQuestion(qIndex, "correct", oIndex)}
                        >
                          {q.correct === oIndex && <Check className="h-3 w-3" />}
                        </button>
                        <Input
                          value={option}
                          onChange={(e) =>
                            updateQuizOption(qIndex, oIndex, e.target.value)
                          }
                          placeholder={`Option ${oIndex + 1}`}
                          className="flex-1"
                        />
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground">
                      Click the circle to mark the correct answer
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            {module ? "Save Changes" : "Add Module"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TrainingModuleEditor({
  modules,
  onChange,
}: TrainingModuleEditorProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<TrainingModule | null>(null);

  const handleAddModule = () => {
    setEditingModule(null);
    setDialogOpen(true);
  };

  const handleEditModule = (module: TrainingModule) => {
    setEditingModule(module);
    setDialogOpen(true);
  };

  const handleSaveModule = (module: TrainingModule) => {
    if (editingModule) {
      // Update existing
      onChange(
        modules.map((m) => (m.id === module.id ? module : m))
      );
    } else {
      // Add new
      onChange([
        ...modules,
        { ...module, order_index: modules.length },
      ]);
    }
  };

  const handleDeleteModule = (id: string) => {
    onChange(
      modules
        .filter((m) => m.id !== id)
        .map((m, i) => ({ ...m, order_index: i }))
    );
  };

  const moveModule = (index: number, direction: "up" | "down") => {
    const newModules = [...modules];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= modules.length) return;

    [newModules[index], newModules[targetIndex]] = [
      newModules[targetIndex],
      newModules[index],
    ];
    onChange(newModules.map((m, i) => ({ ...m, order_index: i })));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Training Modules</h3>
          <p className="text-xs text-muted-foreground">
            Add training content creators must complete before submitting
          </p>
        </div>
        <Button onClick={handleAddModule} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Module
        </Button>
      </div>

      {modules.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <FileText className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground text-center">
              No training modules yet.
              <br />
              Add modules to help creators understand your brand.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {modules
            .sort((a, b) => a.order_index - b.order_index)
            .map((module, index) => (
              <Card key={module.id} className="group">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                        onClick={() => moveModule(index, "up")}
                        disabled={index === 0}
                      >
                        <GripVertical className="h-3 w-3 rotate-90" />
                      </button>
                      <button
                        type="button"
                        className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                        onClick={() => moveModule(index, "down")}
                        disabled={index === modules.length - 1}
                      >
                        <GripVertical className="h-3 w-3 -rotate-90" />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{module.title}</span>
                        {module.required && (
                          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            Required
                          </span>
                        )}
                        {module.video_url && (
                          <Video className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        {module.quiz && module.quiz.length > 0 && (
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {module.content.slice(0, 100)}
                        {module.content.length > 100 ? "..." : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditModule(module)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDeleteModule(module.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      <ModuleDialog
        module={editingModule}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveModule}
      />
    </div>
  );
}
