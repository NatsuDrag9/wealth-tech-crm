# RAG & Agentic Architecture Specification

> **Reference Diagrams:**
> - [RAG_Question_To_Generation_Implementation_Flow.png](../assets/RAG_Question_To_Generation_Implementation_Flow.png)
> - [RA_With_Post_Retrival_Validation_Pipeline_Flow.png](../assets/RA_With_Post_Retrival_Validation_Pipeline_Flow.png)
> - [Full_Agentic_RAG_Architecture.png](../assets/Full_Agentic_RAG_Architecture.png)

---

## 1. RAG Question-to-Generation Implementation Flow

This flow shows the complete journey from an RM or Agent asking a question to generating a verified, cited answer, complete with an evidence quality gate and retry loop.

```text
               RM / Agent Question
                        │
                        ▼
               Query Understanding
         Intent + Retrieval Constraints
                        │
                        ▼
         Deterministic Candidate Filtering
               • Eligible funds
               • Active status
               • Risk / category
               • Asset class
                        │
                        ▼
             Eligible Candidate Funds
                        │
                        ▼
                Hybrid Retrieval
                  │          │
        ┌─────────┴──────────┴────────┐
        ▼                             ▼
  Vector Search             Full-Text / Keyword
  pgvector + HNSW                  Search
        │                             │
        └─────────┬───────────────────┘
                  ▼
           Fusion / Ranking
                  │
                  ▼
        Top-K Relevant Evidence
                  │
                  ▼
        Evidence Quality Gate
          │                │
        (PASS)           (FAIL)
          │                │
          │                ▼
          │      Refine Query / Retry Retrieval
          │                │
          │                └─────────────────────────┐
          ▼                                          │
Build Grounded LLM Context                           │
          │                                          │
          ▼                                          │
LLM / Grounded Synthesis                             │
          │                                          │
          ▼                                          │
  Answer + Citations                                 │
          │                                          │
          ▼                                          │
      RM / Agent ◄───────────────────────────────────┘ (Loops back to Hybrid Retrieval)
```

### Step-by-Step Breakdown

1. **RM / Agent Question**  
   The Relationship Manager (or an automated assistant) asks a question about an investment, fund comparison, or portfolio change.

2. **Query Understanding (Intent + Retrieval Constraints)**  
   The system reads the question to determine the user's goal and pulls out search filters like risk band and fund category.

3. **Deterministic Candidate Filtering**  
   The system checks the database to filter out any funds that are inactive, unapproved, or unsuitable for the client's risk profile.

4. **Eligible Candidate Funds**  
   The database produces a clean, approved list of allowed candidate funds for this client.

5. **Hybrid Retrieval**  
   The system searches through the approved funds' document records using two search techniques in parallel.

6. **Vector Search (pgvector + HNSW)**  
   Searches the text paragraphs based on overall meaning and financial concepts using cosine similarity.

7. **Full-Text / Keyword Search (GIN index)**  
   Searches the text paragraphs for exact matches on fund names and ISIN numbers. This is done via GIN index of postgresql. **Metadata** (`asset_class`, `risk_category`) filtering is done via B-tree indexes

8. **Fusion / Ranking**  
   Combines the scores from both search methods so the most relevant text chunks rise to the top.

9. **Top-K Relevant Evidence**  
   The highest-scoring pieces of evidence are gathered as candidate context; our SQL query automatically handles this top-K cutoff using `LIMIT :limit`.

10. **Evidence Quality Gate**  
    A quality checkpoint that tests whether the retrieved text is relevant enough and reliable enough to answer the question.

11. **Refine Query / Retry Retrieval (FAIL)**  
    If the evidence is not strong enough, the system rewrites the search query and retries retrieval to find better facts.

12. **Build Grounded LLM Context (PASS)**  
    If the evidence passes quality checks, the system packages the user's question together with the verified facts into an AI prompt.

13. **LLM / Grounded Synthesis**  
    The AI model reads the prompt and drafts an answer using only the provided facts, preventing false or made-up numbers.

14. **Answer + Citations**  
    The final response is formatted with clear source notes showing the factsheet dates and document names.

15. **RM / Agent**  
    The Relationship Manager receives the verified, clear answer on their screen, ready to use with the client.

---

## 2. Retrieval & Augmentation (RA) with Post-Retrieval Validation Pipeline Flow

This flow zooms into the retrieval engine, detailing the candidate selection steps, the dual search mechanisms, and the two specific quality metrics used to validate evidence.

```text
                  Post-Retrieval Validation
                             │
                             ▼
              ┌─────────────────────────────┐
              │    Evidence Quality Gate    │
              │                             │
              │ Metric 1:                   │
              │ rag_similarity_score        │
              │ Semantic relevance of       │
              │ retrieved chunks            │
              │                             │
              │ Metric 2:                   │
              │ evidence_consistency_score  │
              │ % of retrieved chunks       │
              │ consistent with expected    │
              │ fund / metadata constraints │
              └──────────────┬──────────────┘
                             │
                             ▼
                    Evidence Sufficient?
                      │            │
                    (PASS)       (FAIL)
                      │            │
                      ▼            ▼
             Grounded Evidence   Refine Query / Retry Retrieval
                 Context                   │
                                           ▼
                                         Query
                                           │
                                           ▼
                                Extract Hard Constraints
                                    • Eligible fund
                                    • Active
                                    • Risk / category
                                    • Asset class
                                           │
                                           ▼
                               Candidate Eligible Funds
                                           │
                                           ▼
                               Candidate Document Chunks
                                     │           │
                          ┌──────────┴───────────┴──────────┐
                          ▼                                 ▼
                   Vector Retrieval                 Keyword Retrieval
                HNSW / Cosine Similarity             Full-Text Search
                          │                                 │
                          └──────────────┬──────────────────┘
                                         ▼
                               Hybrid Fusion / Ranking
                                         │
                                         ▼
                               Top-K Retrieved Chunks
                                         │
                                         └──────────────────────────┐
                                                                    ▼
                                                    (Loops back to Post-Retrieval Validation)
```

### Step-by-Step Breakdown

1. **Post-Retrieval Validation**  
   The entry point where newly retrieved document chunks are inspected before they are trusted as truth.

2. **Evidence Quality Gate**  
   A quality checkpoint that evaluates the retrieved text against two measurable standards.

3. **Metric 1: rag_similarity_score**  
   Measures how closely the meaning of the retrieved text matches the question being asked.

4. **Metric 2: evidence_consistency_score**  
   Calculates the percentage of retrieved text chunks that match the required fund metadata (such as risk category and asset class).

5. **Evidence Sufficient?**  
   A decision check that confirms whether the retrieved text meets the minimum score threshold.

6. **Grounded Evidence Context (PASS)**  
   If the scores pass, the evidence is approved and sent forward to help the AI answer the question.

7. **Refine Query / Retry Retrieval (FAIL)**  
   If the scores are too low or inconsistent, the system triggers a query refinement to try retrieving again.

8. **Query**  
   The active search query being used to find candidate facts.

9. **Extract Hard Constraints**  
   The system reads the rules that must be followed, such as active fund status, asset class, and client risk category.

10. **Candidate Eligible Funds**  
    The database selects the specific approved funds that satisfy all hard constraints.

11. **Candidate Document Chunks**  
    The search is restricted only to text paragraphs that belong to those pre-approved candidate funds.

12. **Vector Retrieval (HNSW / Cosine Similarity)**  
    Searches the allowed paragraphs by general meaning to find concepts that fit the query.

13. **Keyword Retrieval (Full-Text Search)**  
    Searches the allowed paragraphs for exact words, ticker symbols, and scheme codes.

14. **Hybrid Fusion / Ranking**  
    Combines the results from both vector and keyword searches into a single, ranked list.

15. **Top-K Retrieved Chunks**  
    The top highest-ranking chunks are collected (automatically bounded by the database via `LIMIT :limit`) and passed back into the Post-Retrieval Validation gate for verification.
