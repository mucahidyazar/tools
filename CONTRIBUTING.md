# Contributing

Use Node.js 24, npm and the checked-in lockfile. Preserve the Next.js App Router, design system and language conventions.

1. Discuss substantial features or calculation-rule changes in an issue; include authoritative sources for formulas/data.
2. Make a focused branch. Never commit `.env`, SQLite databases, account credentials, private logs or personal inputs.
3. Add regression tests for meaningful changes, including boundaries, invalid input and privacy-sensitive behavior.
4. Run `npm run check` and `npm run build`. For UI changes, run relevant Playwright tests and inspect mobile, keyboard/focus, error states and reduced motion.
5. Explain the change and actual validation in the pull request. Review data and snapshot changes instead of blindly re-recording them.

Keep calculations in the browser. Do not send inputs, generated passwords or URL query strings to usage counters, analytics or ads. Public `NEXT_PUBLIC_*` values must never contain secrets.

Report sensitive security problems privately to the maintainer rather than opening a public issue with exploit details or credentials.
