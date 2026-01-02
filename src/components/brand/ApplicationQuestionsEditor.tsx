import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, GripVertical, Type, ChevronDown, Video, Image } from "lucide-react";
import { ApplicationQuestion, ApplicationQuestionType } from "@/types/applicationQuestions";
import { v4 as uuidv4 } from "uuid";

interface ApplicationQuestionsEditorProps {
  questions: ApplicationQuestion[];
  onChange: (questions: ApplicationQuestion[]) => void;
  maxQuestions?: number;
}

const questionTypeIcons: Record<ApplicationQuestionType, React.ReactNode> = {
  text: <Type className="h-4 w-4" />,
  dropdown: <ChevronDown className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  image: <Image className="h-4 w-4" />,
};

const questionTypeLabels: Record<ApplicationQuestionType, string> = {
  text: "Text Input",
  dropdown: "Dropdown",
  video: "Video Upload",
  image: "Image Upload",
};

export function ApplicationQuestionsEditor({
  questions,
  onChange,
  maxQuestions = 10,
}: ApplicationQuestionsEditorProps) {
  const [newQuestionLabel, setNewQuestionLabel] = useState("");
  const [newQuestionType, setNewQuestionType] = useState<ApplicationQuestionType>("text");
  const [newQuestionRequired, setNewQuestionRequired] = useState(false);
  const [newDropdownOptions, setNewDropdownOptions] = useState<string[]>([]);
  const [newOptionInput, setNewOptionInput] = useState("");

  const addQuestion = () => {
    if (!newQuestionLabel.trim()) return;
    if (newQuestionType === "dropdown" && newDropdownOptions.length < 2) return;

    const newQuestion: ApplicationQuestion = {
      id: uuidv4(),
      type: newQuestionType,
      label: newQuestionLabel.trim(),
      required: newQuestionRequired,
      ...(newQuestionType === "dropdown" && { options: newDropdownOptions }),
    };

    onChange([...questions, newQuestion]);
    
    // Reset form
    setNewQuestionLabel("");
    setNewQuestionType("text");
    setNewQuestionRequired(false);
    setNewDropdownOptions([]);
    setNewOptionInput("");
  };

  const removeQuestion = (id: string) => {
    onChange(questions.filter(q => q.id !== id));
  };

  const updateQuestion = (id: string, updates: Partial<ApplicationQuestion>) => {
    onChange(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const addDropdownOption = () => {
    if (!newOptionInput.trim()) return;
    if (!newDropdownOptions.includes(newOptionInput.trim())) {
      setNewDropdownOptions([...newDropdownOptions, newOptionInput.trim()]);
    }
    setNewOptionInput("");
  };

  const removeDropdownOption = (option: string) => {
    setNewDropdownOptions(newDropdownOptions.filter(o => o !== option));
  };

  return (
    <div className="space-y-4">
      {/* Existing Questions */}
      {questions.length > 0 && (
        <div className="space-y-2">
          {questions.map((question, index) => (
            <div
              key={question.id}
              className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 group"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-xs font-inter tracking-[-0.5px] shrink-0">
                  Q{index + 1}.
                </span>
                {questionTypeIcons[question.type]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground font-inter tracking-[-0.5px] break-words">
                  {question.label}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                    {questionTypeLabels[question.type]}
                  </span>
                  {question.required && (
                    <span className="text-xs text-primary font-inter tracking-[-0.5px]">
                      Required
                    </span>
                  )}
                  {question.type === "dropdown" && question.options && (
                    <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                      ({question.options.length} options)
                    </span>
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeQuestion(question.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Question Form */}
      {questions.length < maxQuestions && (
        <div className="space-y-3 p-4 rounded-lg border border-dashed border-border bg-muted/10">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-muted-foreground" />
            <Label className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
              Add Question
            </Label>
          </div>

          {/* Question Type */}
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(questionTypeLabels) as ApplicationQuestionType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setNewQuestionType(type);
                  if (type !== "dropdown") {
                    setNewDropdownOptions([]);
                  }
                }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-colors ${
                  newQuestionType === type
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-muted/20 text-muted-foreground hover:border-muted-foreground/50"
                }`}
              >
                {questionTypeIcons[type]}
                <span className="text-xs font-inter tracking-[-0.5px]">
                  {questionTypeLabels[type]}
                </span>
              </button>
            ))}
          </div>

          {/* Question Label */}
          <Input
            value={newQuestionLabel}
            onChange={(e) => setNewQuestionLabel(e.target.value)}
            placeholder="Enter your question..."
            className="h-10 bg-background border-border focus:ring-1 focus:ring-primary/30 font-inter tracking-[-0.5px]"
          />

          {/* Dropdown Options (only for dropdown type) */}
          {newQuestionType === "dropdown" && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                Options (minimum 2)
              </Label>
              
              {newDropdownOptions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {newDropdownOptions.map((option, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-inter tracking-[-0.5px]"
                    >
                      {option}
                      <button
                        type="button"
                        onClick={() => removeDropdownOption(option)}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              
              <div className="flex gap-2">
                <Input
                  value={newOptionInput}
                  onChange={(e) => setNewOptionInput(e.target.value)}
                  placeholder="Add option..."
                  className="h-9 bg-background border-border focus:ring-1 focus:ring-primary/30 font-inter tracking-[-0.5px] flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addDropdownOption();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-9 px-3"
                  disabled={!newOptionInput.trim()}
                  onClick={addDropdownOption}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Required Toggle */}
          <div className="flex items-center justify-between">
            <Label className="text-sm text-foreground font-inter tracking-[-0.5px]">
              Required
            </Label>
            <Switch
              checked={newQuestionRequired}
              onCheckedChange={setNewQuestionRequired}
            />
          </div>

          {/* Add Button */}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full font-inter tracking-[-0.5px]"
            disabled={
              !newQuestionLabel.trim() ||
              (newQuestionType === "dropdown" && newDropdownOptions.length < 2)
            }
            onClick={addQuestion}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
        </div>
      )}

      {questions.length >= maxQuestions && (
        <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] text-center">
          Maximum {maxQuestions} questions allowed
        </p>
      )}
    </div>
  );
}
