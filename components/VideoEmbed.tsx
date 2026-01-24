import { useEffect, useRef } from "react";
import DOMPurify from "dompurify";

interface VideoEmbedProps {
  embedCode: string;
}

// Allowed video embed domains
const ALLOWED_DOMAINS = [
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "vimeo.com",
  "player.vimeo.com",
  "wistia.com",
  "fast.wistia.com",
  "loom.com",
  "www.loom.com",
  "streamable.com",
  "dailymotion.com",
  "www.dailymotion.com",
];

function isAllowedEmbedSource(embedCode: string): boolean {
  // Extract src attribute from iframe
  const srcMatch = embedCode.match(/src=["']([^"']+)["']/i);
  if (!srcMatch) return false;

  try {
    const url = new URL(srcMatch[1]);
    return ALLOWED_DOMAINS.some(
      (domain) => url.hostname === domain || url.hostname.endsWith("." + domain)
    );
  } catch {
    return false;
  }
}

export function VideoEmbed({ embedCode }: VideoEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !embedCode.trim()) return;

    const container = containerRef.current;

    // Validate embed source before processing
    if (!isAllowedEmbedSource(embedCode)) {
      container.innerHTML = `
        <div class="flex items-center justify-center p-4 text-sm text-muted-foreground bg-muted rounded-lg">
          <span>Video embed not supported. Only YouTube, Vimeo, Wistia, Loom, Streamable, and Dailymotion embeds are allowed.</span>
        </div>
      `;
      return;
    }

    // Sanitize embed code - only allow safe iframe attributes
    // NO scripts, NO styles, NO event handlers
    const sanitizedEmbed = DOMPurify.sanitize(embedCode, {
      ALLOWED_TAGS: ["iframe"],
      ALLOWED_ATTR: [
        "src",
        "width",
        "height",
        "frameborder",
        "allowfullscreen",
        "allow",
        "title",
        "class",
        "style",
        "loading",
      ],
      // Only allow HTTPS URLs from approved domains
      ALLOWED_URI_REGEXP:
        /^https:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com|player\.vimeo\.com|wistia\.com|fast\.wistia\.com|loom\.com|streamable\.com|dailymotion\.com)\//i,
    });

    if (!sanitizedEmbed.trim()) {
      container.innerHTML = `
        <div class="flex items-center justify-center p-4 text-sm text-muted-foreground bg-muted rounded-lg">
          <span>Invalid video embed code.</span>
        </div>
      `;
      return;
    }

    container.innerHTML = sanitizedEmbed;
  }, [embedCode]);

  return <div ref={containerRef} className="w-full flex justify-center" />;
}
