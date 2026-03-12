# LifeTracker 3.0

> *A personal productivity OS built on the philosophy that human potential spans seven domains — and growth in each compounds against all others.*

---

## Philosophy

Most productivity tools track tasks. LifeTracker tracks **you** — across every dimension of a complete human life.

The seven domains:

| Domain | What it covers |
|--------|---------------|
| **Physical** | Health, fitness, body |
| **Mental** | Learning, knowledge, cognition |
| **Emotional** | Self-awareness, regulation, relationships |
| **Spiritual** | Purpose, values, meaning |
| **Social** | Community, network, contribution |
| **Financial** | Wealth, assets, financial intelligence |
| **Vocational** | Career, craft, creative output |

Every task you complete earns **Work Units (WU)** — a single number that captures not just time spent, but how hard the task actually was and how well you retained the knowledge.

---

## The WU Formula

```
WU = (duration_minutes / 60) × resistance_multiplier × recall_multiplier
```

**Resistance levels:**

| Level | Multiplier | Meaning |
|-------|-----------|---------|
| 1 | 1.0× | Routine |
| 2 | 1.5× | Moderate effort |
| 3 | 2.25× | Challenging |
| 4 | 3.0× | Very hard |
| 5 | 4.0× | Extreme |

**Recall multiplier (Feynman technique):**

After completing a task you explain what you did in plain language. The depth of your explanation determines your recall score (0.5× to 2.0×). This means a 30-minute task at resistance 5 with perfect recall is worth more than a 2-hour routine task done mindlessly.

---

## Features

### Core
- **7-domain task system** — every task belongs to a domain, earns domain-specific WU
- **Resistance levels** — rate how hard each task was before completing
- **Recall evaluation** — post-completion Feynman explanation scored by AI
- **WU accumulation** — lifetime score across all domains

### Shadow Bot
A silent ninja that watches your output. Never speaks unless you push past your threshold.

- Tracks your **rolling 7-day average WU per domain**
- Sets a threshold at **115% of your average**
- Eyes stay dark while you work — **light up cyan** when you cross the threshold for a domain
- Threshold **updates every 7 days** — progressive overload. As you get stronger, the bar rises
- Lives as a **persistent strip** on the mission page — always visible, always watching

### Medic Bot
Recovery protocol for bad days. Lowers the floor, not the ceiling.

- Activate when you're struggling — describe how you feel, rate severity 1-5
- **Groq AI** (Llama 3) generates domain-specific gentle recovery tasks
- Falls back to rule-based suggestions if AI is unavailable
- Logs every bad day — tracks **recovery time, stress patterns, trigger keywords**
- **Weekly digest** — analytics on your hard days, strongest domains, recurring triggers
- Digest sent via **Resend** email every Monday

### Achievement System
36 achievements across mastery tiers and hidden unlocks.

**Mastery tiers per domain** (earned by cumulative WU):
- Novice → Apprentice → Operator → Elite

**Hidden achievements** — unlocked by behavior patterns:
- Consistency streaks, extreme resistance tasks, perfect recall, multi-domain days, and more

Achievements fire as **toast notifications** on task completion.

### Networks
Domain-focused groups of up to 20 members.

- Create a network around any domain
- Share an **invite link** — join page shows domain, member count, creator
- **Leaderboard** — rolling 7-day WU rankings among members
- **Member profiles** — mastery tier visible on leaderboard

### Duels
1v1 WU battles with real stakes.

- Challenge any network member to a duel on any domain
- Each player **stakes their own WU bet**
- **7-day window** — whoever earns more domain WU wins
- Winner takes the loser's staked WU — **permanently deducted** from the loser
- Tie goes to the initiator

### Share Card
Weekly summary card for Instagram.

- Cyberpunk-styled image card with total WU, domain breakdown bars
- Generated via **html2canvas** — downloads as PNG, ready to post

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL via Neon (serverless) |
| ORM | Prisma |
| Auth | better-auth (email/password + Google OAuth) |
| AI — Recall | Groq API (Llama 3 8B) |
| AI — Medic | Groq API (Llama 3 8B) |
| Email | Resend |
| PWA | @ducanh2912/next-pwa |
| Styling | CSS-in-JS (inline styles + CSS modules) |
| Testing | Vitest |
| CI/CD | GitHub Actions → Vercel |
| Fonts | Rajdhani, Share Tech Mono |

---

## Project Structure

```
lifetracker-3.0/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── (protected)/
│   │   ├── dashboard/
│   │   ├── domain/
│   │   ├── mission/
│   │   ├── achievements/
│   │   └── network/
│   │       └── join/[inviteCode]/
│   ├── actions/
│   │   ├── domain-actions.ts
│   │   ├── mission-actions.ts
│   │   ├── achievement-store.ts
│   │   ├── medic-actions.ts
│   │   ├── medic-email.ts
│   │   ├── shadow-actions.ts
│   │   └── network-actions.ts
│   └── api/
│       └── auth/[...all]/
├── components/
│   ├── Navbar.tsx
│   ├── ShadowStrip.tsx
│   ├── MedicPanel.tsx
│   ├── ShareCard.tsx
│   └── AchievementToast.tsx
├── lib/
│   ├── auth.ts
│   ├── auth-client.ts
│   └── prisma.ts
├── prisma/
│   └── schema.prisma
└── tests/
    ├── unit/
    │   ├── wu-formula.test.ts
    │   └── achievement-catalogue.test.ts
    └── integration/
        ├── domain-actions.test.ts
        └── task-and-achievements.test.ts
```

---

## Data Model

```
User
 ├── Domain[]              — up to 7 domains
 ├── Task[]                — all tasks across domains
 ├── Achievement[]         — unlocked achievements
 ├── MedicLog[]            — bad day sessions
 ├── WeeklyDigest[]        — monday email digests
 ├── ShadowThreshold[]     — per-domain WU thresholds
 ├── Network[]             — networks created
 ├── NetworkMember[]       — networks joined
 ├── Duel[] (initiator)    — duels started
 └── Duel[] (challenger)   — duels received

Network
 ├── domain                — single domain focus
 ├── inviteCode            — unique join slug
 ├── NetworkMember[]
 └── Duel[]

Duel
 ├── initiator + challenger
 ├── domain                — flexible, any domain
 ├── initiatorBet + challengerBet
 ├── initiatorWU + challengerWU
 ├── status                — Pending | Active | Completed | Declined
 └── winnerId
```

---

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL (or Neon account)
- Groq API key (free at console.groq.com)
- Resend API key (free at resend.com)
- Google OAuth credentials

### Environment Variables

```env
DATABASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
NEXT_PUBLIC_BETTER_AUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GROQ_API_KEY=
RESEND_API_KEY=
```

### Install & Run

```bash
npm install
npx prisma migrate dev
npx prisma generate
npm run dev
```

### Run Tests

```bash
npm run test              # all tests
npm run test:unit         # unit only
npm run test:integration  # integration only
npm run test:coverage     # with coverage report
```

---

## CI/CD

Push to `main` → GitHub Actions runs:
1. Type check (`tsc --noEmit`)
2. Test suite (Vitest)
3. Build (`prisma generate && next build`)
4. Vercel deploys automatically on pass

---

## PWA

Installable on mobile and desktop via `@ducanh2912/next-pwa`. Service worker auto-generated on build. Add to home screen for full app experience — session persists 30 days, no repeated logins.

---

## Roadmap

```
▣ Email OTP verification     — pending domain purchase
▣ Weekly digest cron job     — Vercel cron or external
▣ Duel auto-resolution cron  — runs nightly
▣ Public profiles            — shareable domain mastery page
▣ Battle Ground              — open leaderboard across all users
▣ Shadow weekly challenge    — opt-in weekly WU targets
▣ Mobile push notifications  — PWA push API
```

---

## Design System

**Colors:**
- Background: `#050508`
- Cyan accent: `#00ffff`
- Pink / Medic: `#f472b6`
- Purple: `#a78bfa`
- Gold / Elite: `#fbbf24`

**Typography:**
- Display / UI: `Rajdhani` (700, 600, 500)
- Mono / Labels: `Share Tech Mono`

**Aesthetic:** Cyberpunk terminal — dark backgrounds, glowing accents, scanline textures, monospaced labels, minimal chrome. Every UI element earns its place.

---

*Built to be used daily. Designed to make you better.*
