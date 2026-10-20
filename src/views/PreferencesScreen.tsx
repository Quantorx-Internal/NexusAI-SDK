import React, { useCallback, useMemo, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    ScrollView,
    StyleSheet,
    Modal,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { BrainCircuit, Sparkles, ChevronLeft, ChevronRight, Check, RotateCcw } from 'lucide-react-native';
import { Button } from '../components/ui';
import { color, layout, radius, size, text, iconStroke, preferences as pref } from '../theme/tokens';
import {
    Theme,
    ThemeInput,
    createTheme,
    contrastRatio,
    normalizeHex,
    presetFor,
    sameTheme,
    DEFAULT_THEME,
    DEFAULT_NAMES,
    NAME_LIMITS,
    PRESET_COLORS,
    MIN_CONTRAST,
    assistantName,
} from '../theme/theme';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Assistant preferences: theme and names (design §6).
 *
 * Pushed full-height inside the chat sheet, with a back chevron and Save.
 * The preview comes first so every edit is seen on the four places the
 * brand colour appears: the header, a user bubble, a primary button and a
 * pill. The preview draws from the draft, never from the tokens, because
 * the tokens still carry the saved theme until Save.
 *
 * Save stays disabled until something changes, and while white text would
 * not reach 4.5:1 on the chosen colour. Back with unsaved changes asks.
 */

type Locale = 'en' | 'ar';

interface PreferencesScreenProps {
    locale?: Locale;
    isRTL?: boolean;
    onClose: () => void;
}

const WORDS = {
    en: {
        title: 'Preferences',
        save: 'Save',
        preview: 'Preview',
        previewBubble: 'Show my balance',
        previewButton: 'Confirm',
        previewPill: 'Awaiting',
        names: 'Names',
        nameEn: 'Assistant name · English',
        nameAr: 'Assistant name · Arabic',
        bank: 'Bank name',
        bankHelp: 'Used in greetings, disclaimers and receipts.',
        colour: 'Brand colour',
        customHex: 'Custom hex',
        ramp: { subtle: 'Subtle', border: 'Border', primary: 'Primary', pressed: 'Pressed' },
        passes: (ratio: number) => `White text ${ratio}:1 · passes AA`,
        fails: (ratio: number) => `White text ${ratio}:1 · below AA, pick a darker colour`,
        invalidHex: 'Enter a 6-digit hex colour, like #4F008D',
        reset: 'Reset to AJB defaults',
        discardTitle: 'Discard changes?',
        discardBody: 'Your edits to the names or colour have not been saved.',
        keepEditing: 'Keep editing',
        discard: 'Discard',
        back: 'Back',
    },
    ar: {
        title: 'التفضيلات',
        save: 'حفظ',
        preview: 'معاينة',
        previewBubble: 'اعرض رصيدي',
        previewButton: 'تأكيد',
        previewPill: 'بانتظار التأكيد',
        names: 'الأسماء',
        nameEn: 'اسم المساعد · بالإنجليزية',
        nameAr: 'اسم المساعد · بالعربية',
        bank: 'اسم البنك',
        bankHelp: 'يظهر في التحية والتنبيهات والإيصالات.',
        colour: 'لون العلامة',
        customHex: 'لون مخصص (hex)',
        ramp: { subtle: 'فاتح', border: 'حد', primary: 'أساسي', pressed: 'مضغوط' },
        passes: (ratio: number) => `النص الأبيض ${ratio}:1 · يجتاز AA`,
        fails: (ratio: number) => `النص الأبيض ${ratio}:1 · أقل من AA، اختر لوناً أغمق`,
        invalidHex: 'أدخل لوناً من 6 خانات مثل #4F008D',
        reset: 'إعادة الضبط إلى افتراضي AJB',
        discardTitle: 'تجاهل التغييرات؟',
        discardBody: 'تعديلاتك على الأسماء أو اللون لم تُحفظ.',
        keepEditing: 'متابعة التعديل',
        discard: 'تجاهل',
        back: 'رجوع',
    },
} as const;

interface Draft {
    assistantNameEn: string;
    assistantNameAr: string;
    bankName: string;
    /** What the user typed in the hex field; the swatches write a clean hex here. */
    hex: string;
}

const draftOf = (theme: Theme): Draft => ({
    assistantNameEn: theme.names.assistantNameEn,
    assistantNameAr: theme.names.assistantNameAr,
    bankName: theme.names.bankName,
    hex: theme.color.primary,
});

const inputOf = (draft: Draft): ThemeInput => ({
    color: { primary: normalizeHex(draft.hex) ?? DEFAULT_THEME.color.primary },
    names: { assistantNameEn: draft.assistantNameEn, assistantNameAr: draft.assistantNameAr, bankName: draft.bankName },
});

export function PreferencesScreen({ locale = 'en', isRTL = false, onClose }: PreferencesScreenProps) {
    const words = WORDS[locale];
    const { theme, setTheme } = useTheme();
    const [draft, setDraft] = useState<Draft>(() => draftOf(theme));
    const [saving, setSaving] = useState(false);
    const [askDiscard, setAskDiscard] = useState(false);

    const hex = normalizeHex(draft.hex);
    const preview = useMemo(() => createTheme(inputOf(draft)), [draft]);
    const ratio = hex ? contrastRatio(hex) : 0;
    const readable = Boolean(hex) && ratio >= MIN_CONTRAST;
    const dirty = !sameTheme(preview, theme) || (hex === null);
    const canSave = dirty && Boolean(hex) && readable && !saving;

    const set = useCallback(<K extends keyof Draft>(key: K, value: Draft[K]) => {
        setDraft(d => ({ ...d, [key]: value }));
    }, []);

    const save = useCallback(async () => {
        if (!canSave) return;
        setSaving(true);
        try {
            await setTheme(inputOf(draft));
            onClose();
        } finally {
            setSaving(false);
        }
    }, [canSave, draft, setTheme, onClose]);

    const back = useCallback(() => {
        if (dirty) setAskDiscard(true);
        else onClose();
    }, [dirty, onClose]);

    const BackIcon = isRTL ? ChevronRight : ChevronLeft;

    return (
        <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {/* Nav */}
            <View style={styles.nav}>
                <Pressable
                    onPress={back}
                    accessibilityRole="button"
                    accessibilityLabel={words.back}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={({ pressed }) => [styles.navButton, pressed && styles.navButtonPressed]}
                >
                    <BackIcon size={size.icon.xl} color={color.text.primary} strokeWidth={iconStroke} />
                </Pressable>
                <Text style={[text('cardTitle'), styles.navTitle]} numberOfLines={1}>
                    {words.title}
                </Text>
                <Pressable
                    onPress={save}
                    disabled={!canSave}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !canSave }}
                    style={({ pressed }) => [
                        styles.saveButton,
                        canSave ? { backgroundColor: color.brand[600] } : styles.saveDisabled,
                        pressed && canSave && { backgroundColor: color.brand[700] },
                    ]}
                >
                    <Text style={text('button', { color: canSave ? color.text.inverse : color.text.tertiary })}>
                        {words.save}
                    </Text>
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                {/* Preview */}
                <View style={styles.section}>
                    <Text style={[text('caption'), styles.sectionLabel]}>{words.preview}</Text>
                    <Preview theme={preview} locale={locale} words={words} />
                </View>

                {/* Names */}
                <View style={styles.section}>
                    <Text style={[text('caption'), styles.sectionLabel]}>{words.names}</Text>
                    <Field
                        label={words.nameEn}
                        value={draft.assistantNameEn}
                        placeholder={DEFAULT_NAMES.assistantNameEn}
                        maxLength={NAME_LIMITS.assistantNameEn}
                        onChange={v => set('assistantNameEn', v)}
                    />
                    <Field
                        label={words.nameAr}
                        value={draft.assistantNameAr}
                        placeholder={DEFAULT_NAMES.assistantNameAr}
                        maxLength={NAME_LIMITS.assistantNameAr}
                        rtl
                        onChange={v => set('assistantNameAr', v)}
                    />
                    <Field
                        label={words.bank}
                        value={draft.bankName}
                        placeholder={DEFAULT_NAMES.bankName}
                        maxLength={NAME_LIMITS.bankName}
                        help={words.bankHelp}
                        onChange={v => set('bankName', v)}
                    />
                </View>

                {/* Brand colour */}
                <View style={styles.section}>
                    <Text style={[text('caption'), styles.sectionLabel]}>{words.colour}</Text>
                    <View style={styles.swatches}>
                        {PRESET_COLORS.map(preset => {
                            const selected = hex === preset.hex;
                            return (
                                <Pressable
                                    key={preset.id}
                                    onPress={() => set('hex', preset.hex)}
                                    accessibilityRole="radio"
                                    accessibilityState={{ selected }}
                                    accessibilityLabel={preset.id}
                                    style={[styles.swatchRing, selected && { borderColor: preset.hex }]}
                                >
                                    <View style={[styles.swatch, { backgroundColor: preset.hex }]}>
                                        {selected ? (
                                            <Check size={size.icon.sm} color={color.text.inverse} strokeWidth={2.5} />
                                        ) : null}
                                    </View>
                                </Pressable>
                            );
                        })}
                    </View>

                    <Field
                        label={words.customHex}
                        value={draft.hex}
                        placeholder="#4F008D"
                        maxLength={7}
                        mono
                        autoCapitalize="characters"
                        error={hex ? undefined : words.invalidHex}
                        leading={<View style={[styles.hexSwatch, { backgroundColor: hex ?? color.surface3 }]} />}
                        onChange={v => set('hex', v)}
                    />

                    {hex ? (
                        <>
                            <View style={styles.ramp}>
                                <RampChip label={words.ramp.subtle} hex={preview.color.primarySubtle} />
                                <RampChip label={words.ramp.border} hex={preview.color.borderBrand} />
                                <RampChip label={words.ramp.primary} hex={preview.color.primary} />
                                <RampChip label={words.ramp.pressed} hex={preview.color.primaryPressed} />
                            </View>
                            <View
                                style={[
                                    styles.check,
                                    { backgroundColor: readable ? color.success.bg : color.danger.bg },
                                ]}
                                accessibilityRole="text"
                            >
                                <View style={[styles.checkDot, { backgroundColor: readable ? color.success.fg : color.danger.fg }]} />
                                <Text style={text('caption', { color: readable ? color.success.fgStrong : color.danger.fgStrong })}>
                                    {readable ? words.passes(ratio) : words.fails(ratio)}
                                </Text>
                            </View>
                        </>
                    ) : null}
                </View>

                {/* Reset */}
                <Pressable
                    onPress={() => setDraft(draftOf(DEFAULT_THEME))}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.reset, pressed && styles.navButtonPressed]}
                >
                    <RotateCcw size={size.icon.sm} color={color.text.secondary} strokeWidth={iconStroke} />
                    <Text style={text('rowLabel')}>{words.reset}</Text>
                </Pressable>
            </ScrollView>

            {/* Discard confirm. Alert.alert is a no-op on web, so this is a Modal. */}
            <Modal visible={askDiscard} transparent animationType="fade" onRequestClose={() => setAskDiscard(false)}>
                <Pressable style={styles.backdrop} onPress={() => setAskDiscard(false)}>
                    <Pressable style={styles.dialog} onPress={() => undefined}>
                        <Text style={text('cardTitle')}>{words.discardTitle}</Text>
                        <Text style={text('body', { color: color.text.secondary })}>{words.discardBody}</Text>
                        <View style={styles.dialogActions}>
                            <Button label={words.keepEditing} kind="secondary" onPress={() => setAskDiscard(false)} style={styles.dialogButton} />
                            <Button
                                label={words.discard}
                                kind="primary"
                                onPress={() => {
                                    setAskDiscard(false);
                                    onClose();
                                }}
                                style={styles.dialogButton}
                            />
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </KeyboardAvoidingView>
    );
}

/** The four places the brand colour appears, drawn from the draft theme. */
function Preview({ theme, locale, words }: { theme: Theme; locale: Locale; words: (typeof WORDS)[Locale] }) {
    const c = theme.color;
    return (
        <View style={styles.preview}>
            <View style={styles.previewHeader}>
                <View style={[styles.previewAvatar, { backgroundColor: c.primarySubtle }]}>
                    <BrainCircuit size={size.icon.md} color={c.primary} strokeWidth={iconStroke} />
                </View>
                <Text style={[text('rowValue'), styles.previewName]} numberOfLines={1}>
                    {assistantName(theme, locale)}
                </Text>
                <Sparkles size={size.icon.sm} color={c.primary} strokeWidth={iconStroke} />
            </View>
            <View style={styles.previewBubbleRow}>
                <View style={[styles.previewBubble, { backgroundColor: c.primary }]}>
                    <Text style={text('rowLabel', { color: color.text.inverse })}>{words.previewBubble}</Text>
                </View>
            </View>
            <View style={styles.previewActions}>
                <View style={[styles.previewButton, { backgroundColor: c.primary }]}>
                    <Text style={text('button', { color: color.text.inverse })}>{words.previewButton}</Text>
                </View>
                <View style={[styles.previewPill, { backgroundColor: c.primarySubtle }]}>
                    <Text style={text('badge', { color: c.primary })}>{words.previewPill}</Text>
                </View>
            </View>
        </View>
    );
}

function Field({
    label,
    value,
    placeholder,
    maxLength,
    help,
    error,
    rtl,
    mono,
    autoCapitalize,
    leading,
    onChange,
}: {
    label: string;
    value: string;
    placeholder?: string;
    maxLength?: number;
    help?: string;
    error?: string;
    rtl?: boolean;
    mono?: boolean;
    autoCapitalize?: 'none' | 'characters';
    leading?: React.ReactNode;
    onChange: (value: string) => void;
}) {
    const [focused, setFocused] = useState(false);
    return (
        <View style={styles.field}>
            <Text style={text('rowLabel')}>{label}</Text>
            <View
                style={[
                    styles.input,
                    focused && { borderColor: color.brand[600], borderWidth: 1.5 },
                    error && !focused && { borderColor: color.danger.border },
                ]}
            >
                {leading}
                <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder={placeholder}
                    placeholderTextColor={color.text.tertiary}
                    maxLength={maxLength}
                    autoCapitalize={autoCapitalize ?? 'sentences'}
                    autoCorrect={false}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    style={[
                        text(mono ? 'mono' : 'rowValue'),
                        styles.inputText,
                        rtl && styles.inputRtl,
                        Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
                    ]}
                />
            </View>
            {error ? (
                <Text style={text('caption', { color: color.danger.fg })}>{error}</Text>
            ) : help ? (
                <Text style={text('caption')}>{help}</Text>
            ) : null}
        </View>
    );
}

function RampChip({ label, hex }: { label: string; hex: string }) {
    return (
        <View style={styles.rampChip}>
            <View style={[styles.rampSwatch, { backgroundColor: hex }]} />
            <Text style={text('caption')} numberOfLines={1}>
                {label}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: color.surface },
    nav: {
        height: pref.navHeight,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        gap: 4,
        borderBottomWidth: 1,
        borderBottomColor: color.border,
        backgroundColor: color.surface,
    },
    navButton: {
        width: size.buttonPrimary,
        height: size.buttonPrimary,
        borderRadius: radius.button,
        alignItems: 'center',
        justifyContent: 'center',
    },
    navButtonPressed: { backgroundColor: color.surface2 },
    navTitle: { flex: 1 },
    saveButton: {
        height: size.buttonSecondary,
        paddingHorizontal: 16,
        borderRadius: radius.button,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveDisabled: { backgroundColor: color.surface3 },
    content: { padding: pref.contentPadding, gap: pref.sectionGap, paddingBottom: 40 },
    section: { gap: layout.rowGap },
    sectionLabel: { marginBottom: -4 },
    preview: {
        backgroundColor: color.surface2,
        borderRadius: radius.card,
        padding: layout.rowGap,
        gap: layout.rowGap,
    },
    previewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: layout.rowGap,
        backgroundColor: color.surface,
        borderRadius: radius.inner,
        padding: layout.rowGap,
        borderWidth: 1,
        borderColor: color.border,
    },
    previewAvatar: {
        width: size.iconBox.lg,
        height: size.iconBox.lg,
        borderRadius: size.iconBox.lg / 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewName: { flex: 1 },
    previewBubbleRow: { alignItems: 'flex-end' },
    previewBubble: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: radius.card,
        borderTopRightRadius: 4,
    },
    previewActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    previewButton: {
        flex: 1,
        height: size.buttonPrimary,
        borderRadius: radius.button,
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewPill: {
        height: size.buttonPrimary,
        paddingHorizontal: 14,
        borderRadius: radius.button,
        alignItems: 'center',
        justifyContent: 'center',
    },
    field: { gap: 6 },
    input: {
        height: pref.inputHeight,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: layout.rowGap,
        borderRadius: radius.button,
        borderWidth: 1,
        borderColor: color.borderStrong,
        backgroundColor: color.surface,
    },
    inputText: { flex: 1, padding: 0, color: color.text.primary },
    inputRtl: { textAlign: 'right', writingDirection: 'rtl' },
    swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: pref.swatchGap },
    swatchRing: {
        width: pref.swatch,
        height: pref.swatch,
        borderRadius: pref.swatch / 2,
        borderWidth: pref.swatchRing,
        borderColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
    },
    swatch: {
        width: pref.swatchInner,
        height: pref.swatchInner,
        borderRadius: pref.swatchInner / 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hexSwatch: { width: 18, height: 18, borderRadius: 4 },
    ramp: { flexDirection: 'row', gap: 8 },
    rampChip: { flex: 1, gap: 4 },
    rampSwatch: { height: pref.rampChip, borderRadius: 6 },
    check: {
        minHeight: size.buttonPrimary,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: layout.rowGap,
        paddingVertical: 8,
        borderRadius: radius.inner,
    },
    checkDot: { width: 6, height: 6, borderRadius: 3 },
    reset: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: layout.rowGap,
        borderRadius: radius.button,
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(17, 24, 39, 0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    dialog: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: color.surface,
        borderRadius: radius.card,
        padding: layout.cardPadding,
        gap: layout.rowGap,
    },
    dialogActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
    dialogButton: { flex: 1 },
});

export default PreferencesScreen;
