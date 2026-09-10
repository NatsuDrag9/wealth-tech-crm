# Node.js Architecture & Trade-offs

## Trade-offs: 

### camelCase (Code) vs. snake_case (Wire API)

1. We use **Mongoose `toJSON`** as a mandatory data-sanitization layer to strip passwords and map `_id` to `id` on database documents (which middleware cannot safely know how to do).
2. We chose the **centralized response interceptor middleware** for global wire formatting because it automatically transforms all responses (including pagination envelopes) to snake_case without the maintenance fatigue of **40+ manual DTOs**, the decorator/reflection overhead of **`class-transformer`**, or the outbound redundancy of **Zod**.

### Slim vs. Fat JWT (Stateful DB Verification vs. Stateless Claims)

1. We use a **Slim JWT** containing only the user's `email` as the subject, keeping tokens minimal and matching the Spring Boot backend (`JwtTokenProvider.java`).
2. We rejected a **Fat JWT** (embedding permissions) because if an admin revokes access, a fat JWT still allows the user to access the application with old permissions for 15 minutes until the token expires.
