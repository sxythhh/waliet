/**
 * Q&A Parser for importing training conversations
 * Handles various formats including raw Discord chat logs
 */

export interface ParsedQA {
  question: string;
  answer: string;
  category?: string;
  originalIndex: number;
}

export interface QAParseResult {
  success: boolean;
  data: ParsedQA[];
  errors: string[];
  totalParsed: number;
  skipped: number;
}

// PII patterns to remove
const PII_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Emails
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // US Phone numbers
  /\b\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}\b/g, // International phones
  /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit cards
  /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, // SSN
];

// Discord ID patterns to clean
const DISCORD_PATTERNS = [
  /<#\d+>/g, // Channel IDs like <#1347214457260081222>
  /<@!?\d+>/g, // User IDs like <@1299765644962828420>
  /@\s*#\d+/g, // @ #0367 style mentions
];

// Competitor brand mentions to neutralize (add actual brands as needed)
const BRAND_REPLACEMENTS: Record<string, string> = {
  // Add competitor brand names here
  // 'CompetitorBrand': 'our platform',
};

// Indicators that a message is from a bot/support agent
const BOT_INDICATORS = [
  /if you need (further |any )?assistance/i,
  /please (check|open|submit|consider)/i,
  /support (ticket|channel|staff|team)/i,
  /due to (high volume|their workload)/i,
  /I('m| am) (sorry|best at helping)/i,
  /it (seems|sounds like|appears)/i,
  /please be patient/i,
  /remember to (be patient|follow)/i,
  /for (details|assistance|help)/i,
  /make sure to clearly state/i,
  /unfortunately,? you('ve| have) been/i,
  /<#\d+>/,  // Contains Discord channel ID
  /<@\d+>/,  // Contains Discord user mention
];

/**
 * Remove PII from text
 */
export function cleanPII(text: string): string {
  let cleaned = text;
  PII_PATTERNS.forEach((pattern) => {
    cleaned = cleaned.replace(pattern, "[REDACTED]");
  });
  return cleaned;
}

/**
 * Clean Discord-specific IDs and mentions
 */
export function cleanDiscordIds(text: string): string {
  let cleaned = text;
  // Replace channel IDs with generic placeholder
  cleaned = cleaned.replace(/<#\d+>/g, "the support channel");
  // Replace user IDs with generic placeholder
  cleaned = cleaned.replace(/<@!?\d+>/g, "our team");
  // Replace @ #0367 style mentions
  cleaned = cleaned.replace(/@\s*#\d+/g, "our team");
  return cleaned;
}

/**
 * Check if a message appears to be from a bot/support agent
 */
function isBotMessage(text: string): boolean {
  // Check against bot indicators
  const matchCount = BOT_INDICATORS.filter(pattern => pattern.test(text)).length;

  // If multiple indicators match, or message is long and formal, it's likely a bot
  if (matchCount >= 2) return true;

  // Long messages with formal structure are likely bot responses
  if (text.length > 150 && matchCount >= 1) return true;

  // Contains Discord IDs (bot responses reference channels/users)
  if (/<[#@]\d+>/.test(text)) return true;

  return false;
}

/**
 * Check if a message appears to be from a user
 */
function isUserMessage(text: string): boolean {
  // Very short messages are usually user messages
  if (text.length < 100 && !isBotMessage(text)) return true;

  // Contains emojis (users tend to use more emojis)
  if (/[\u{1F300}-\u{1F9FF}]/u.test(text)) return true;

  // Informal/complaint-style language
  const userPatterns = [
    /^(bro|bruh|yo|hey|hi|wtf|why|how come)/i,
    /they (don't|won't|didn't|won't|can't)/i,
    /no reply/i,
    /this is (bs|ridiculous|unfair)/i,
    /\?\s*$/,  // Ends with question mark
    /!{2,}/,   // Multiple exclamation marks
  ];

  return userPatterns.some(pattern => pattern.test(text));
}

/**
 * Neutralize competitor brand mentions
 */
export function neutralizeBrands(text: string): string {
  let cleaned = text;
  Object.entries(BRAND_REPLACEMENTS).forEach(([brand, replacement]) => {
    const regex = new RegExp(brand, "gi");
    cleaned = cleaned.replace(regex, replacement);
  });
  return cleaned;
}

/**
 * Clean and sanitize a Q&A pair
 */
function sanitizeQA(question: string, answer: string): { question: string; answer: string } {
  return {
    question: cleanDiscordIds(neutralizeBrands(cleanPII(question.trim()))),
    answer: cleanDiscordIds(neutralizeBrands(cleanPII(answer.trim()))),
  };
}

/**
 * Parse Q&A pairs from content using multiple pattern strategies
 */
export function parseQAContent(content: string): QAParseResult {
  const errors: string[] = [];
  const data: ParsedQA[] = [];
  let skipped = 0;

  // Try different parsing strategies in order of specificity
  const strategies = [
    parseNumberedQA,
    parseMarkdownQA,
    parseColonQA,
    parseFullWordQA,
    parseDoubleNewlineQA,
    parseRawChatLog, // Falls back to heuristic-based raw chat parsing
  ];

  for (const strategy of strategies) {
    const result = strategy(content);
    if (result.data.length > 0) {
      // Clean and validate each Q&A pair
      for (const qa of result.data) {
        const sanitized = sanitizeQA(qa.question, qa.answer);

        // Validate minimum lengths
        if (sanitized.question.length < 10) {
          skipped++;
          errors.push(`Skipped: question too short - "${sanitized.question.slice(0, 30)}..."`);
          continue;
        }
        if (sanitized.answer.length < 20) {
          skipped++;
          errors.push(`Skipped: answer too short - "${sanitized.answer.slice(0, 30)}..."`);
          continue;
        }

        data.push({
          question: sanitized.question,
          answer: sanitized.answer,
          originalIndex: data.length,
        });
      }

      if (data.length > 0) {
        break; // Use first successful strategy
      }
    }
  }

  return {
    success: data.length > 0,
    data,
    errors,
    totalParsed: data.length,
    skipped,
  };
}

/**
 * Strategy: Numbered Q&A pairs (1. Q: ... A: ...)
 */
function parseNumberedQA(content: string): { data: ParsedQA[] } {
  const data: ParsedQA[] = [];
  const pattern = /\d+\.\s*(?:Q|Question):\s*(.*?)\s*(?:A|Answer):\s*([\s\S]*?)(?=(?:\d+\.\s*(?:Q|Question):|$))/gi;

  let match;
  while ((match = pattern.exec(content)) !== null) {
    if (match[1] && match[2]) {
      data.push({
        question: match[1].trim(),
        answer: match[2].trim(),
        originalIndex: data.length,
      });
    }
  }

  return { data };
}

/**
 * Strategy: Markdown bold Q&A (**Q:** ... **A:** ...)
 */
function parseMarkdownQA(content: string): { data: ParsedQA[] } {
  const data: ParsedQA[] = [];
  const pattern = /\*\*(?:Q|Question):\*\*\s*(.*?)\s*\*\*(?:A|Answer):\*\*\s*([\s\S]*?)(?=(?:\*\*(?:Q|Question):\*\*|$))/gi;

  let match;
  while ((match = pattern.exec(content)) !== null) {
    if (match[1] && match[2]) {
      data.push({
        question: match[1].trim(),
        answer: match[2].trim(),
        originalIndex: data.length,
      });
    }
  }

  return { data };
}

/**
 * Strategy: Simple colon format (Q: ... A: ...)
 */
function parseColonQA(content: string): { data: ParsedQA[] } {
  const data: ParsedQA[] = [];
  const pattern = /(?:^|\n)Q:\s*(.*?)\s*\nA:\s*([\s\S]*?)(?=(?:\nQ:|$))/gi;

  let match;
  while ((match = pattern.exec(content)) !== null) {
    if (match[1] && match[2]) {
      data.push({
        question: match[1].trim(),
        answer: match[2].trim(),
        originalIndex: data.length,
      });
    }
  }

  return { data };
}

/**
 * Strategy: Full word format (Question: ... Answer: ...)
 */
function parseFullWordQA(content: string): { data: ParsedQA[] } {
  const data: ParsedQA[] = [];
  const pattern = /(?:^|\n)Question:\s*(.*?)\s*\nAnswer:\s*([\s\S]*?)(?=(?:\nQuestion:|$))/gi;

  let match;
  while ((match = pattern.exec(content)) !== null) {
    if (match[1] && match[2]) {
      data.push({
        question: match[1].trim(),
        answer: match[2].trim(),
        originalIndex: data.length,
      });
    }
  }

  return { data };
}

/**
 * Strategy: Raw Discord chat log parsing
 * Classifies messages based on patterns and pairs user questions with bot answers
 */
function parseRawChatLog(content: string): { data: ParsedQA[] } {
  const data: ParsedQA[] = [];

  // Split by newlines, keeping non-empty segments
  const lines = content.split(/\n/).filter((l) => l.trim());

  // Merge lines into logical messages (short lines likely belong together)
  const messages: { text: string; isBot: boolean }[] = [];
  let currentMessage = "";

  for (const line of lines) {
    const trimmed = line.trim();

    // Check if this line starts a new message
    const startsWithCapital = /^[A-Z]/.test(trimmed);
    const endsWithPunctuation = /[.!?]$/.test(currentMessage.trim());
    const isShort = trimmed.length < 50;

    // If current message is substantial and this looks like a new one
    if (currentMessage.length > 100 && startsWithCapital && endsWithPunctuation) {
      // Save the current message
      const text = currentMessage.trim();
      messages.push({ text, isBot: isBotMessage(text) });
      currentMessage = trimmed;
    } else if (currentMessage && !isShort && startsWithCapital) {
      // This looks like a new message
      const text = currentMessage.trim();
      messages.push({ text, isBot: isBotMessage(text) });
      currentMessage = trimmed;
    } else {
      // Continue building current message
      currentMessage += (currentMessage ? " " : "") + trimmed;
    }
  }

  // Don't forget the last message
  if (currentMessage.trim()) {
    const text = currentMessage.trim();
    messages.push({ text, isBot: isBotMessage(text) });
  }

  // Now pair user messages with bot responses
  let i = 0;
  while (i < messages.length - 1) {
    // Find a user message
    if (!messages[i].isBot) {
      // Collect consecutive user messages
      let userText = messages[i].text;
      let j = i + 1;

      // Look for following user messages to combine
      while (j < messages.length && !messages[j].isBot && j - i < 3) {
        userText += " " + messages[j].text;
        j++;
      }

      // Now look for the bot response
      if (j < messages.length && messages[j].isBot) {
        let botText = messages[j].text;
        j++;

        // Collect consecutive bot messages
        while (j < messages.length && messages[j].isBot && j - i < 5) {
          botText += " " + messages[j].text;
          j++;
        }

        // Clean Discord IDs from both
        const cleanedQuestion = cleanDiscordIds(userText);
        const cleanedAnswer = cleanDiscordIds(botText);

        data.push({
          question: cleanedQuestion,
          answer: cleanedAnswer,
          originalIndex: data.length,
        });

        i = j;
        continue;
      }
    }
    i++;
  }

  return { data };
}

/**
 * Strategy: Double newline separated (for chat-style logs)
 * Assumes alternating user/assistant messages
 */
function parseDoubleNewlineQA(content: string): { data: ParsedQA[] } {
  const data: ParsedQA[] = [];

  // Split by double newlines
  const blocks = content.split(/\n\n+/).filter((b) => b.trim());

  // Try to pair consecutive blocks as Q&A
  for (let i = 0; i < blocks.length - 1; i += 2) {
    const question = blocks[i]?.trim();
    const answer = blocks[i + 1]?.trim();

    if (question && answer) {
      // Remove common prefixes like "User:", "Customer:", "Assistant:", "Agent:"
      const cleanQuestion = question.replace(/^(?:User|Customer|You|Human):\s*/i, "");
      const cleanAnswer = answer.replace(/^(?:Assistant|Agent|AI|Bot|Support):\s*/i, "");

      if (cleanQuestion && cleanAnswer) {
        data.push({
          question: cleanQuestion,
          answer: cleanAnswer,
          originalIndex: data.length,
        });
      }
    }
  }

  return { data };
}

/**
 * Parse Q&A content from a file
 */
export async function parseQAFile(file: File): Promise<QAParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const content = event.target?.result as string;
      resolve(parseQAContent(content));
    };

    reader.onerror = () => {
      resolve({
        success: false,
        data: [],
        errors: ["Failed to read file"],
        totalParsed: 0,
        skipped: 0,
      });
    };

    reader.readAsText(file);
  });
}

/**
 * Get a preview of parsed Q&A pairs
 */
export function getQAPreview(data: ParsedQA[], count: number = 5): ParsedQA[] {
  return data.slice(0, count);
}

/**
 * Auto-detect category based on keywords
 */
export function detectCategory(question: string, answer: string): string | undefined {
  const text = (question + " " + answer).toLowerCase();

  const categoryKeywords: Record<string, string[]> = {
    billing: ["payment", "charge", "invoice", "refund", "subscription", "price", "cost", "billing"],
    technical: ["error", "bug", "crash", "not working", "broken", "issue", "problem", "fix"],
    account: ["login", "password", "email", "profile", "account", "verify", "verification"],
    campaign: ["campaign", "video", "content", "brand", "submit", "deadline", "brief"],
    payout: ["payout", "earnings", "withdraw", "payment method", "bank", "paypal"],
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      return category;
    }
  }

  return undefined;
}

/**
 * Enrich Q&A pairs with auto-detected categories
 */
export function enrichWithCategories(data: ParsedQA[]): ParsedQA[] {
  return data.map((qa) => ({
    ...qa,
    category: qa.category || detectCategory(qa.question, qa.answer),
  }));
}
