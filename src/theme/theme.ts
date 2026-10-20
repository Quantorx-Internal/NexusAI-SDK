import { color, instrument } from './tokens';

/**
 * Assistant preferences: theme and names (design §6).
 *
 * One brand colour re-themes everything. From a single hex the app derives
 * the subtle tint (8% over white), the border (45% over white) and the
 * pressed shade (20% toward black), and fills the rest of the brand ramp
 * the tokens use. Neutrals and the semantic colours never change.
 *
 * The tokens are a module-level object read at render time, so `applyTheme`
 * writes the derived ramp into them in place. Nothing is remounted: the
 * ThemeProvider bumps a version and the screen re-renders its rows.
 */

export interface ThemeColors {
    /** The brand colour: buttons, the user bubble, the selected border. */
    primary: string;
    /** 8% of the colour over white: tinted pills, avatars, the working chip. */
    primarySubtle: string;
    /** 45% over white: the Family B decision border, the focused composer. */
    borderBrand: string;
    /** 20% toward black: the pressed primary button. */
    primaryPressed: string;
}

export interface ThemeNames {
    assistantNameEn: string;
    assistantNameAr: string;
    bankName: string;
}

export interface Theme {
    color: ThemeColors;
    names: ThemeNames;
}

/** What a caller passes: a brand colour, any of the names. Missing values take the defaults. */
export interface ThemeInput {
    color?: Partial<Pick<ThemeColors, 'primary'>>;
    names?: Partial<ThemeNames>;
}

export const DEFAULT_PRIMARY = '#4F008D';

export const DEFAULT_NAMES: ThemeNames = {
    assistantNameEn: 'AJB AI Assistant',
    assistantNameAr: 'مساعد البنك الذكي',
    bankName: 'AJB Bank',
};

export const NAME_LIMITS = { assistantNameEn: 32, assistantNameAr: 24, bankName: 32 } as const;

/** The six ready-made brand colours on the preferences screen. */
export const PRESET_COLORS: ReadonlyArray<{ id: string; hex: string }> = [
    { id: 'purple', hex: DEFAULT_PRIMARY },
    { id: 'blue', hex: '#2B4A9A' },
    { id: 'teal', hex: '#2E6E6E' },
    { id: 'green', hex: '#2F6B46' },
    { id: 'maroon', hex: '#8E2F3E' },
    { id: 'ink', hex: '#1A1523' },
];

/** White text must reach this on the chosen colour, or Save stays disabled. */
export const MIN_CONTRAST = 4.5;

/**
 * The brand ramp as the tokens ship it. When the primary is the default
 * purple these hand-tuned stops are used verbatim, so the default theme
 * renders pixel-identical to the token sheet; other colours are derived.
 */
const DEFAULT_RAMP: Record<RampStop, string> = {
    50: '#F5EEFA',
    100: '#EBDCF5',
    200: '#D6B8EB',
    300: '#B98ADB',
    400: '#9856C5',
    500: '#6E1FA8',
    600: '#4F008D',
    700: '#3E0070',
    800: '#2C0050',
    900: '#1B0033',
};

type RampStop = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

/** Mix of the primary over white (tints) or toward black (shades), per stop. */
const TINT: Partial<Record<RampStop, number>> = { 50: 0.08, 100: 0.15, 200: 0.3, 300: 0.45, 400: 0.6, 500: 0.8 };
const SHADE: Partial<Record<RampStop, number>> = { 700: 0.2, 800: 0.44, 900: 0.66 };

// ---------------------------------------------------------------------------
// Colour arithmetic
// ---------------------------------------------------------------------------

/** "#4f008d", "4F008D", "#f08" → "#4F008D". Null when it is not a hex colour. */
export function normalizeHex(input: string): string | null {
    const raw = (input || '').trim().replace(/^#/, '');
    if (/^[0-9a-fA-F]{3}$/.test(raw)) {
        return `#${raw.split('').map(c => c + c).join('').toUpperCase()}`;
    }
    if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`;
    return null;
}

function toRgb(hex: string): [number, number, number] {
    const h = normalizeHex(hex) ?? DEFAULT_PRIMARY;
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

function toHex([r, g, b]: [number, number, number]): string {
    const part = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0');
    return `#${part(r)}${part(g)}${part(b)}`.toUpperCase();
}

/** `amount` of `hex` over white: 0 is white, 1 is the colour. */
export function tint(hex: string, amount: number): string {
    const [r, g, b] = toRgb(hex);
    return toHex([255 + (r - 255) * amount, 255 + (g - 255) * amount, 255 + (b - 255) * amount]);
}

/** `amount` of the way from `hex` toward black. */
export function shade(hex: string, amount: number): string {
    const [r, g, b] = toRgb(hex);
    return toHex([r * (1 - amount), g * (1 - amount), b * (1 - amount)]);
}

/** WCAG relative luminance, with sRGB linearisation. */
export function luminance(hex: string): number {
    const channel = (v: number) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    const [r, g, b] = toRgb(hex);
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** The contrast of white text on `hex`, e.g. 12.2 for the default purple. */
export function contrastRatio(hex: string): number {
    return Math.round(((1 + 0.05) / (luminance(hex) + 0.05)) * 10) / 10;
}

/** The whole brand ramp from one primary. */
export function brandRamp(primary: string): Record<RampStop, string> {
    const hex = normalizeHex(primary) ?? DEFAULT_PRIMARY;
    if (hex === DEFAULT_PRIMARY) return { ...DEFAULT_RAMP };
    const ramp = {} as Record<RampStop, string>;
    (Object.keys(DEFAULT_RAMP) as unknown as RampStop[]).forEach(stop => {
        const n = Number(stop) as RampStop;
        ramp[n] = TINT[n] != null ? tint(hex, TINT[n]!) : SHADE[n] != null ? shade(hex, SHADE[n]!) : hex;
    });
    return ramp;
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

/** Trim a name to its limit; an empty one falls back to the default. */
function cleanName<K extends keyof ThemeNames>(key: K, value: string | undefined): string {
    const trimmed = (value ?? '').trim().slice(0, NAME_LIMITS[key]);
    return trimmed || DEFAULT_NAMES[key];
}

/** A full theme from a brand colour and names. Everything missing takes the defaults. */
export function createTheme(input: ThemeInput = {}): Theme {
    const primary = normalizeHex(input.color?.primary ?? DEFAULT_PRIMARY) ?? DEFAULT_PRIMARY;
    const ramp = brandRamp(primary);
    return {
        color: {
            primary,
            primarySubtle: ramp[50],
            borderBrand: ramp[300],
            primaryPressed: ramp[700],
        },
        names: {
            assistantNameEn: cleanName('assistantNameEn', input.names?.assistantNameEn),
            assistantNameAr: cleanName('assistantNameAr', input.names?.assistantNameAr),
            bankName: cleanName('bankName', input.names?.bankName),
        },
    };
}

export const DEFAULT_THEME: Theme = createTheme();

/** The preset whose colour this is, if any. */
export const presetFor = (primary: string) => PRESET_COLORS.find(p => p.hex === normalizeHex(primary)) ?? null;

export const sameTheme = (a: Theme, b: Theme) =>
    a.color.primary === b.color.primary
    && a.names.assistantNameEn === b.names.assistantNameEn
    && a.names.assistantNameAr === b.names.assistantNameAr
    && a.names.bankName === b.names.bankName;

/**
 * Write the theme's brand ramp into the design tokens, in place.
 *
 * Every component reads `color.brand[...]`, `color.borderBrand` and
 * `color.brandTint` at render, so mutating the existing objects (never
 * replacing them) reaches `toneSet`, `iconOn`, `text()` and every inline
 * prop. Static styles that used to bake a brand value now read it at render.
 */
export function applyTheme(theme: Theme): void {
    const ramp = brandRamp(theme.color.primary);
    const brand = color.brand as unknown as Record<number, string>;
    (Object.keys(ramp) as unknown as RampStop[]).forEach(stop => {
        brand[Number(stop)] = ramp[Number(stop) as RampStop];
    });
    const mutable = color as unknown as { borderBrand: string; brandTint: { bg: string; border: string; fg: string; fgStrong: string } };
    mutable.borderBrand = ramp[300];
    mutable.brandTint.bg = ramp[50];
    mutable.brandTint.border = ramp[200];
    mutable.brandTint.fg = ramp[600];
    mutable.brandTint.fgStrong = ramp[700];
    // The account/card gradient: brand 800 → 600 → 500.
    const palette = instrument.palettes.brand as unknown as string[];
    palette[0] = ramp[800];
    palette[1] = ramp[600];
    palette[2] = ramp[500];
}

/** The assistant's name in the language the user is reading. */
export const assistantName = (theme: Theme, locale: 'en' | 'ar') =>
    locale === 'ar' ? theme.names.assistantNameAr : theme.names.assistantNameEn;
