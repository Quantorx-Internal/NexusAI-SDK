import type { SpeechSpeakerSex } from '../services/SpeechTextService';

export type AgentVoiceId =
    | 'alaa-omni'
    | 'noura-omni'
    | 'sara-omni'
    | 'fahad-omni';

export interface AgentVoice {
    id: AgentVoiceId;
    name: string;
    nameAr: string;
    sex: SpeechSpeakerSex;
    omnivoiceInstruct: string;
    voxcpmInstruct: string;
}

export const AGENT_VOICES: AgentVoice[] = [
    {
        id: 'alaa-omni',
        name: 'Alaa',
        nameAr: 'آلاء',
        sex: 'female',
        omnivoiceInstruct: 'female, young adult, high pitch',
        voxcpmInstruct: 'A Saudi woman speaking the Najdi dialect. A warm, friendly, calm tone.',
    },
    {
        id: 'noura-omni',
        name: 'Noura',
        nameAr: 'نورة',
        sex: 'female',
        omnivoiceInstruct: 'female, middle-aged, moderate pitch',
        voxcpmInstruct: 'A Saudi Najdi woman with a soft, sweet voice. Speaks slowly with a melancholic tone.',
    },
    {
        id: 'sara-omni',
        name: 'Sara',
        nameAr: 'ساره',
        sex: 'female',
        omnivoiceInstruct: 'female, young adult, moderate pitch',
        voxcpmInstruct: 'A Saudi woman speaking the Najdi dialect. A bright, clear, friendly tone.',
    },
    {
        id: 'fahad-omni',
        name: 'Fahad',
        nameAr: 'فهد',
        sex: 'male',
        omnivoiceInstruct: 'male, young adult, moderate pitch',
        voxcpmInstruct: 'A Saudi man speaking the Najdi dialect. A warm, friendly, calm tone.',
    },
];

export function getAgentVoice(id?: string): AgentVoice {
    return AGENT_VOICES.find((voice) => voice.id === id) ?? AGENT_VOICES[0];
}
