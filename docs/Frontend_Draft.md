
### Decisions

- **React Hook Form over Formik:** React Hook Form leverages uncontrolled inputs via DOM refs, eliminating Formik's performance bottleneck of re-rendering the entire form tree on every single keystroke. It offers a significantly lighter bundle footprint (~9kB vs ~15kB), native integration with modern schema validators via `@hookform/resolvers`, and superior TypeScript type inference for dynamic, config-driven form builders.
