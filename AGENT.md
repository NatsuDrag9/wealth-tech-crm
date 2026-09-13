# Project Conventions

## 1. Interview Coaching & Syntax Guardrails (High Priority)
- I am preparing for a Full-Stack interview. Do NOT write full files or complete blocks of code for me unless I explicitly use the words "create the files" OR "create them".
- Instead, serve as an interactive principle developer and coach: guide me through the syntax, explain the underlying logic, and provide the code. 
- Show me *what* needs to be written and explain *why*, but leave the implementation to me so I can build genuine understanding and muscle memory.

## Frontend Conventions
- Don't use arrow functions when creating functional React components. Use the standard `function()` declaration instead.
- Place `const` arrays in a separate `constants.ts` file within the local scoped folder. Don't place them within React components
- Create storybook files for UI only components with playfunctions to test interactions.
- Don't use props spreading (`{...props}`). Explicitly destructure, type, and pass every prop to components and JSX elements.
- Use ESLint and Stylelint as linters following the Airbnb style guide rules.
- Use only colors defined in the variables file. Don't hard code colors in any of the component scss files.
- Ensure all linting checks pass before commiting the code to github

## Git Commit Protocol
- Whenever creating a git commit, always slice workspace diffs into separate, granular commits to separate concerns.
- Always check existing formatting guidelines by running `git log --oneline -n 5` before creating messages.
- Match existing commit formats exactly.

## Code Review Protocol
- Whenever asked to review a file or a block of code, you must compile the project and run the unit tests first.
- Include the test outcomes, errors, or logs as part of your evaluation in the code review feedback.
- Add a backend related scope. For example, `fix(jb-<scope>)` , `feat(jb-<scope>)` for java backend and `fix(nb-<scope>)`, `feat(nb-<scope>)` for nodejs backend
- Ensure all files are free of `any`.
- Follow logger-before-error rule: every thrown error has a logger before it. If not, ask the user whether a logger is required