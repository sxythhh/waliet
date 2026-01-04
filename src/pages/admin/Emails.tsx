import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AdminPermissionGuard } from "@/components/admin/AdminPermissionGuard";
import { format } from "date-fns";
import { Send, FileText, History, Plus, Pencil, Trash2, Eye, Loader2, Mail, Users, Building2, UserCheck } from "lucide-react";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  created_at: string;
}

interface EmailBroadcast {
  id: string;
  subject: string;
  html_content: string;
  segment: string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  status: string;
  sent_at: string | null;
  created_at: string;
}

interface EmailLog {
  id: string;
  recipient_email: string;
  subject: string;
  status: string;
  created_at: string;
  broadcast_id: string | null;
}

export default function AdminEmails() {
  const [activeTab, setActiveTab] = useState("broadcasts");
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [broadcasts, setBroadcasts] = useState<EmailBroadcast[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [selectedBroadcast, setSelectedBroadcast] = useState<EmailBroadcast | null>(null);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [segment, setSegment] = useState("all");
  const [templateName, setTemplateName] = useState("");

  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "broadcasts") {
        const { data, error } = await supabase
          .from("email_broadcasts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;
        setBroadcasts(data || []);
      } else if (activeTab === "templates") {
        const { data, error } = await supabase
          .from("email_templates")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setTemplates(data || []);
      } else if (activeTab === "logs") {
        const { data, error } = await supabase
          .from("email_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) throw error;
        setLogs(data || []);
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to fetch data"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!subject || !htmlContent) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Subject and content are required"
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const { error } = await supabase
        .from("email_broadcasts")
        .insert({
          subject,
          html_content: htmlContent,
          segment,
          status: "draft",
          created_by: session?.user?.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Draft saved successfully"
      });

      setShowComposer(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save draft"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendBroadcast = async (broadcastId: string) => {
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke("send-broadcast-email", {
        body: { broadcast_id: broadcastId },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (error) throw error;

      toast({
        title: "Broadcast Sent",
        description: `Successfully sent to ${data.sent_count} recipients`
      });

      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send broadcast"
      });
    } finally {
      setSending(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName || !subject || !htmlContent) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Name, subject, and content are required"
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (selectedTemplate) {
        const { error } = await supabase
          .from("email_templates")
          .update({
            name: templateName,
            subject,
            html_content: htmlContent,
            updated_at: new Date().toISOString()
          })
          .eq("id", selectedTemplate.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("email_templates")
          .insert({
            name: templateName,
            subject,
            html_content: htmlContent,
            created_by: session?.user?.id
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: selectedTemplate ? "Template updated" : "Template saved"
      });

      setShowTemplateEditor(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save template"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from("email_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template deleted"
      });

      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete template"
      });
    }
  };

  const handleUseTemplate = (template: EmailTemplate) => {
    setSubject(template.subject);
    setHtmlContent(template.html_content);
    setShowComposer(true);
  };

  const resetForm = () => {
    setSubject("");
    setHtmlContent("");
    setSegment("all");
    setTemplateName("");
    setSelectedTemplate(null);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      draft: { variant: "secondary", label: "Draft" },
      sending: { variant: "default", label: "Sending" },
      sent: { variant: "outline", label: "Sent" },
      partial: { variant: "destructive", label: "Partial" },
      failed: { variant: "destructive", label: "Failed" },
      delivered: { variant: "outline", label: "Delivered" },
      opened: { variant: "default", label: "Opened" },
      clicked: { variant: "default", label: "Clicked" },
      bounced: { variant: "destructive", label: "Bounced" }
    };

    const config = statusConfig[status] || { variant: "secondary", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getSegmentIcon = (segment: string) => {
    switch (segment) {
      case "creators":
        return <UserCheck className="h-4 w-4" />;
      case "brands":
        return <Building2 className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const defaultTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: 'Inter', -apple-system, sans-serif; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #ffffff; border-radius: 16px; padding: 48px 32px; border: 1px solid #e5e5e5; }
    .header { text-align: center; margin-bottom: 32px; }
    .title { color: #171717; font-size: 24px; font-weight: 700; margin: 0 0 12px 0; }
    .content { color: #404040; font-size: 15px; line-height: 1.6; }
    .button { display: inline-block; background: #5865f2; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; }
    .footer { text-align: center; margin-top: 32px; color: #a3a3a3; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <img src="https://virality.gg/lovable-uploads/05566301-7c21-4e5b-9e22-a097cbaf1442.png" alt="Virality" height="40" />
        <h1 class="title">Your Title Here</h1>
      </div>
      <div class="content">
        <p>Hey {{name}},</p>
        <p>Your message content goes here...</p>
        <p style="text-align: center; margin-top: 24px;">
          <a href="https://virality.gg/dashboard" class="button">Go to Dashboard</a>
        </p>
      </div>
      <div class="footer">
        <p>&copy; 2026 Virality. All rights reserved.</p>
        <p>You're receiving this because you're subscribed to updates.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  return (
    <AdminPermissionGuard resource="emails">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Email Management</h1>
            <p className="text-muted-foreground">Send broadcasts, manage templates, and view email logs</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="broadcasts" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Broadcasts
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Logs
            </TabsTrigger>
          </TabsList>

          {/* Broadcasts Tab */}
          <TabsContent value="broadcasts" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => {
                resetForm();
                setHtmlContent(defaultTemplate);
                setShowComposer(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                New Broadcast
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : broadcasts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No broadcasts yet</p>
                </CardContent>
              </Card>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Segment</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {broadcasts.map((broadcast) => (
                    <TableRow key={broadcast.id}>
                      <TableCell className="font-medium">{broadcast.subject}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getSegmentIcon(broadcast.segment)}
                          <span className="capitalize">{broadcast.segment}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {broadcast.status === "sent" || broadcast.status === "partial"
                          ? `${broadcast.sent_count}/${broadcast.recipient_count}`
                          : broadcast.recipient_count || "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(broadcast.status)}</TableCell>
                      <TableCell>
                        {broadcast.sent_at
                          ? format(new Date(broadcast.sent_at), "MMM d, yyyy HH:mm")
                          : format(new Date(broadcast.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedBroadcast(broadcast);
                              setShowPreview(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {broadcast.status === "draft" && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleSendBroadcast(broadcast.id)}
                              disabled={sending}
                            >
                              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => {
                resetForm();
                setHtmlContent(defaultTemplate);
                setShowTemplateEditor(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : templates.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No templates yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => (
                  <Card key={template.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription>{template.subject}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(template.created_at), "MMM d, yyyy")}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUseTemplate(template)}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedTemplate(template);
                              setTemplateName(template.name);
                              setSubject(template.subject);
                              setHtmlContent(template.html_content);
                              setShowTemplateEditor(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <History className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No email logs yet</p>
                </CardContent>
              </Card>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{log.recipient_email}</TableCell>
                      <TableCell>{log.subject}</TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell>
                        {format(new Date(log.created_at), "MMM d, yyyy HH:mm")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>

        {/* Composer Dialog */}
        <Dialog open={showComposer} onOpenChange={setShowComposer}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Compose Broadcast</DialogTitle>
              <DialogDescription>
                Create a new email broadcast to send to your users
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Email subject line"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Segment</Label>
                  <Select value={segment} onValueChange={setSegment}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="creators">Creators Only</SelectItem>
                      <SelectItem value="brands">Brands Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>HTML Content</Label>
                <p className="text-xs text-muted-foreground">
                  Use {"{{name}}"} for recipient's name, {"{{email}}"} for their email
                </p>
                <Textarea
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  placeholder="<html>...</html>"
                  className="min-h-[300px] font-mono text-sm"
                />
              </div>

              <div className="border rounded-lg p-4">
                <Label className="mb-2 block">Preview</Label>
                <div
                  className="bg-white rounded border"
                  dangerouslySetInnerHTML={{
                    __html: htmlContent
                      .replace(/\{\{name\}\}/g, "John")
                      .replace(/\{\{email\}\}/g, "john@example.com")
                  }}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowComposer(false)}>
                Cancel
              </Button>
              <Button variant="secondary" onClick={handleSaveDraft} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save as Draft
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Template Editor Dialog */}
        <Dialog open={showTemplateEditor} onOpenChange={setShowTemplateEditor}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedTemplate ? "Edit Template" : "New Template"}</DialogTitle>
              <DialogDescription>
                Create a reusable email template
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <Input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g., Welcome Email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Email subject line"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>HTML Content</Label>
                <Textarea
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  placeholder="<html>...</html>"
                  className="min-h-[300px] font-mono text-sm"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTemplateEditor(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveTemplate} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Email Preview</DialogTitle>
              <DialogDescription>
                {selectedBroadcast?.subject}
              </DialogDescription>
            </DialogHeader>

            {selectedBroadcast && (
              <div
                className="bg-white rounded border"
                dangerouslySetInnerHTML={{ __html: selectedBroadcast.html_content }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminPermissionGuard>
  );
}
