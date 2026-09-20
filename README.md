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

The example app reads the integration values from `example/.env.local`. To use
the supplied local credentials:

```bash
cp updates/env.local example/.env.local
```

The Runpod integration uses asynchronous `/run` jobs with polling. OmniVoice is
the default live-chat engine; VoxCPM remains available through `VoiceService`.
Before synthesis, replies are redacted, rewritten for spoken Najdi Arabic,
stripped of markup and bracketed tags, and split into balanced sentence chunks.

> `example/.env.local` is ignored by Git. The example exposes these values to
> the native runtime for local development. In a production app, keep Runpod
> and OpenRouter keys on your server and proxy these requests instead of
> shipping credentials in a mobile bundle.

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
