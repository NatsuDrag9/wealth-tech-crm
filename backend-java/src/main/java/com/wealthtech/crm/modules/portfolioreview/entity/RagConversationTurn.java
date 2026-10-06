package com.wealthtech.crm.modules.portfolioreview.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.*;

/**
 * Entity tracking individual dialogue turns in a multi-turn RAG advisory conversation.
 * Implements Approach A (Window Buffer Memory): stores turns sequentially per conversationId
 * so the synthesis engine can inject the last N turns into the LLM context.
 */
@Entity
@Table(name = "rag_conversation_turns", indexes = {
    @Index(name = "idx_rag_turn_conv_id", columnList = "conversation_id"),
    @Index(name = "idx_rag_turn_created", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RagConversationTurn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "conversation_id", nullable = false, length = 64)
    private String conversationId;

    @Column(name = "turn_index", nullable = false)
    private Integer turnIndex;

    @Column(name = "user_query", nullable = false, columnDefinition = "TEXT")
    private String userQuery;

    @Column(name = "synthesized_answer", nullable = false, columnDefinition = "TEXT")
    private String synthesizedAnswer;

    @Column(name = "is_grounded", nullable = false)
    private Boolean isGrounded;

    @Column(name = "client_id")
    private Long clientId;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
