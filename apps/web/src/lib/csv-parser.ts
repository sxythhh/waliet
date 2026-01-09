/**
 * CSV Parser utility for importing leads
 */

export interface ParsedLead {
  name: string;
  email: string;
  phone?: string;
  status?: string;
  created?: string;
  last_contact?: string;
  utm_campaign?: string;
  utm_source?: string;
  utm_medium?: string;
  [key: string]: string | undefined;
}

export interface ParseResult {
  success: boolean;
  data: ParsedLead[];
  headers: string[];
  errors: string[];
  rowCount: number;
}

// Normalize column names to match expected fields
const COLUMN_MAPPINGS: Record<string, string> = {
  name: "name",
  email: "email",
  phone: "phone",
  status: "status",
  created: "created",
  "last contact": "last_contact",
  lastcontact: "last_contact",
  "utm campaign": "utm_campaign",
  utmcampaign: "utm_campaign",
  "utm source": "utm_source",
  utmsource: "utm_source",
  "utm medium": "utm_medium",
  utmmedium: "utm_medium",
};

function normalizeColumnName(header: string): string {
  const normalized = header.toLowerCase().trim();
  return COLUMN_MAPPINGS[normalized] || normalized.replace(/\s+/g, "_");
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function normalizePhone(phone: string): string {
  // Remove common formatting characters, keep digits and +
  return phone.replace(/[\s\-\(\)\.]/g, "").trim();
}

export function parseCSV(content: string): ParseResult {
  const errors: string[] = [];
  const lines = content.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length === 0) {
    return {
      success: false,
      data: [],
      headers: [],
      errors: ["CSV file is empty"],
      rowCount: 0,
    };
  }

  // Parse header row
  const rawHeaders = parseCSVLine(lines[0]);
  const headers = rawHeaders.map(normalizeColumnName);

  // Check for required email column
  const emailIndex = headers.indexOf("email");
  if (emailIndex === -1) {
    return {
      success: false,
      data: [],
      headers: rawHeaders,
      errors: ["CSV must contain an 'email' column"],
      rowCount: 0,
    };
  }

  // Parse data rows
  const data: ParsedLead[] = [];
  const seenEmails = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = parseCSVLine(line);
    const row: ParsedLead = { name: "", email: "" };

    headers.forEach((header, index) => {
      const value = values[index] || "";
      if (header === "email") {
        row.email = normalizeEmail(value);
      } else if (header === "phone") {
        row.phone = normalizePhone(value);
      } else {
        row[header] = value.trim();
      }
    });

    // Validate row
    if (!row.email) {
      errors.push(`Row ${i + 1}: Missing email`);
      continue;
    }

    if (!isValidEmail(row.email)) {
      errors.push(`Row ${i + 1}: Invalid email format "${row.email}"`);
      continue;
    }

    // Skip duplicate emails within the file
    if (seenEmails.has(row.email)) {
      errors.push(`Row ${i + 1}: Duplicate email "${row.email}" (skipped)`);
      continue;
    }

    seenEmails.add(row.email);
    data.push(row);
  }

  return {
    success: true,
    data,
    headers: rawHeaders,
    errors,
    rowCount: data.length,
  };
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function parseCSVFile(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const content = event.target?.result as string;
      resolve(parseCSV(content));
    };

    reader.onerror = () => {
      resolve({
        success: false,
        data: [],
        headers: [],
        errors: ["Failed to read file"],
        rowCount: 0,
      });
    };

    reader.readAsText(file);
  });
}

// Get unique status values from parsed data
export function getUniqueStatuses(data: ParsedLead[]): string[] {
  const statuses = new Set<string>();
  data.forEach((row) => {
    if (row.status) {
      statuses.add(row.status);
    }
  });
  return Array.from(statuses).sort();
}

// Preview first N rows
export function getPreviewRows(data: ParsedLead[], count: number = 5): ParsedLead[] {
  return data.slice(0, count);
}
