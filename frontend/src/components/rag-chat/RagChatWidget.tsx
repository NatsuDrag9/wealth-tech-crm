import {
  useState,
  useRef,
  useEffect,
  type ReactElement,
  type FormEvent,
} from 'react';
import {
  MessageSquareQuote,
  X,
  Send,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  FileText,
} from 'lucide-react';
import { useQueryRagMutation } from '@/services/api/ragApi';
import type { ChatMessage, RetrievedEvidenceChunk } from '@/definitions/ragTypes';
import { SUGGESTED_PROMPTS, INITIAL_ASSISTANT_MESSAGE } from './constants';
import type {
  RagChatWidgetProps,
  ChatMessageItemProps,
  EvidenceDetailModalProps,
} from './types';
import './RagChatWidget.scss';

function EvidenceDetailModal({
  chunk,
  onClose,
}: EvidenceDetailModalProps): ReactElement | null {
  if (!chunk) return null;

  return (
    <div className="rag-evidence-modal" role="dialog" aria-modal="true">
      <div className="rag-evidence-modal__content">
        <div className="rag-evidence-modal__header">
          <div className="rag-evidence-modal__title">Retrieved Evidence Source</div>
          <button
            type="button"
            className="rag-evidence-modal__close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="rag-evidence-modal__meta">
          <span>{`Fund: ${chunk.fundName}`}</span>
          <span>{`ISIN: ${chunk.isin}`}</span>
          <span>{`Doc Type: ${chunk.documentType}`}</span>
          {chunk.similarityScore !== undefined ? (
            <span>{`Score: ${(chunk.similarityScore * 100).toFixed(1)}%`}</span>
          ) : null}
        </div>

        <div className="rag-evidence-modal__body">
          {chunk.chunkText}
        </div>
      </div>
    </div>
  );
}

function ChatMessageItem({
  message,
  onInspectChunk,
}: ChatMessageItemProps): ReactElement {
  const isUser = message.sender === 'user';
  const citations = message.citations ?? [];
  const chunks = message.evidenceChunks ?? [];

  return (
    <div
      className={`rag-chat-drawer__msg ${
        isUser ? 'rag-chat-drawer__msg--user' : 'rag-chat-drawer__msg--assistant'
      }`}
    >
      <div className="rag-chat-drawer__msg-bubble">
        {message.text}
      </div>

      <div className="rag-chat-drawer__msg-meta">
        <span>{message.timestamp}</span>

        {!isUser && message.isGrounded !== undefined ? (
          <span
            className={`rag-chat-drawer__grounded-badge ${
              message.isGrounded
                ? 'rag-chat-drawer__grounded-badge--grounded'
                : 'rag-chat-drawer__grounded-badge--ungrounded'
            }`}
          >
            {message.isGrounded ? (
              <>
                <ShieldCheck size={12} />
                <span>Grounded</span>
              </>
            ) : (
              <>
                <AlertTriangle size={12} />
                <span>Ungrounded</span>
              </>
            )}
          </span>
        ) : null}

        {!isUser && message.latencyMs !== undefined ? (
          <span className="rag-chat-drawer__latency-pill">
            {`${message.latencyMs}ms`}
          </span>
        ) : null}
      </div>

      {!isUser && citations.length > 0 ? (
        <div className="rag-chat-drawer__citations-list">
          {citations.map((isin) => {
            const matchedChunk = chunks.find((c) => c.isin === isin);
            return (
              <button
                key={isin}
                type="button"
                className="rag-chat-drawer__citation-tag"
                onClick={() => {
                  if (matchedChunk) {
                    onInspectChunk(matchedChunk);
                  }
                }}
                title="View retrieved evidence chunk"
              >
                <FileText size={10} style={{ marginRight: '0.2rem' }} />
                <span>{isin}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function RagChatWidget({
  initialOpen = false,
}: RagChatWidgetProps): ReactElement {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_ASSISTANT_MESSAGE]);
  const [activeChunk, setActiveChunk] = useState<RetrievedEvidenceChunk | null>(null);
  const [conversationId] = useState<string>(`conv-${Date.now()}`);

  const [queryRag, { isLoading }] = useQueryRagMutation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  async function handleSend(textToSend?: string) {
    const query = (textToSend ?? inputText).trim();
    if (!query || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');

    try {
      const response = await queryRag({
        query,
        conversationId,
      }).unwrap();

      const assistantMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: response.answer || response.message || 'No response synthesized.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isGrounded: response.isGrounded,
        citations: response.citations,
        evidenceChunks: response.evidenceChunks,
        latencyMs: response.totalLatencyMs,
        similarityScore: response.similarityScore,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: 'Failed to synthesize answer from RAG service. Please verify backend connectivity.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isGrounded: false,
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    handleSend();
  }

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        type="button"
        className="rag-floating-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Open RAG Advisory Copilot"
        aria-label="Open RAG Advisory Copilot"
      >
        <div className="rag-floating-trigger__icon">
          {isOpen ? <X size={22} /> : <MessageSquareQuote size={22} />}
        </div>
        <div className="rag-floating-trigger__badge" />
      </button>

      {/* Floating Chat Drawer */}
      {isOpen ? (
        <div className="rag-chat-drawer" role="region" aria-label="RAG Advisory Copilot">
          <div className="rag-chat-drawer__header">
            <div className="rag-chat-drawer__header-left">
              <Sparkles size={18} />
              <div>
                <div className="rag-chat-drawer__header-title">Advisory Copilot</div>
                <div className="rag-chat-drawer__header-subtitle">Grounded RAG Intelligence</div>
              </div>
            </div>
            <div className="rag-chat-drawer__header-actions">
              <button
                type="button"
                className="rag-chat-drawer__header-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Close Chat"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="rag-chat-drawer__messages-area">
            {messages.map((msg) => (
              <ChatMessageItem
                key={msg.id}
                message={msg}
                onInspectChunk={(chunk) => setActiveChunk(chunk)}
              />
            ))}

            {messages.length === 1 ? (
              <div className="rag-chat-drawer__prompt-chips">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="rag-chat-drawer__chip"
                    onClick={() => handleSend(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            ) : null}

            {isLoading ? (
              <div className="rag-chat-drawer__msg rag-chat-drawer__msg--assistant">
                <div className="rag-chat-drawer__msg-bubble">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Retrieving evidence and synthesizing grounded response...</span>
                  </div>
                </div>
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>

          <form className="rag-chat-drawer__input-form" onSubmit={handleSubmit}>
            <input
              type="text"
              className="rag-chat-drawer__text-input"
              placeholder="Ask RAG Copilot..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="submit"
              className="rag-chat-drawer__send-btn"
              disabled={isLoading || !inputText.trim()}
              aria-label="Send Message"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      ) : null}

      {/* Evidence Modal */}
      <EvidenceDetailModal
        chunk={activeChunk}
        onClose={() => setActiveChunk(null)}
      />
    </>
  );
}
