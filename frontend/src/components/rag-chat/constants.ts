import type { ChatMessage } from '@/definitions/ragTypes';

export const SUGGESTED_PROMPTS: readonly string[] = [
  'Explain asset allocation strategy for high-risk profiles',
  'Which eligible funds have an ESG score above 70?',
  'What are the regulatory compliance guidelines for fund replacement?',
  'Compare returns and risk ratios across large-cap and multi-cap funds',
] as const;

export const INITIAL_ASSISTANT_MESSAGE: ChatMessage = {
  id: 'rag-welcome',
  sender: 'assistant',
  text: 'Hello! I am your AI Advisory Copilot powered by Grounded RAG. '
    + 'Ask me any questions on fund research, risk appetite, or SEBI compliance.',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  isGrounded: true,
  citations: [],
  evidenceChunks: [],
};
