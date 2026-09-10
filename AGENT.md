# Project Conventions

## Git Commit Protocol
- Whenever creating a git commit, always slice workspace diffs into separate, granular commits to separate concerns.
- Always check existing formatting guidelines by running `git log --oneline -n 5` before creating messages.
- Match existing commit formats exactly.

## Code Review Protocol
- Whenever asked to review a file or a block of code, you must compile the project and run the unit tests first.
- Include the test outcomes, errors, or logs as part of your evaluation in the code review feedback.
