import type { ChatMessage, RetrievedEvidenceChunk } from '@/definitions/ragTypes';

export interface RagChatWidgetProps {
  initialOpen?: boolean;
}

export interface ChatMessageItemProps {
  message: ChatMessage;
  onInspectChunk: (chunk: RetrievedEvidenceChunk) => void;
}

export interface EvidenceDetailModalProps {
  chunk: RetrievedEvidenceChunk | null;
  onClose: () => void;
}
