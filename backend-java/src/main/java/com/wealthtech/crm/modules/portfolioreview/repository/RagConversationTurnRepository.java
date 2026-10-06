package com.wealthtech.crm.modules.portfolioreview.repository;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.wealthtech.crm.modules.portfolioreview.entity.RagConversationTurn;

/**
 * Repository interface for managing persistent conversation turns in multi-turn RAG dialogues.
 */
@Repository
public interface RagConversationTurnRepository extends JpaRepository<RagConversationTurn, Long> {

    /**
     * Retrieves the most recent N turns for a conversation ordered ascending by turn index
     * for prompt context window assembly.
     */
    @Query("SELECT t FROM RagConversationTurn t WHERE t.conversationId = :conversationId ORDER BY t.turnIndex ASC")
    List<RagConversationTurn> findByConversationIdOrderByTurnIndexAsc(@Param("conversationId") String conversationId);

    /**
     * Finds the maximum turn index for an existing conversationId, or null if conversation is new.
     */
    @Query("SELECT MAX(t.turnIndex) FROM RagConversationTurn t WHERE t.conversationId = :conversationId")
    Integer findMaxTurnIndexByConversationId(@Param("conversationId") String conversationId);

    /**
     * Deletes all turns belonging to a conversation session (e.g. on session reset or cleanup).
     */
    void deleteByConversationId(String conversationId);
}
