# CLAUDE.md

## Skills
Read and follow these skills before writing any code:
- .claude/skills/base/SKILL.md
- .claude/skills/security/SKILL.md
- .claude/skills/project-tooling/SKILL.md
- .claude/skills/session-management/SKILL.md
- .claude/skills/typescript/SKILL.md
- .claude/skills/react-web/SKILL.md
- .claude/skills/supabase/SKILL.md

## Project Overview
Virality's web app is the marketplace infrastructure where brands post opportunities (campaigns or boosts) for content campaigns and manage creator/video editor hiring, payments, and performance tracking through our dashboard. It handles the entire workflow from campaign wallet funding to verified view tracking to automated creator payouts, replacing what used to be manual coordination with self-serve platform mechanics.

## Tech Stack
- **Language**: TypeScript
- **Framework**: React (Vite) + Capacitor for mobile
- **Database**: Supabase (Postgres)
- **UI**: Shadcn/UI + Tailwind CSS + Radix UI
- **State**: TanStack Query
- **Forms**: React Hook Form + Zod
- **Deployment**: Vercel
- **Analytics**: PostHog

## Key Commands
```bash
# Verify all CLI tools are working
./scripts/verify-tooling.sh

# Install dependencies
npm install

# Development
npm run dev

# Build
npm run build

# Lint
npm run lint

# Mobile (Capacitor)
npm run cap:ios        # Build and open iOS
npm run cap:android    # Build and open Android

# Database (Supabase)
supabase start         # Start local Supabase
supabase db push       # Push migrations to remote
supabase functions serve  # Run Edge Functions locally
```

## Documentation
- `docs/` - Technical documentation
- `_project_specs/` - Project specifications and todos

## Atomic Todos
All work is tracked in `_project_specs/todos/`:
- `active.md` - Current work
- `backlog.md` - Future work
- `completed.md` - Done (for reference)

Every todo must have validation criteria and test cases. See base.md skill for format.

## Session Management

### State Tracking
Maintain session state in `_project_specs/session/`:
- `current-state.md` - Live session state (update every 15-20 tool calls)
- `decisions.md` - Key architectural/implementation decisions (append-only)
- `code-landmarks.md` - Important code locations for quick reference
- `archive/` - Past session summaries

### Automatic Updates
Update `current-state.md`:
- After completing any todo item
- Every 15-20 tool calls during active work
- Before any significant context shift
- When encountering blockers

### Decision Logging
Log to `decisions.md` when:
- Choosing between architectural approaches
- Selecting libraries or tools
- Making security-related choices
- Deviating from standard patterns

### Context Compression
When context feels heavy (~50+ tool calls):
1. Summarize completed work in current-state.md
2. Archive verbose exploration notes to archive/
3. Keep only essential context for next steps

### Session Handoff
When ending a session or approaching context limits, update current-state.md with:
- What was completed this session
- Current state of work
- Immediate next steps (numbered, specific)
- Open questions or blockers
- Files to review first when resuming

### Resuming Work
When starting a new session:
1. Read `_project_specs/session/current-state.md`
2. Check `_project_specs/todos/active.md`
3. Review recent entries in `decisions.md` if context needed
4. Continue from "Next Steps" in current-state.md

## Project-Specific Patterns

### Supabase Edge Functions
Edge Functions are in `supabase/functions/`. Each function has its own directory with `index.ts`.

### Component Structure
UI components use Shadcn/UI conventions in `src/components/ui/`.
Feature components are organized by domain (e.g., `admin/`, `brand/`, `dashboard/`).

### Authentication
Uses Supabase Auth with email OTP and Discord OAuth flows.

### Payments
Campaign wallet funding and creator payouts are core workflows. Always verify wallet balances before payouts.
