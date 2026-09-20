import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { Button } from '../ui';
import { color, layout, radius, size, text, border } from '../../theme/tokens';
import { formatCurrency, parseAmountInput, keepDigits, normalizeDigits } from '../../lib/utils';
import { RequestAmount } from '../../types';

/**
 * The two moments the assistant asks for a value rather than a sentence.
 *
 * Both already worked by typing into the normal composer — the server accepts
 * "200 SAR" and "123456" as plain messages — so this is an affordance, not a new
 * protocol: it submits exactly the text a user would otherwise type. That keeps
 * the flow working unchanged if the server stops sending these flags.
 *
 * It sits above the composer rather than replacing it, so the user can always
 * ignore it and say something else instead ("actually, cancel").
 */

interface ComposerPromptProps {
    requestAmount?: RequestAmount | null;
    requestOtp?: boolean;
    locale?: 'en' | 'ar';
    onSubmit: (value: string) => void;
    disabled?: boolean;
}

export function ComposerPrompt({
    requestAmount,
    requestOtp,
    locale = 'en',
    onSubmit,
    disabled,
}: ComposerPromptProps) {
    if (requestOtp) {
        return <OtpPrompt locale={locale} onSubmit={onSubmit} disabled={disabled} />;
    }
    if (requestAmount) {
        return (
            <AmountPrompt
                request={requestAmount}
                locale={locale}
                onSubmit={onSubmit}
                disabled={disabled}
            />
        );
    }
    return null;
}

function AmountPrompt({
    request,
    locale,
    onSubmit,
    disabled,
}: {
    request: RequestAmount;
    locale: 'en' | 'ar';
    onSubmit: (value: string) => void;
    disabled?: boolean;
}) {
    const isAr = locale === 'ar';
    const currencies = request.currencies?.length
        ? request.currencies
        : [request.currency || 'SAR'];

    const [value, setValue] = useState('');
    const [currency, setCurrency] = useState(request.currency || currencies[0]);

    // A new request (different hint/currency) resets the field.
    useEffect(() => {
        setValue('');
        setCurrency(request.currency || currencies[0]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [request.hint, request.currency]);

    const hint = (isAr ? request.hintAr : request.hint) || '';
    // Accepts Latin, Arabic-Indic and Persian digits, and either decimal separator.
    const amount = parseAmountInput(value);
    const valid = isFinite(amount) && amount > 0;

    const overMax = request.max != null && valid && amount > request.max;
    const underMin = request.min != null && valid && amount < request.min;

    const error = overMax
        ? isAr
            ? `الحد الأقصى ${formatCurrency(request.max as number, currency, locale)}`
            : `Maximum ${formatCurrency(request.max as number, currency, locale)}`
        : underMin
            ? isAr
                ? `الحد الأدنى ${formatCurrency(request.min as number, currency, locale)}`
                : `Minimum ${formatCurrency(request.min as number, currency, locale)}`
            : null;

    const submit = () => {
        if (!valid || error || disabled) return;
        onSubmit(`${amount} ${currency}`);
        setValue('');
    };

    return (
        <View style={styles.wrap}>
            <View style={styles.headerRow}>
                <Text style={text('caption')}>
                    {isAr ? 'المبلغ' : 'Amount'}
                    {hint ? ` · ${hint}` : ''}
                </Text>
                {currencies.length > 1 && (
                    <View style={styles.currencies}>
                        {currencies.map(code => (
                            <Pressable
                                key={code}
                                onPress={() => setCurrency(code)}
                                style={[
                                    styles.currency,
                                    code === currency && styles.currencyActive,
                                ]}
                            >
                                <Text
                                    style={text('badge', {
                                        color:
                                            code === currency
                                                ? color.text.inverse
                                                : color.text.secondary,
                                    })}
                                >
                                    {code}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                )}
            </View>

            <View style={[styles.field, error && styles.fieldError]}>
                <Text style={text('rowValue', { color: color.text.tertiary })}>{currency}</Text>
                <TextInput
                    style={[text('amount'), styles.amountInput]}
                    value={value}
                    onChangeText={setValue}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={color.text.tertiary}
                    editable={!disabled}
                    onSubmitEditing={submit}
                    returnKeyType="done"
                />
            </View>

            {error ? (
                <Text style={text('caption', { color: color.danger.fg })}>{error}</Text>
            ) : null}

            <Button
                label={isAr ? 'متابعة' : 'Continue'}
                kind="primary"
                onPress={submit}
                disabled={!valid || Boolean(error) || disabled}
            />
        </View>
    );
}

const OTP_LENGTH = 6;

function OtpPrompt({
    locale,
    onSubmit,
    disabled,
}: {
    locale: 'en' | 'ar';
    onSubmit: (value: string) => void;
    disabled?: boolean;
}) {
    const isAr = locale === 'ar';
    const [code, setCode] = useState('');
    const ready = code.length === OTP_LENGTH;

    const submit = () => {
        if (!ready || disabled) return;
        // The user sees the digits they typed; the server is sent Latin.
        onSubmit(normalizeDigits(code));
        setCode('');
    };

    return (
        <View style={styles.wrap}>
            <Text style={text('caption')}>
                {isAr ? 'أدخل الرمز المرسل إلى جوالك' : 'Enter the code sent to your mobile'}
            </Text>

            <View style={styles.field}>
                <TextInput
                    style={[text('amount'), styles.otpInput]}
                    value={code}
                    // Keep digits in whichever script the keyboard produces; \D would
                    // strip Arabic-Indic numerals and the field could never fill.
                    onChangeText={t => setCode(keepDigits(t).slice(0, OTP_LENGTH))}
                    keyboardType="number-pad"
                    placeholder="––––––"
                    placeholderTextColor={color.text.tertiary}
                    maxLength={OTP_LENGTH}
                    editable={!disabled}
                    onSubmitEditing={submit}
                    returnKeyType="done"
                    // The code is Latin digits regardless of UI language.
                    textContentType="oneTimeCode"
                />
            </View>

            <Button
                label={isAr ? 'تأكيد' : 'Verify'}
                kind="primary"
                onPress={submit}
                disabled={!ready || disabled}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        gap: 8,
        paddingHorizontal: layout.cardPadding,
        paddingTop: layout.rowGap,
        paddingBottom: 4,
        backgroundColor: color.surface,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    currencies: { flexDirection: 'row', gap: 4 },
    currency: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: radius.pill,
        backgroundColor: color.surface3,
    },
    currencyActive: { backgroundColor: color.brand[600] },
    field: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        height: 52,
        paddingHorizontal: layout.rowGap,
        borderRadius: radius.button,
        backgroundColor: color.surface2,
        borderWidth: border.hairline,
        borderColor: color.border,
    },
    fieldError: { borderColor: color.danger.border },
    amountInput: {
        flex: 1,
        color: color.text.primary,
        fontVariant: ['tabular-nums'],
        textAlign: 'right',
        padding: 0,
    },
    otpInput: {
        flex: 1,
        color: color.text.primary,
        fontVariant: ['tabular-nums'],
        letterSpacing: 8,
        textAlign: 'center',
        padding: 0,
    },
});

export default ComposerPrompt;
