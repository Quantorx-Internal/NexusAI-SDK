// AI Assistant SDK - Main Entry Point
// Configure your API keys in src/config/constants.ts

// Main Chat Component - Default export for easy embedding
export { AiAssistantChat, default } from './AiAssistantChat';
export type { AiAssistantChatProps } from './AiAssistantChat';

// Contexts
export { LocaleProvider, useLocale } from './contexts/LocaleContext';
export type { Locale } from './contexts/LocaleContext';

// Services
export { ChatService } from './services/ChatService';
export { VoiceService } from './services/VoiceService';
export type {
    SpeechAudioChunk,
    SpeechSynthesisBatch,
    TextToSpeechOptions,
} from './services/VoiceService';
export { SpeechTextService } from './services/SpeechTextService';
export type {
    PreparedSpeech,
    PrepareSpeechOptions,
    SpeechSpeakerSex,
    TtsEngine,
} from './services/SpeechTextService';
export { AppResetManager, CleanupPriority } from './services/AppResetManager';
export { AGENT_VOICES, getAgentVoice } from './config/agentVoices';
export type { AgentVoice, AgentVoiceId } from './config/agentVoices';

// Hooks
export { useSpeech } from './hooks/useSpeech';
export { useAppReset, useAudioCleanup, useRecordingCleanup } from './hooks/useAppReset';

// Chat Screen (if you want to use directly without wrapper)
export { ChatScreen } from './views/ChatScreen';

// Components
export { ChatMessage } from './components/Chat/ChatMessage';
export { ChatInput } from './components/Chat/ChatInput';
export { TypingIndicator } from './components/Chat/TypingIndicator';
export { SimpleMarkdownRenderer } from './components/Chat/SimpleMarkdownRenderer';

// Block components
export { AccountListBlock } from './components/Chat/blocks/AccountListBlock';
export { BeneficiaryListBlock } from './components/Chat/blocks/BeneficiaryListBlock';
export { TransferPreviewBlock } from './components/Chat/blocks/TransferPreviewBlock';

// Types
export * from './types';

// Config - Export ENV so host app can override if needed
export { ENV } from './config/constants';
