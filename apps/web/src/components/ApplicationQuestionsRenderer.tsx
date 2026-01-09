import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Upload, X, Video, Image as ImageIcon, ExternalLink } from "lucide-react";
import { ApplicationQuestion, ApplicationAnswer, parseApplicationQuestions } from "@/types/applicationQuestions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ApplicationQuestionsRendererProps {
  questions: unknown; // Can be legacy string[] or new ApplicationQuestion[]
  answers: Record<string, ApplicationAnswer>;
  onChange: (answers: Record<string, ApplicationAnswer>) => void;
  campaignId?: string;
}

export function ApplicationQuestionsRenderer({
  questions: rawQuestions,
  answers,
  onChange,
  campaignId,
}: ApplicationQuestionsRendererProps) {
  const questions = parseApplicationQuestions(rawQuestions);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  if (questions.length === 0) return null;

  const updateAnswer = (questionId: string, value: string | string[], fileUrl?: string) => {
    onChange({
      ...answers,
      [questionId]: {
        questionId,
        value,
        ...(fileUrl && { fileUrl }),
      },
    });
  };

  const handleFileUpload = async (question: ApplicationQuestion, file: File) => {
    const isVideo = question.type === "video";
    const acceptedTypes = isVideo ? ["video/"] : ["image/"];
    
    if (!acceptedTypes.some(type => file.type.startsWith(type))) {
      toast.error(`Please upload ${isVideo ? "a video" : "an image"} file`);
      return;
    }

    const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024; // 100MB for video, 10MB for image
    if (file.size > maxSize) {
      toast.error(`File must be less than ${isVideo ? "100MB" : "10MB"}`);
      return;
    }

    setUploadingFor(question.id);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in");
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}/${campaignId || 'application'}/${question.id}/${Date.now()}.${fileExt}`;
      
      const bucket = isVideo ? 'campaign-videos' : 'campaign-images';
      
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      updateAnswer(question.id, file.name, publicUrl);
      toast.success(`${isVideo ? "Video" : "Image"} uploaded successfully`);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload file");
    } finally {
      setUploadingFor(null);
    }
  };

  const removeFile = (questionId: string) => {
    const newAnswers = { ...answers };
    delete newAnswers[questionId];
    onChange(newAnswers);
  };

  const renderQuestion = (question: ApplicationQuestion, index: number) => {
    const answer = answers[question.id];
    const isUploading = uploadingFor === question.id;

    return (
      <div key={question.id} className="space-y-2">
        <Label className="text-sm font-medium font-inter tracking-[-0.5px]">
          {question.label}
          {question.required && <span className="text-destructive ml-1">*</span>}
        </Label>

        {question.type === "text" && (
          <Textarea
            value={(answer?.value as string) || ""}
            onChange={(e) => updateAnswer(question.id, e.target.value)}
            placeholder="Your answer..."
            className="min-h-[100px] resize-none font-inter tracking-[-0.5px]"
          />
        )}

        {question.type === "dropdown" && question.options && (
          <Select
            value={(answer?.value as string) || ""}
            onValueChange={(value) => updateAnswer(question.id, value)}
          >
            <SelectTrigger className="font-inter tracking-[-0.5px]">
              <SelectValue placeholder="Select an option..." />
            </SelectTrigger>
            <SelectContent>
              {question.options.map((option, idx) => (
                <SelectItem key={idx} value={option} className="font-inter tracking-[-0.5px]">
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {(question.type === "video" || question.type === "image") && (
          <div className="space-y-3">
            <input
              ref={(el) => { fileInputRefs.current[question.id] = el; }}
              type="file"
              accept={question.type === "video" ? "video/*" : "image/*"}
              onChange={(e) => e.target.files?.[0] && handleFileUpload(question, e.target.files[0])}
              className="hidden"
            />

            {!answer?.fileUrl ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => fileInputRefs.current[question.id]?.click()}
                  disabled={isUploading}
                  className="w-full flex flex-col items-center justify-center gap-2 p-6 rounded-lg bg-muted/50 hover:bg-muted transition-colors group disabled:opacity-50"
                >
                  {isUploading ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  ) : question.type === "video" ? (
                    <Video className="h-8 w-8 text-muted-foreground group-hover:text-foreground" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground group-hover:text-foreground" />
                  )}
                  <span className="text-sm text-muted-foreground group-hover:text-foreground font-inter tracking-[-0.5px]">
                    {isUploading ? "Uploading..." : `Click to upload ${question.type}`}
                  </span>
                  <span className="text-xs text-muted-foreground/60 font-inter tracking-[-0.5px]">
                    {question.type === "video" ? "MP4, MOV up to 100MB" : "JPG, PNG up to 10MB"}
                  </span>
                </button>

                {question.type === "video" && (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-background px-2 text-muted-foreground font-inter tracking-[-0.5px]">
                          or paste URL
                        </span>
                      </div>
                    </div>
                    <div className="relative">
                      <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="url"
                        value={(answer?.value as string) || ""}
                        onChange={(e) => updateAnswer(question.id, e.target.value)}
                        placeholder="https://youtube.com/watch?v=..."
                        className="pl-10 bg-muted/50 border-0 font-inter tracking-[-0.5px]"
                      />
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="relative rounded-lg overflow-hidden bg-muted/50">
                {question.type === "video" ? (
                  <video
                    src={answer.fileUrl}
                    className="w-full max-h-48 object-contain"
                    controls
                  />
                ) : (
                  <img
                    src={answer.fileUrl}
                    alt="Uploaded"
                    className="w-full max-h-48 object-contain"
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeFile(question.id)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-background text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {questions.map((question, idx) => renderQuestion(question, idx))}
    </div>
  );
}

// Helper to validate answers
export function validateApplicationAnswers(
  questions: unknown,
  answers: Record<string, ApplicationAnswer>
): { valid: boolean; missingRequired: string[] } {
  const parsedQuestions = parseApplicationQuestions(questions);
  const missingRequired: string[] = [];

  for (const question of parsedQuestions) {
    if (question.required) {
      const answer = answers[question.id];
      const hasValue = answer && (
        (typeof answer.value === "string" && answer.value.trim()) ||
        answer.fileUrl
      );
      
      if (!hasValue) {
        missingRequired.push(question.label);
      }
    }
  }

  return {
    valid: missingRequired.length === 0,
    missingRequired,
  };
}
