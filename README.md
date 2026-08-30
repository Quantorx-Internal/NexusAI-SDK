# AI Assistant SDK (Expo React Native)

An embeddable AI chat SDK for **Expo React Native** with voice, Arabic/RTL support, and customizable UI.

---

## Features

* 🎤 Speech-to-Text (OpenAI / Self-hosted)
* 🔊 Text-to-Speech (OpenAI / Resemble)
* 🌍 English & Arabic
* ↔️ Full RTL support
* 🎨 Customizable UI

---

## Requirements

* **Node.js** `>= 18`
* **npm** or **yarn`
* **Expo Go** (or Android Emulator / iOS Simulator)

```bash
node -v
npm -v
```

---

## Project Structure

```
ai-assistant/
├── src/                  # SDK source
│   └── config/constants.ts
├── example/              # Expo example app
└── README.md
```

---

## Installation

### 1. Clone the Repo

```bash
git clone https://github.com/MoaazELDemery/ai-assistant.git
cd ai-assistant
```

### 2. Install SDK Dependencies

```bash
npm install
```

### 3. Install Example App Dependencies

```bash
cd example
npm install
```

### 4. Install Required Expo Modules

```bash
npx expo install expo-av expo-file-system react-native-safe-area-context @react-native-async-storage/async-storage lucide-react-native
```

---

## Environment Configuration

Edit:

```
src/config/constants.ts
```

```ts
export const ENV = {
  // Backend
  N8N_WEBHOOK_URL: 'https://your-n8n-server/webhook/chat',
  API_CALLBACK_URL: 'https://your-api.com',
  NGROK_URL: 'https://ungravelly-lydia-thornily.ngrok-free.dev',

  // NGROK_URL Locations:
  example\.env
  example\src\config\constants.ts
  src\config\constants.ts
  
  // OpenAI
  OPENAI_API_KEY: 'sk-xxxxxxxx',

  // Speech to Text
  STT_PROVIDER: 'openai', // or 'self-hosted'
  STT_SELF_HOSTED_URL: 'http://localhost:8000',

  // Text to Speech
  TTS_PROVIDER: 'resemble', // or 'openai'
  RESEMBLE_API_TOKEN: 'your-resemble-token',
  RESEMBLE_VOICE_UUID_AR: 'arabic-voice-id',
  RESEMBLE_VOICE_UUID_EN: 'english-voice-id',
};
```

> ⚠️ Do not commit API keys.

---

## Running the App

From the repository root:

```bash
npm start
```

Or from the example app directory:

```bash
cd example
npm start
```

* Press `a` → Android
* Press `i` → iOS
* Or scan QR with Expo Go

---

## Using the SDK

```tsx
import { AiAssistantChat } from 'ai-assistant';

export default function App() {
  return <AiAssistantChat />;
}
```

### Start in Arabic

```tsx
<AiAssistantChat locale="ar" />
```

---

## Props

| Prop   | Type        | Default | Description      |
| ------ | ----------- | ------- | ---------------- |
| locale | 'en' | 'ar' | 'en'    | Initial language |
| style  | ViewStyle   | —       | Container style  |

---

## Advanced Usage

```tsx
import { ChatScreen, LocaleProvider } from 'ai-assistant';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  return (
    <LocaleProvider>
      <SafeAreaProvider>
        <ChatScreen />
      </SafeAreaProvider>
    </LocaleProvider>
  );
}
```

---

## Troubleshooting

```bash
npm start -- --clear
```

---

## License

MIT © AI Assistant SDK
