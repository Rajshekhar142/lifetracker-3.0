# Testing Setup

## Install dependencies

```bash
npm install -D vitest @vitest/coverage-v8
```

## Add to package.json scripts

```json
"scripts": {
  "test":            "vitest",
  "test:run":        "vitest run",
  "test:coverage":   "vitest run --coverage",
  "test:unit":       "vitest run tests/unit",
  "test:integration": "vitest run tests/integration"
}
```

## File placement

```
vitest.config.ts                              ← project root
tests/
  setup.ts                                    ← global mocks
  unit/
    wu-formula.test.ts                        ← WU + recall heuristic
    achievement-catalogue.test.ts             ← catalogue integrity
  integration/
    domain-actions.test.ts                    ← domain CRUD
    task-and-achievements.test.ts             ← task CRUD + evaluation
```

## Run tests

```bash
npm test                  # watch mode
npm run test:run          # single run, all tests
npm run test:unit         # unit tests only (fast)
npm run test:integration  # integration tests only
npm run test:coverage     # coverage report
```

## Test count

| File                          | Tests |
|-------------------------------|-------|
| wu-formula.test.ts            | 18    |
| achievement-catalogue.test.ts | 14    |
| domain-actions.test.ts        | 14    |
| task-and-achievements.test.ts | 22    |
| **Total**                     | **68**|