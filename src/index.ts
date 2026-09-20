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
export { TransactionService } from './services/TransactionService';
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
export { ComposerPrompt } from './components/Chat/ComposerPrompt';
export { Composer, SuggestionChips, ListeningOverlay, Waveform } from './components/Chat/Composer';
export { computeSuggestions, matchEntitySlot } from './lib/suggestions';
export type { Suggestion, EntityCandidate, EntityData, SlotMatch, EntitySlot } from './lib/suggestions';

// Block components — all fifteen in-chat cards
export * from './components/Chat/blocks';

// Shared elements (card chassis, status pill, detail row, action row, copy
// field, proportion bar, section header, result band).
// The chassis is exported as `CardChassis` so it does not collide with the
// `Card` banking type below.
export { Card as CardChassis } from './components/ui';
export type { CardVariant } from './components/ui';
export {
    IconBox,
    iconOn,
    StatusPill,
    DetailRow,
    ActionRow,
    Button,
    CopyField,
    ProportionBar,
    StackedBar,
    RampKey,
    rampAt,
    RAMP,
    SectionHeader,
    EmptyState,
    SkeletonRows,
    ResultBand,
    ResultBody,
    RowDivider,
} from './components/ui';

// Design tokens — the single source for colour, type, spacing and radii
export { tokens, color, type as typeScale, space, layout, radius, size, text } from './theme/tokens';
export type { Tone, TypeRole } from './theme/tokens';

// Types
export * from './types';

// Config - Export ENV so host app can override if needed
export { ENV } from './config/constants';
