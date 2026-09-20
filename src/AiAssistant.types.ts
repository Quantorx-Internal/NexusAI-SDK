import type { StyleProp, ViewStyle } from 'react-native';

export type Locale = 'en' | 'ar';

export type AiAssistantConfig = {
  /** n8n Webhook URL for chat API */
  webhookUrl: string;
  /** Optional API callback URL for n8n to fetch data */
  apiCallbackUrl?: string;
  /** OpenAI API Key for speech recognition */
  openaiApiKey?: string;
  /** Runpod API key for OmniVoice/VoxCPM synthesis */
  runpodApiKey?: string;
  /** Live chat defaults to OmniVoice; VoxCPM is intended for voice design. */
  ttsEngine?: 'omnivoice' | 'voxcpm2';
  /** OpenRouter key used to rewrite replies into natural spoken language */
  openRouterApiKey?: string;
  /** OpenRouter model used by the speech rewrite step */
  ttsRewriteModel?: string;
  /** STT Provider: 'openai' | 'self-hosted' */
  sttProvider?: 'openai' | 'self-hosted';
  /** Self-hosted STT URL (if sttProvider is 'self-hosted') */
  sttSelfHostedUrl?: string;
  /** Runpod OmniVoice endpoint ID */
  omnivoiceEndpointId?: string;
  /** Runpod VoxCPM endpoint ID */
  voxcpmEndpointId?: string;
};

export type AiAssistantChatProps = {
  /** SDK Configuration */
  config: AiAssistantConfig;
  /** Initial locale/language */
  locale?: Locale;
  /** Enable auto-speak for assistant messages */
  autoSpeak?: boolean;
  /** Show language toggle in header */
  showLanguageToggle?: boolean;
  /** Custom header title */
  headerTitle?: string;
  /** Container style */
  style?: StyleProp<ViewStyle>;
  /** Callback when locale changes */
  onLocaleChange?: (locale: Locale) => void;
  /** Callback when chat session starts */
  onSessionStart?: (sessionId: string) => void;
  /** Callback when message is sent */
  onMessageSent?: (message: string) => void;
  /** Callback when assistant responds */
  onAssistantResponse?: (response: any) => void;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  ui?: {
    showAccounts?: boolean;
    showBeneficiaries?: boolean;
    transferPreview?: any;
    transferSuccess?: any;
    exchangeRate?: any;
    requestOtp?: boolean;
  };
  accounts?: Account[];
  beneficiaries?: Beneficiary[];
  transferPreview?: any;
};

export type Account = {
  id: string;
  name: string;
  nameAr?: string;
  accountNumber: string;
  balance: number;
  currency: string;
  type: 'current' | 'savings';
};

export type Beneficiary = {
  id: string;
  name: string;
  nameAr?: string;
  bankName: string;
  bankNameAr?: string;
  accountNumber: string;
  country?: string;
  currency?: string;
};

// Legacy types for backwards compatibility
export type OnLoadEventPayload = {
  url: string;
};

export type AiAssistantModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
};

export type ChangeEventPayload = {
  value: string;
};

export type AiAssistantViewProps = {
  url: string;
  onLoad: (event: { nativeEvent: OnLoadEventPayload }) => void;
  style?: StyleProp<ViewStyle>;
};
