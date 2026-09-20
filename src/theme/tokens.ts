import { Platform, TextStyle } from 'react-native';

/**
 * AJB AI Assistant — in-chat card design tokens.
 *
 * Transcribed from the design system ("8 · Token sheet"). Every value used by the
 * 15 in-chat cards resolves to one of these — do not introduce raw hex or ad-hoc
 * spacing in a block.
 *
 * FONT: the design specifies Cairo (Latin + Arabic, one family, weights 400–700).
 * Cairo is not bundled yet, so `font.family` is `undefined`, which renders the
 * platform system font at the design's exact sizes, weights and line heights.
 * To ship Cairo: install expo-font, load Cairo-Regular/SemiBold/Bold, and set
 * `family` below — nothing else in the system needs to change.
 */

export const color = {
    brand: {
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
    },
    bg: '#FFFFFF',
    surface: '#FFFFFF',
    surface2: '#F6F4F9',
    surface3: '#EEEBF3',
    border: '#E5E1EC',
    borderStrong: '#CFC9DA',
    borderBrand: '#B98ADB',
    /** The one dark surface in the system — bank cards only. */
    ink: '#1A1523',
    text: {
        primary: '#1A1523',
        secondary: '#5B5468',
        tertiary: '#8A8399',
        inverse: '#FFFFFF',
    },
    success: { bg: '#E8F7EF', border: '#B7E4C9', fg: '#0F7A45', fgStrong: '#0B5D35' },
    warning: { bg: '#FFF5E5', border: '#F5D9A8', fg: '#9A5B00', fgStrong: '#6B3F00' },
    danger: { bg: '#FDECEC', border: '#F4B9B9', fg: '#B42323', fgStrong: '#7A1414' },
    info: { bg: '#EAF2FD', border: '#B9D3F5', fg: '#1D5FB4', fgStrong: '#123F7A' },
    /** "Awaiting confirmation" is brand tint, never warning — a review step must not look like an error. */
    brandTint: { bg: '#F5EEFA', border: '#D6B8EB', fg: '#4F008D', fgStrong: '#3E0070' },
    /** Government / uncategorised rows. */
    neutralTint: { bg: '#EEEBF3', border: '#E5E1EC', fg: '#5B5468', fgStrong: '#1A1523' },
} as const;

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'brandTint' | 'neutralTint';

export const toneSet = (tone: Tone) => color[tone];

export const font = {
    /** Set to 'Cairo' once the family is bundled. */
    family: undefined as string | undefined,
    mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};

/** fontSize / lineHeight / fontWeight — the only ten text roles in the system. */
export const type = {
    hero: { fontSize: 28, lineHeight: 36, fontWeight: '700' },
    amount: { fontSize: 20, lineHeight: 28, fontWeight: '700' },
    cardTitle: { fontSize: 16, lineHeight: 24, fontWeight: '700' },
    rowValue: { fontSize: 14, lineHeight: 22, fontWeight: '600' },
    body: { fontSize: 14, lineHeight: 22, fontWeight: '400' },
    button: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
    rowLabel: { fontSize: 13, lineHeight: 20, fontWeight: '400' },
    mono: { fontSize: 13, lineHeight: 20, fontWeight: '500' },
    caption: { fontSize: 12, lineHeight: 18, fontWeight: '400' },
    badge: { fontSize: 11, lineHeight: 16, fontWeight: '600' },
} as const satisfies Record<string, Pick<TextStyle, 'fontSize' | 'lineHeight' | 'fontWeight'>>;

export type TypeRole = keyof typeof type;

/** Numbers carry tabular figures so columns of amounts stay aligned. */
export const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 } as const;

export const layout = {
    cardPadding: 16,
    rowGap: 12,
    sectionGap: 16,
    cardStackGap: 8,
    bubbleToCard: 8,
    messageGap: 20,
    listRowPadV: 12,
    scrollerGap: 8,
    scrollerPeek: 32,
} as const;

export const radius = {
    card: 16,
    inner: 12,
    button: 10,
    iconSquare: 10,
    pill: 999,
    avatar: 999,
    bar: 3,
} as const;

export const border = { hairline: 1, decision: 1.5 } as const;

export const size = {
    buttonPrimary: 44,
    buttonSecondary: 40,
    pill: 20,
    copyField: 40,
    icon: { xs: 16, sm: 18, md: 20, lg: 22, xl: 24 },
    iconBox: { sm: 32, md: 36, lg: 40 },
} as const;

/**
 * No shadows. Separation comes from the border and the surface-2 fill inside cards.
 * The single permitted elevation is the pressed state on instrument cards.
 */
export const elevation = {
    none: {},
    pressed: {
        shadowColor: '#1A1523',
        shadowOpacity: 0.06,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
    },
} as const;

/**
 * Composer (design §9). The bar is the assistant's presence, not a text field
 * with a mic bolted on — so its metrics are specified separately from cards.
 */
export const composer = {
    barHeight: 52,
    barRadius: 26,
    barPadStart: 18,
    barPadEnd: 6,
    /** One circle, two glyphs — the bar never grows a second button. */
    actionCircle: 40,
    actionGlyph: 20,
    focusBorder: 1.5,
    chipHeight: 32,
    chipPadH: 12,
    chipGap: 8,
    /** chip row → composer, and composer → home indicator. */
    chipToComposer: 12,
    aboveHome: 8,
    textSize: 15,
    listening: {
        transcriptSize: 20,
        transcriptLine: 28,
        bars: 15,
        barWidth: 4,
        barGap: 3,
        barMin: 6,
        barMax: 36,
        mic: 64,
        ring: 6,
        sideButton: 44,
        /** Gradient covers the last ~45% of the screen. */
        scrimRatio: 0.45,
    },
    working: {
        dot: 6,
        stop: 14,
        stopRadius: 3,
    },
} as const;

/** Icons are lucide-react-native at strokeWidth 2. */
export const iconStroke = 2;

/** Roles that carry a default colour per the type spec. */
const roleColor: Partial<Record<TypeRole, string>> = {
    rowLabel: color.text.secondary,
    caption: color.text.tertiary,
};

/**
 * Compose a text role into a style: size / lineHeight / weight, the shared
 * family, and the role's default colour. Pass `extra` to override.
 */
export function text(role: TypeRole, extra?: TextStyle): TextStyle {
    return {
        ...type[role],
        fontFamily: role === 'mono' ? font.mono : font.family,
        color: roleColor[role] ?? color.text.primary,
        ...extra,
    };
}

export const tokens = {
    color,
    font,
    type,
    space,
    layout,
    radius,
    border,
    size,
    elevation,
};

export default tokens;
