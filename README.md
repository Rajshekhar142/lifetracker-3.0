# LifeTracker 3.0

> Build the life you keep delaying.

A structured system for tracking effort, measuring growth, and compounding progress across every dimension of your life. Built on the Feynman technique — you don't just log tasks, you account for them.

---

## What It Is

Most productivity apps track tasks. LifeTracker tracks **you** — across 7 life domains, measuring not just what you did but how hard it was and whether you actually retained it.

Every completed task generates a **Work Unit (WU)**:

```
WU = Time Invested × Resistance Multiplier × Recall Accuracy
```

- **Time** — live tracked from when you start to when you finish
- **Resistance** — how hard was it today? (1–10, maps to 1×, 2×, 4×)
- **Recall** — can you explain what you did? AI or heuristic evaluation

---

## The 7 Domains

| Domain | Focus |
|---|---|
| Physical | Body, fitness, sleep, energy |
| Mental | Intellect, learning, clarity |
| Emotional | Self-awareness, healing, regulation |
| Spiritual | Meaning, values, purpose |
| Social | Relationships, community, presence |
| Financial | Resources, saving, wealth building |
| Vocational | Craft, output, skills, contribution |

You can customize — rename, delete, or add your own. The system recommends keeping all 7 active. A complete system compounds faster.

---

## Features

### Core
- **Domain Setup** — initialize your 7 domains on first login, customize freely
- **Mission Stack** — log tasks per domain, track effort in real time
- **Live Timer** — persisted in DB, survives tab close and app refresh
- **Resistance System** — 1–10 scale with multiplier tiers (1×, 2×, 4×)
- **Recall Check** — Feynman-style popup before task completion
  - AI evaluation via Claude API (domain-aware prompts)
  - Heuristic fallback (keyword overlap + word count)
  - Reflection mode for Physical/Vocational domains
- **WU Calculation** — time × resistance × recall, stored per task

### Achievements
- **Domain Mastery** — 4 tiers per domain (Novice → Apprentice → Operator → Elite)
- **Hidden Achievements** — 8 secret unlocks, conditions unknown until earned
- **Toast Notifications** — subtle unlock alerts at bottom of mission page
- **Visibility Control** — toggle each achievement public or private

### Auth
- Email/password sign in and sign up
- Google OAuth
- Session-based auth via better-auth
- Middleware protection on all routes
- Server action auth guards on every DB operation

### Life Polygon
- Dynamic SVG polygon on mission page
- `n` sides = number of active domains
- Each segment's opacity scales with domain WU progress
- Visual snapshot of your life balance at a glance

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Auth | better-auth |
| ORM | Prisma |
| Database | PostgreSQL (Neon) |
| Styling | Custom CSS (cyberpunk design system) |
| Testing | Vitest |
| CI | GitHub Actions |
| Deployment | Vercel |
| AI Recall | Anthropic Claude API (claude-haiku) |

---

## Project Structure

```
app/
  (auth)/
    sign-in/          — sign in page
    sign-up/          — sign up page
  dashboard/          — post-auth landing, redirects based on domain state
  domain/             — domain setup and management
  mission/            — core app — task logging, timer, recall
  achievements/       — mastery tiers and hidden achievements
  actions/
    domain-actions.ts — domain CRUD + seeding
    mission-actions.ts — task CRUD, timer, WU calculation, recall eval
    achievement-store.ts — achievement evaluation engine + fetch
  layout.tsx
  page.tsx            — landing page

lib/
  auth.ts             — better-auth config
  auth-client.ts      — client-side auth helpers
  prisma.ts           — prisma client singleton
  achievements.ts     — achievement catalogue (pure definitions)

middleware.ts         — route protection (cookie check)

tests/
  unit/
    wu-formula.test.ts
    achievement-catalogue.test.ts
  integration/
    domain-actions.test.ts
    task-and-achievements.test.ts

.github/
  workflows/
    ci.yml            — type check → lint → test → build
```

---

## Data Model

```prisma
User
  ├── Session[]
  ├── Account[]
  ├── Domain[]
  ├── Task[]
  └── Achievement[]

Domain
  ├── userId → User
  └── Task[]

Task
  ├── userId → User
  ├── domainId → Domain
  ├── status: In_progress | Completed | Failed
  ├── resistanceLevel: Int
  ├── durationMinutes: Int?
  ├── startedAt: DateTime?
  └── calculatedWU: Float

Achievement
  ├── userId → User
  ├── key: String        — e.g. "physical_elite", "iron_will"
  ├── isPublic: Boolean
  └── unlockedAt: DateTime
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database (Neon recommended)
- Google OAuth credentials (optional)
- Anthropic API key (optional — falls back to heuristics)

### Setup

```bash
# Clone and install
git clone https://github.com/your-username/lifetracker
cd lifetracker
npm install

# Environment
cp .env.example .env.local
# Fill in your values

# Database
npx prisma migrate dev
npx prisma generate

# Run
npm run dev
```

### Environment Variables

```env
DATABASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ANTHROPIC_API_KEY=
```

---

## Testing

```bash
npm run test:run        # all tests
npm run test:unit       # unit tests only
npm run test:integration # integration tests only
npm run test:coverage   # coverage report
```

**68 tests** across 4 files covering:
- WU formula and resistance multiplier boundaries
- Recall heuristic evaluation
- Achievement catalogue integrity (36 achievements)
- Domain CRUD with auth scoping
- Task lifecycle — create, start, complete, fail, delete
- Achievement evaluation — hidden (instant) and mastery (threshold)

---

## CI/CD

Every push to `main` runs:

```
Type Check → Lint → Tests → Build
```

Vercel deployment is blocked until all checks pass.

---

## Roadmap

- [ ] Battle Ground — 1v1 WU bets, week duration, winner takes all
- [ ] Public profiles — achievement display, domain mastery visible to others
- [ ] Networks — create or join accountability groups
- [ ] Web push notifications — daily mission reminders, streak alerts
- [ ] Streak tracking — consecutive active days
- [ ] Weekly WU summary — domain breakdown, progress over time

---

## Design System

Consistent cyberpunk aesthetic across all pages:

- **Background** — `#050508` near-black with scanline overlay
- **Primary accent** — `#00ffff` cyan
- **Secondary accents** — violet `#a78bfa`, pink `#f472b6`
- **Fonts** — Rajdhani (UI), Share Tech Mono (labels/code)
- **Principle** — neon only on interaction, not by default. The darkness makes the light meaningful.

---

## License

MIT