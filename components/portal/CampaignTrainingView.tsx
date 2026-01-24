import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  GraduationCap,
  CheckCircle2,
  Play,
  ChevronRight,
  Video,
  HelpCircle,
  Loader2,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
}

interface TrainingModule {
  id: string;
  title: string;
  content: string;
  video_url: string | null;
  quiz: QuizQuestion[] | null;
  order_index: number;
  required: boolean;
}

interface TrainingCompletion {
  module_id: string;
  completed_at: string;
  quiz_score: number | null;
}

interface CampaignTrainingViewProps {
  blueprintId: string;
  modules: TrainingModule[];
  onTrainingComplete?: () => void;
}

function VideoEmbed({ url }: { url: string }) {
  // Convert YouTube and Vimeo URLs to embeddable format
  const getEmbedUrl = (url: string): string | null => {
    // YouTube
    const youtubeMatch = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/
    );
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    // If it's already an embed URL or direct video, return as-is
    if (url.includes("embed") || url.endsWith(".mp4")) {
      return url;
    }

    return null;
  };

  const embedUrl = getEmbedUrl(url);

  if (!embedUrl) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-primary hover:underline"
      >
        <Video className="h-4 w-4" />
        Watch Video
      </a>
    );
  }

  return (
    <div className="aspect-video rounded-lg overflow-hidden bg-muted">
      <iframe
        src={embedUrl}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

interface ModuleDialogProps {
  module: TrainingModule;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (quizScore?: number) => Promise<void>;
  isCompleted: boolean;
}

function ModuleDialog({
  module,
  open,
  onOpenChange,
  onComplete,
  isCompleted,
}: ModuleDialogProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [completing, setCompleting] = useState(false);

  const hasQuiz = module.quiz && module.quiz.length > 0;
  const currentQuestion = module.quiz?.[currentQuestionIndex];

  const handleStartQuiz = () => {
    setShowQuiz(true);
    setCurrentQuestionIndex(0);
    setSelectedAnswers([]);
    setQuizSubmitted(false);
  };

  const handleSelectAnswer = (index: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = index;
    setSelectedAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < (module.quiz?.length ?? 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!module.quiz) return;

    setCompleting(true);
    const correctCount = module.quiz.reduce((count, q, index) => {
      return count + (selectedAnswers[index] === q.correct ? 1 : 0);
    }, 0);
    const score = Math.round((correctCount / module.quiz.length) * 100);

    await onComplete(score);
    setQuizSubmitted(true);
    setCompleting(false);
  };

  const handleCompleteWithoutQuiz = async () => {
    setCompleting(true);
    await onComplete();
    setCompleting(false);
    onOpenChange(false);
  };

  const getQuizResult = () => {
    if (!module.quiz) return null;
    const correctCount = module.quiz.reduce((count, q, index) => {
      return count + (selectedAnswers[index] === q.correct ? 1 : 0);
    }, 0);
    return { correct: correctCount, total: module.quiz.length };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            {module.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!showQuiz ? (
            <>
              {/* Video */}
              {module.video_url && (
                <div>
                  <VideoEmbed url={module.video_url} />
                </div>
              )}

              {/* Content */}
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap">{module.content}</div>
              </div>

              {/* Actions */}
              <DialogFooter>
                {hasQuiz && !isCompleted ? (
                  <Button onClick={handleStartQuiz}>
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Start Quiz
                  </Button>
                ) : !isCompleted ? (
                  <Button onClick={handleCompleteWithoutQuiz} disabled={completing}>
                    {completing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark Complete
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Close
                  </Button>
                )}
              </DialogFooter>
            </>
          ) : (
            <>
              {/* Quiz */}
              {!quizSubmitted ? (
                <>
                  <div className="text-sm text-muted-foreground">
                    Question {currentQuestionIndex + 1} of {module.quiz?.length}
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">
                      {currentQuestion?.question}
                    </h3>

                    <div className="space-y-2">
                      {currentQuestion?.options.map((option, index) => (
                        <button
                          key={index}
                          onClick={() => handleSelectAnswer(index)}
                          className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                            selectedAnswers[currentQuestionIndex] === index
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>

                  <DialogFooter>
                    {currentQuestionIndex < (module.quiz?.length ?? 0) - 1 ? (
                      <Button
                        onClick={handleNextQuestion}
                        disabled={
                          selectedAnswers[currentQuestionIndex] === undefined
                        }
                      >
                        Next Question
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSubmitQuiz}
                        disabled={
                          selectedAnswers[currentQuestionIndex] === undefined ||
                          completing
                        }
                      >
                        {completing && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Submit Quiz
                      </Button>
                    )}
                  </DialogFooter>
                </>
              ) : (
                <>
                  {/* Quiz Results */}
                  <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-green-500/10">
                      <CheckCircle2 className="h-10 w-10 text-green-500" />
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold">Quiz Complete!</h3>
                      <p className="text-muted-foreground mt-1">
                        You scored {getQuizResult()?.correct} out of{" "}
                        {getQuizResult()?.total} correct
                      </p>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>Continue</Button>
                  </DialogFooter>
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CampaignTrainingView({
  blueprintId,
  modules,
  onTrainingComplete,
}: CampaignTrainingViewProps) {
  const [completions, setCompletions] = useState<TrainingCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<TrainingModule | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const sortedModules = [...modules].sort((a, b) => a.order_index - b.order_index);
  const requiredModules = sortedModules.filter((m) => m.required);
  const completedIds = new Set(completions.map((c) => c.module_id));
  const requiredCompletedCount = requiredModules.filter((m) =>
    completedIds.has(m.id)
  ).length;
  const allRequiredComplete = requiredCompletedCount === requiredModules.length;
  const progressPercent =
    requiredModules.length > 0
      ? (requiredCompletedCount / requiredModules.length) * 100
      : 100;

  useEffect(() => {
    fetchCompletions();
  }, [blueprintId]);

  useEffect(() => {
    if (allRequiredComplete && onTrainingComplete) {
      onTrainingComplete();
    }
  }, [allRequiredComplete, onTrainingComplete]);

  const fetchCompletions = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data, error } = await supabase
      .from("blueprint_training_completions")
      .select("module_id, completed_at, quiz_score")
      .eq("user_id", user.user.id)
      .eq("blueprint_id", blueprintId);

    if (!error && data) {
      setCompletions(data);
    }
    setLoading(false);
  };

  const handleComplete = async (moduleId: string, quizScore?: number) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { error } = await supabase
      .from("blueprint_training_completions")
      .upsert({
        user_id: user.user.id,
        blueprint_id: blueprintId,
        module_id: moduleId,
        quiz_score: quizScore ?? null,
      });

    if (error) {
      toast.error("Failed to save progress");
      return;
    }

    setCompletions((prev) => [
      ...prev.filter((c) => c.module_id !== moduleId),
      {
        module_id: moduleId,
        completed_at: new Date().toISOString(),
        quiz_score: quizScore ?? null,
      },
    ]);

    toast.success("Module completed!");
  };

  const openModule = (module: TrainingModule) => {
    setSelectedModule(module);
    setDialogOpen(true);
  };

  if (loading) {
    return null;
  }

  if (modules.length === 0) {
    return null;
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold tracking-[-0.5px]">Training Modules</h3>
          </div>
          {requiredModules.length > 0 && (
            <Badge variant={allRequiredComplete ? "default" : "secondary"} className="gap-1">
              {allRequiredComplete ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              {requiredCompletedCount}/{requiredModules.length} complete
            </Badge>
          )}
        </div>

        {/* Progress bar */}
        {requiredModules.length > 0 && !allRequiredComplete && (
          <div className="space-y-1.5">
            <Progress value={progressPercent} className="h-1.5" />
            <p className="text-xs text-amber-600">
              Complete all required modules to submit content
            </p>
          </div>
        )}

        {/* Modules Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedModules.map((module) => {
            const isCompleted = completedIds.has(module.id);
            const hasVideo = !!module.video_url;
            const hasQuiz = module.quiz && module.quiz.length > 0;

            return (
              <button
                key={module.id}
                onClick={() => openModule(module)}
                className={cn(
                  "group relative text-left rounded-lg overflow-hidden border transition-colors",
                  isCompleted
                    ? "bg-emerald-500/5 border-emerald-500/30"
                    : "bg-card border-border hover:border-primary/50"
                )}
              >
                {/* Visual Header */}
                <div className="relative h-20 bg-muted/50 flex items-center justify-center">
                  {hasVideo ? (
                    <div className="relative">
                      <Video className="h-8 w-8 text-muted-foreground/50" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-5 h-5 rounded-full bg-foreground/10 flex items-center justify-center">
                          <Play className="h-2.5 w-2.5 text-foreground ml-0.5" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                  )}

                  {/* Completion badge overlay */}
                  {isCompleted && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    </div>
                  )}

                  {/* Required badge overlay */}
                  {module.required && !isCompleted && (
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-0">
                        Required
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    {hasVideo && (
                      <span className="text-[10px] text-muted-foreground">Video</span>
                    )}
                    {hasVideo && hasQuiz && (
                      <span className="text-muted-foreground/50">·</span>
                    )}
                    {hasQuiz && (
                      <span className="text-[10px] text-muted-foreground">Quiz</span>
                    )}
                  </div>
                  <h4 className="font-medium text-sm tracking-[-0.3px] line-clamp-2">
                    {module.title}
                  </h4>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Module Dialog */}
      {selectedModule && (
        <ModuleDialog
          module={selectedModule}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onComplete={(quizScore) => handleComplete(selectedModule.id, quizScore)}
          isCompleted={completedIds.has(selectedModule.id)}
        />
      )}
    </>
  );
}
