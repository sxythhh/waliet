import { TrainingModuleEditor, TrainingModule } from "./TrainingModuleEditor";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GraduationCap, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BlueprintTrainingSectionProps {
  modules: TrainingModule[];
  onChange: (modules: TrainingModule[]) => void;
}

export function BlueprintTrainingSection({
  modules,
  onChange,
}: BlueprintTrainingSectionProps) {
  const requiredCount = modules.filter((m) => m.required).length;
  const totalCount = modules.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Creator Training
        </CardTitle>
        <CardDescription>
          Add training modules to help creators understand your brand and requirements
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {totalCount > 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {requiredCount > 0 ? (
                <>
                  Creators must complete{" "}
                  <strong>{requiredCount} required module{requiredCount !== 1 ? "s" : ""}</strong>{" "}
                  before they can submit content.
                  {totalCount - requiredCount > 0 && (
                    <> Plus {totalCount - requiredCount} optional module{totalCount - requiredCount !== 1 ? "s" : ""}.</>
                  )}
                </>
              ) : (
                <>
                  All {totalCount} module{totalCount !== 1 ? "s are" : " is"} optional.
                  Creators can submit without completing training.
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        <TrainingModuleEditor modules={modules} onChange={onChange} />
      </CardContent>
    </Card>
  );
}
