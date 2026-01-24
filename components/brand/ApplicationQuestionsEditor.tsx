import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Icon } from "@iconify/react";
import { ApplicationQuestion, ApplicationQuestionType } from "@/types/applicationQuestions";
import { v4 as uuidv4 } from "uuid";
import { cn } from "@/lib/utils";

interface ApplicationQuestionsEditorProps {
  questions: ApplicationQuestion[];
  onChange: (questions: ApplicationQuestion[]) => void;
  maxQuestions?: number;
}

const questionTypes: { type: ApplicationQuestionType; icon: string; label: string }[] = [
  { type: "text", icon: "material-symbols:text-fields-rounded", label: "Text" },
  { type: "dropdown", icon: "material-symbols:arrow-drop-down-circle-outline-rounded", label: "Dropdown" },
  { type: "video", icon: "material-symbols:videocam-outline-rounded", label: "Video" },
  { type: "image", icon: "material-symbols:image-outline-rounded", label: "Image" },
];

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

  const getTypeInfo = (type: ApplicationQuestionType) => {
    return questionTypes.find(t => t.type === type);
  };

  return (
    <div className="space-y-3">
      {/* Existing Questions */}
      {questions.length > 0 && (
        <div className="space-y-2">
          {questions.map((question, index) => {
            const typeInfo = getTypeInfo(question.type);
            return (
              <div
                key={question.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 group"
              >
                <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                  <Icon icon={typeInfo?.icon || "material-symbols:help-outline"} className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-inter tracking-[-0.5px] break-words">
                    {question.label}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                      {typeInfo?.label}
                    </span>
                    {question.required && (
                      <span className="text-xs text-primary font-inter tracking-[-0.3px]">
                        Required
                      </span>
                    )}
                    {question.type === "dropdown" && question.options && (
                      <span className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                        · {question.options.length} options
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                  onClick={() => removeQuestion(question.id)}
                >
                  <Icon icon="material-symbols:close-rounded" className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add New Question Form */}
      {questions.length < maxQuestions && (
        <div className="space-y-3 p-4 rounded-xl border border-border/50 bg-muted/20">
          {/* Question Type Selector */}
          <div className="grid grid-cols-4 gap-2">
            {questionTypes.map(({ type, icon, label }) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setNewQuestionType(type);
                  if (type !== "dropdown") {
                    setNewDropdownOptions([]);
                  }
                }}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-3 rounded-lg transition-all",
                  newQuestionType === type
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <Icon icon={icon} className="w-5 h-5" />
                <span className="text-xs font-medium font-inter tracking-[-0.3px]">
                  {label}
                </span>
              </button>
            ))}
          </div>

          {/* Question Label */}
          <Input
            value={newQuestionLabel}
            onChange={(e) => setNewQuestionLabel(e.target.value)}
            placeholder="Enter your question..."
            className="h-10 !bg-transparent border border-border/50 font-inter tracking-[-0.5px]"
          />

          {/* Dropdown Options (only for dropdown type) */}
          {newQuestionType === "dropdown" && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                Options (minimum 2)
              </Label>

              {newDropdownOptions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {newDropdownOptions.map((option, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-inter tracking-[-0.3px]"
                    >
                      {option}
                      <button
                        type="button"
                        onClick={() => removeDropdownOption(option)}
                        className="hover:text-destructive"
                      >
                        <Icon icon="material-symbols:close-rounded" className="w-3 h-3" />
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
                  className="h-10 !bg-transparent border border-border/50 font-inter tracking-[-0.5px] flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addDropdownOption();
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={!newOptionInput.trim()}
                  onClick={addDropdownOption}
                  className="h-10 w-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                >
                  <Icon icon="material-symbols:add-rounded" className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Required Toggle + Add Button Row */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <Switch
                checked={newQuestionRequired}
                onCheckedChange={setNewQuestionRequired}
                className="scale-90"
              />
              <Label className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                Required
              </Label>
            </div>

            <button
              type="button"
              disabled={
                !newQuestionLabel.trim() ||
                (newQuestionType === "dropdown" && newDropdownOptions.length < 2)
              }
              onClick={addQuestion}
              className="h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium font-inter tracking-[-0.5px] transition-colors"
            >
              <Icon icon="material-symbols:add-rounded" className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>
      )}

      {questions.length >= maxQuestions && (
        <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px] text-center py-2">
          Maximum {maxQuestions} questions reached
        </p>
      )}
    </div>
  );
}
