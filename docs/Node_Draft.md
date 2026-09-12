# Node.js Backend

## Architecture

### Client

In wealth management, the client lifecycle revolves around compliance (KYC) and relationship ownership (RM):

```
┌────────────────┐         KYC Verified           ┌──────────────┐
│   ONBOARDING   │ ─────────────────────────────▶ │    ACTIVE    │
└────────────────┘                                └──────────────┘
        │                                                 │
        │                   Manual Hold                   │
        └───────────────────────────────────────────────▶ │   INACTIVE   │
                                                          └──────────────┘
```

#### Key Business & System Design Rules in `clientService`:

1. **The KYC Approval Trigger**: When compliance verifies a client (`verifyKyc(clientId, KycStatus.VERIFIED)`), the service automatically promotes the client from `ONBOARDING` to `ACTIVE`.
2. **Automatic RM Fallback**: When a client is onboarded without explicitly choosing an RM, the service automatically assigns the currently logged-in employee (`currentUserId`) as the Relationship Manager.
3. **Duplicate Prevention**: Before creating a client, check uniqueness on email, phone, and PAN (logging a warning before throwing `AppError(..., 409)`).
4. **Two-Collection Mapping**: `mapToClientResponse` merges `Client` with `ClientProfile.kycStatus` and resolves `relationshipManager` into a `{ display_name, value }` `DropdownOption<string>`.
5. **Background Batch Ingestion (`processBulkUploadAsync`)**: Processes parsed Excel rows in the background, quietly skipping duplicates (email/phone/PAN) and logging batch summary metrics without blocking the HTTP response.

### Error Handling Pipeline

```
Service / Controller
  │
  ├─► throws new AppError("Client not found", 404)
  │
  ▼
asyncHandler (Promise.resolve(...).catch(next))
  │
  ├─► routes error to Express error chain via next(err)
  │
  ▼
errorHandler (Express 4-arg middleware)
  │
  ├─► Recognizes err instanceof AppError
  ├─► Extracts err.statusCode (404) and err.message
  ├─► Logs structured client warning: logger.warn(...)
  │
  ▼
HTTP JSON Response (res.status(statusCode).json(...))
```

1. **Throw (`AppError`)**: When a business rule fails, the service throws an `AppError` carrying a clear message and HTTP status code (e.g., 404).
2. **Catch (`asyncHandler`)**: Intercepts rejected promises from async controller methods and cleanly forwards them to Express via `next(err)`, avoiding unhandled crashes.
3. **Handle (`errorHandler`)**: The global error middleware recognizes `AppError`, logs a structured warning, and extracts the status code and message.
4. **Respond**: Formats and returns a uniform JSON response (`{ status: "fail", message }`) with the appropriate HTTP status code.

## Decisions and Trade-Offs: 

### camelCase (Code) vs. snake_case (Wire API)

1. We use **Mongoose `toJSON`** as a mandatory data-sanitization layer to strip passwords and map `_id` to `id` on database documents (which middleware cannot safely know how to do).
2. We chose the **centralized response interceptor middleware** for global wire formatting because it automatically transforms all responses (including pagination envelopes) to snake_case without the maintenance fatigue of **40+ manual DTOs**, the decorator/reflection overhead of **`class-transformer`**, or the outbound redundancy of **Zod**.

### Slim vs. Fat JWT (Stateful DB Verification vs. Stateless Claims)

1. We use a **Slim JWT** containing only the user's `email` as the subject, keeping tokens minimal and matching the Spring Boot backend (`JwtTokenProvider.java`).
2. We rejected a **Fat JWT** (embedding permissions) because if an admin revokes access, a fat JWT still allows the user to access the application with old permissions for 15 minutes until the token expires.

### Controller vs. Service Layer Separation

1. Extracted database queries and business rules into dedicated services, keeping controllers strictly as thin HTTP transport adapters.
2. Decouples domain logic from Express `req`/`res`, enabling isolated unit testing and multi-transport reusability without HTTP mocking overhead.

### Why Customer has a DTO layer while User Manager doesn't

1. **User Manager**: User data lives in a single database table, and the API returns that record directly with passwords automatically hidden without needing separate DTOs.
2. **Customer**: Customer data is split across two tables (`Client` and `ClientProfile`), so DTOs are used to merge them (e.g. `ClientResponseDto` pulls personal details from `Client` and `kyc_status` from `ClientProfile` into one response for the table view).

