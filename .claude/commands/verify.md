---
description: Run the checks pages.yml requires before publishing
---
Run every command in the "Verification" section of `AGENTS.md`, then any browser suites `site/AGENTS.md` calls for given the files changed on this branch (`git diff --name-only origin/main...`). Report each command's result; for failures, show the relevant output and propose a fix. $ARGUMENTS
