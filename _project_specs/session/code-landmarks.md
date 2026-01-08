<!--
UPDATE WHEN:
- Adding new entry points or key files
- Introducing new patterns
- Discovering non-obvious behavior

Helps quickly navigate the codebase when resuming work.
-->

# Code Landmarks

Quick reference to important parts of the codebase.

## Entry Points
| Location | Purpose |
|----------|---------|
| src/main.tsx | Main React application entry |
| index.html | HTML entry point |

## Core Business Logic
| Location | Purpose |
|----------|---------|
| src/pages/ | Page components (routes) |
| src/components/ | Reusable components |
| src/hooks/ | Custom React hooks |
| src/lib/ | Utility functions |
| supabase/functions/ | Edge Functions (backend) |

## Configuration
| Location | Purpose |
|----------|---------|
| vite.config.ts | Vite bundler config |
| tailwind.config.ts | Tailwind CSS config |
| supabase/config.toml | Supabase local config |
| capacitor.config.ts | Capacitor mobile config |

## Key Patterns
| Pattern | Example Location | Notes |
|---------|------------------|-------|
| Shadcn/UI components | src/components/ui/ | Pre-built accessible components |
| Feature components | src/components/admin/, brand/, dashboard/ | Domain-organized |
| Edge Functions | supabase/functions/*/index.ts | Deno runtime |

## Testing
| Location | Purpose |
|----------|---------|
| (not yet configured) | Tests to be added |

## Gotchas & Non-Obvious Behavior
| Location | Issue | Notes |
|----------|-------|-------|
| VITE_* env vars | Exposed to client | Never put secrets here |
| supabase/.temp/ | Auto-generated | Gitignored |
