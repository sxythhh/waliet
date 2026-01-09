import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Upload, Link, Clock, CheckCircle, Loader2, FileVideo } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface EvidenceUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payoutRequestId: string;
  amount: number;
  deadline: string;
  flags: Array<{ type: string; reason: string }>;
  onSuccess: () => void;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

export function EvidenceUploadDialog({
  open,
  onOpenChange,
  payoutRequestId,
  amount,
  deadline,
  flags,
  onSuccess,
}: EvidenceUploadDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'link'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const deadlineDate = new Date(deadline);
  const isExpired = deadlineDate < new Date();
  const timeRemaining = deadlineDate.getTime() - Date.now();
  const hoursRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60)));
  const minutesRemaining = Math.max(0, Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60)));

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an MP4, MOV, or WebM video file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "Maximum file size is 100 MB. Try a link instead.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (activeTab === 'upload' && !selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a video file to upload.",
        variant: "destructive",
      });
      return;
    }

    if (activeTab === 'link' && !externalUrl) {
      toast({
        title: "No URL provided",
        description: "Please enter a valid URL.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let filePath: string | null = null;
      let evidenceType: 'screen_recording' | 'external_link' = 'external_link';

      if (activeTab === 'upload' && selectedFile) {
        evidenceType = 'screen_recording';

        // Upload to Supabase Storage
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${payoutRequestId}/${Date.now()}.${fileExt}`;

        // Simulate progress for now (Supabase doesn't have progress callbacks)
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => Math.min(prev + 10, 90));
        }, 200);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('fraud-evidence')
          .upload(fileName, selectedFile, {
            cacheControl: '3600',
            upsert: false,
          });

        clearInterval(progressInterval);

        if (uploadError) {
          // Fall back to link if upload fails
          console.error('Upload failed, prompting for link:', uploadError);
          toast({
            title: "Upload failed",
            description: "Try providing a link instead (YouTube, Loom, Google Drive).",
            variant: "destructive",
          });
          setActiveTab('link');
          setIsUploading(false);
          return;
        }

        filePath = uploadData.path;
        setUploadProgress(100);
      }

      // Create evidence record
      const { error: evidenceError } = await supabase
        .from('fraud_evidence')
        .insert({
          payout_request_id: payoutRequestId,
          creator_id: user.id,
          evidence_type: evidenceType,
          file_path: filePath,
          file_size_bytes: selectedFile?.size || null,
          external_url: activeTab === 'link' ? externalUrl : null,
          review_status: 'pending',
        });

      if (evidenceError) {
        console.error('Failed to create evidence record:', evidenceError);
        throw new Error('Failed to save evidence');
      }

      // Update payout request status
      await supabase
        .from('submission_payout_requests')
        .update({
          auto_approval_status: 'pending_review',
        })
        .eq('id', payoutRequestId);

      setUploadSuccess(true);
      toast({
        title: "Evidence submitted",
        description: "Your evidence has been submitted for review.",
      });

      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
      }, 1500);

    } catch (error) {
      console.error('Error uploading evidence:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetState = () => {
    setSelectedFile(null);
    setExternalUrl('');
    setUploadProgress(0);
    setUploadSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetState();
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>
            Submit Verification Evidence
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Upload a screen recording of your video analytics to verify your payout request.
          </DialogDescription>
        </DialogHeader>

        {uploadSuccess ? (
          <div className="py-8 text-center">
            <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Evidence Submitted</h3>
            <p className="text-sm text-muted-foreground">
              Your evidence is now pending review. We'll notify you once a decision is made.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-4">
              {/* Deadline Warning */}
              <div className={`flex gap-3 p-3 rounded-lg ${isExpired ? 'bg-red-500/10' : 'bg-orange-500/10'}`}>
                <Clock className={`h-5 w-5 flex-shrink-0 mt-0.5 ${isExpired ? 'text-red-600' : 'text-orange-600'}`} />
                <div>
                  <p className={`text-sm font-medium ${isExpired ? 'text-red-600' : 'text-orange-600'}`}>
                    {isExpired ? 'Deadline Passed' : `${hoursRemaining}h ${minutesRemaining}m remaining`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Deadline: {format(deadlineDate, 'PPpp')}
                  </p>
                </div>
              </div>

              {/* Payout Info */}
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Payout Amount</span>
                  <span className="text-lg font-bold text-green-600">${amount.toFixed(2)}</span>
                </div>
              </div>

              {/* Flags */}
              {flags.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Reason for verification:</p>
                  {flags.map((flag, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground">{flag.reason}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Tabs */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'upload' | 'link')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Upload
                  </TabsTrigger>
                  <TabsTrigger value="link" className="flex items-center gap-2">
                    <Link className="h-4 w-4" />
                    Link
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="mt-4">
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      selectedFile ? 'border-green-500 bg-green-500/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/mp4,video/quicktime,video/webm"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileVideo className="h-8 w-8 text-green-600" />
                        <div className="text-left">
                          <p className="text-sm font-medium truncate max-w-[200px]">{selectedFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Click to upload screen recording</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          MP4, MOV, or WebM (max 100 MB)
                        </p>
                      </>
                    )}
                  </div>
                  {isUploading && uploadProgress > 0 && (
                    <div className="mt-3">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 text-center">
                        Uploading... {uploadProgress}%
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="link" className="mt-4 space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="external-url">Video URL</Label>
                    <Input
                      id="external-url"
                      type="url"
                      placeholder="https://youtube.com/watch?v=... or loom.com/share/..."
                      value={externalUrl}
                      onChange={(e) => setExternalUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      YouTube, Loom, Google Drive, or Dropbox links accepted
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              {/* What to include */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <p className="text-xs font-medium">Your screen recording should show:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    View source breakdown (e.g., "For You" page)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    Geographic distribution of viewers
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    Watch time / average view duration
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    Engagement metrics (likes, comments, shares)
                  </li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={isUploading || isExpired || (activeTab === 'upload' ? !selectedFile : !externalUrl)}
                className="bg-primary hover:bg-primary/90"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Submit Evidence'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
