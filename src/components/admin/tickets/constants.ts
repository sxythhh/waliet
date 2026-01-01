import { TicketStatus, TicketPriority, TicketCategory, TicketTemplate } from "@/types/tickets";

// Category options
export const TICKET_CATEGORIES: Array<{ id: TicketCategory; name: string; icon?: string }> = [
  { id: "billing", name: "Billing & Payments" },
  { id: "technical", name: "Technical Issue" },
  { id: "account", name: "Account & Profile" },
  { id: "campaign", name: "Campaign Issue" },
  { id: "payout", name: "Payout Request" },
  { id: "other", name: "Other" },
];

// Status options
export const STATUS_OPTIONS: Array<{ id: TicketStatus; name: string }> = [
  { id: "open", name: "Open" },
  { id: "in_progress", name: "In Progress" },
  { id: "awaiting_reply", name: "Awaiting Reply" },
  { id: "resolved", name: "Resolved" },
  { id: "closed", name: "Closed" },
];

// Priority options
export const PRIORITY_OPTIONS: Array<{ id: TicketPriority; name: string }> = [
  { id: "urgent", name: "Urgent" },
  { id: "high", name: "High" },
  { id: "medium", name: "Medium" },
  { id: "low", name: "Low" },
];

// Status badge styles
export const statusStyles: Record<TicketStatus, string> = {
  open: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  in_progress: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  awaiting_reply: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  resolved: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  closed: "bg-muted text-muted-foreground border-border",
};

// Priority badge styles
export const priorityStyles: Record<TicketPriority, string> = {
  urgent: "bg-red-500/10 text-red-500 border-red-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  medium: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  low: "bg-muted text-muted-foreground border-border",
};

// Category badge styles
export const categoryStyles: Record<TicketCategory, string> = {
  billing: "bg-green-500/10 text-green-500 border-green-500/20",
  technical: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  account: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  campaign: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  payout: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  other: "bg-muted text-muted-foreground border-border",
};

// Status icons (Lucide icon names)
export const statusIcons: Record<TicketStatus, string> = {
  open: "CircleDot",
  in_progress: "Clock",
  awaiting_reply: "MessageSquare",
  resolved: "CheckCircle",
  closed: "XCircle",
};

// Priority icons
export const priorityIcons: Record<TicketPriority, string> = {
  urgent: "AlertTriangle",
  high: "ArrowUp",
  medium: "Minus",
  low: "ArrowDown",
};

// Quick reply templates
export const REPLY_TEMPLATES: TicketTemplate[] = [
  // General
  {
    id: "greeting",
    category: "General",
    name: "Greeting",
    content: "Hi {{username}},\n\nThank you for reaching out to us. I'm happy to help you with this.\n\n",
  },
  {
    id: "more-info",
    category: "General",
    name: "Request More Info",
    content: "Hi {{username}},\n\nThank you for contacting support. To assist you better, could you please provide the following additional information:\n\n1. \n2. \n3. \n\nOnce we have this information, we'll be able to resolve your issue promptly.\n\nBest regards",
  },
  {
    id: "resolved",
    category: "General",
    name: "Issue Resolved",
    content: "Hi {{username}},\n\nI'm pleased to inform you that your issue has been resolved. Here's a summary of what was done:\n\n[Summary]\n\nIf you have any further questions, please don't hesitate to reach out.\n\nBest regards",
  },
  // Payouts
  {
    id: "payout-processing",
    category: "Payouts",
    name: "Payout Processing",
    content: "Hi {{username}},\n\nThank you for your inquiry about your payout. I can confirm that your payout request is currently being processed.\n\nPlease allow 3-5 business days for the funds to appear in your account. If you haven't received the funds after this period, please let us know.\n\nBest regards",
  },
  {
    id: "payout-info-needed",
    category: "Payouts",
    name: "Payout Info Required",
    content: "Hi {{username}},\n\nTo process your payout request, we need you to verify/update your payment information in your account settings.\n\nPlease ensure your:\n- Payment method is correctly linked\n- Account details are accurate\n- Identity verification is complete\n\nOnce updated, your payout will be processed within 3-5 business days.\n\nBest regards",
  },
  // Technical
  {
    id: "clear-cache",
    category: "Technical",
    name: "Clear Cache",
    content: "Hi {{username}},\n\nThank you for reporting this issue. This type of problem is often resolved by clearing your browser cache and cookies.\n\nPlease try the following:\n1. Clear your browser cache and cookies\n2. Close and reopen your browser\n3. Log back into your account\n\nIf the issue persists after these steps, please let us know and we'll investigate further.\n\nBest regards",
  },
  {
    id: "bug-escalated",
    category: "Technical",
    name: "Bug Escalated",
    content: "Hi {{username}},\n\nThank you for bringing this to our attention. We've identified this as a bug and have escalated it to our development team.\n\nTicket Reference: {{ticket_number}}\n\nWe'll keep you updated on the progress and notify you once a fix has been implemented.\n\nBest regards",
  },
  // Account
  {
    id: "account-verified",
    category: "Account",
    name: "Account Verified",
    content: "Hi {{username}},\n\nGreat news! Your account has been successfully verified. You now have full access to all platform features.\n\nIf you have any questions about using the platform, feel free to reach out.\n\nBest regards",
  },
  {
    id: "verification-needed",
    category: "Account",
    name: "Verification Needed",
    content: "Hi {{username}},\n\nTo proceed with your request, we need to verify your account. Please complete the following steps:\n\n1. Navigate to Settings > Verification\n2. Upload a valid ID document\n3. Complete the selfie verification\n\nOnce your verification is approved, we'll process your request immediately.\n\nBest regards",
  },
  // Campaign
  {
    id: "campaign-approved",
    category: "Campaign",
    name: "Campaign Approved",
    content: "Hi {{username}},\n\nYour campaign submission has been reviewed and approved. You should now see the campaign in your active campaigns list.\n\nRemember to complete the campaign requirements before the deadline to receive your reward.\n\nBest of luck!\n\nBest regards",
  },
  {
    id: "campaign-rejected",
    category: "Campaign",
    name: "Campaign Submission Rejected",
    content: "Hi {{username}},\n\nUnfortunately, your campaign submission did not meet the requirements. Here's the feedback from our review:\n\n[Feedback]\n\nYou may resubmit your content after addressing these points. If you have any questions, please let us know.\n\nBest regards",
  },
];

// Keyboard shortcuts configuration
export const KEYBOARD_SHORTCUTS = [
  { key: "j", description: "Next ticket" },
  { key: "k", description: "Previous ticket" },
  { key: "r", description: "Focus reply" },
  { key: "e", description: "Resolve ticket" },
  { key: "a", description: "Assign to me" },
  { key: "/", description: "Focus search" },
  { key: "t", description: "Open templates" },
  { key: "i", description: "Toggle user context" },
  { key: "?", description: "Show shortcuts" },
  { key: "Escape", description: "Close dialogs" },
];

// Get category name from ID
export function getCategoryName(categoryId: TicketCategory): string {
  return TICKET_CATEGORIES.find(c => c.id === categoryId)?.name || categoryId;
}

// Get status name from ID
export function getStatusName(statusId: TicketStatus): string {
  return STATUS_OPTIONS.find(s => s.id === statusId)?.name || statusId;
}

// Get priority name from ID
export function getPriorityName(priorityId: TicketPriority): string {
  return PRIORITY_OPTIONS.find(p => p.id === priorityId)?.name || priorityId;
}

// Process template variables
export function processTemplate(
  template: string,
  variables: { username?: string; ticket_number?: string; [key: string]: string | undefined }
): string {
  let processed = template;
  Object.entries(variables).forEach(([key, value]) => {
    if (value) {
      processed = processed.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
  });
  return processed;
}
