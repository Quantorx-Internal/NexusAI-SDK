import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CreditCard, Snowflake, Globe, Wifi, KeyRound, RefreshCw, Info } from 'lucide-react-native';
import { Card, DetailRow, ActionRow, StatusPill, IconBox, iconOn } from '../../ui';
import { color, layout, radius, size, text, iconStroke, Tone } from '../../../theme/tokens';
import { formatCurrency } from '../../../lib/utils';
import { CardAction, CardPreview } from '../../../types';

/**
 * Family B · CardPreview — same chassis as TransferPreview.
 *
 * The title is the action as a verb phrase ("Set daily limit", "Freeze card"),
 * because that is what the user is authorizing. Limit changes show the old value
 * struck through above the new one in the amount role, so the comparison is the
 * point of the card. There is no Edit button: the payload has no editable field.
 *
 * Freeze uses the info icon container rather than brand — it is a protective
 * action, not a promotional one.
 */

interface CardPreviewBlockProps {
    cardPreview: CardPreview;
    locale?: 'en' | 'ar';
    onConfirm?: () => void;
    onCancel?: () => void;
    confirmedLabel?: string;
    working?: boolean;
}

const actionLabels: Record<CardAction, { en: string; ar: string }> = {
    freeze: { en: 'Freeze card', ar: 'تجميد البطاقة' },
    unfreeze: { en: 'Unfreeze card', ar: 'إلغاء تجميد البطاقة' },
    set_daily_limit: { en: 'Set daily limit', ar: 'تعيين الحد اليومي' },
    set_transaction_limit: { en: 'Set transaction limit', ar: 'تعيين حد المعاملة' },
    toggle_international: { en: 'International payments', ar: 'المدفوعات الدولية' },
    toggle_online: { en: 'Online payments', ar: 'المدفوعات عبر الإنترنت' },
    request_replacement: { en: 'Request replacement', ar: 'طلب بطاقة بديلة' },
    reset_pin: { en: 'Reset PIN', ar: 'إعادة تعيين الرمز السري' },
};

const actionIcons: Record<CardAction, { Icon: any; tone: Tone }> = {
    freeze: { Icon: Snowflake, tone: 'info' },
    unfreeze: { Icon: Snowflake, tone: 'info' },
    set_daily_limit: { Icon: CreditCard, tone: 'brandTint' },
    set_transaction_limit: { Icon: CreditCard, tone: 'brandTint' },
    toggle_international: { Icon: Globe, tone: 'brandTint' },
    toggle_online: { Icon: Wifi, tone: 'brandTint' },
    request_replacement: { Icon: RefreshCw, tone: 'brandTint' },
    reset_pin: { Icon: KeyRound, tone: 'brandTint' },
};

export function CardPreviewBlock({
    cardPreview,
    locale = 'en',
    onConfirm,
    onCancel,
    confirmedLabel,
    working,
}: CardPreviewBlockProps) {
    const isAr = locale === 'ar';
    const { action } = cardPreview;

    const t = {
        awaiting: isAr ? 'بانتظار التأكيد' : 'Awaiting confirmation',
        currentDaily: isAr ? 'الحد اليومي الحالي' : 'Current daily limit',
        newDaily: isAr ? 'الحد اليومي الجديد' : 'New daily limit',
        currentTxn: isAr ? 'حد المعاملة الحالي' : 'Current transaction limit',
        newTxn: isAr ? 'حد المعاملة الجديد' : 'New transaction limit',
        status: isAr ? 'الحالة' : 'Status',
        on: isAr ? 'مفعّل' : 'On',
        off: isAr ? 'معطّل' : 'Off',
        active: isAr ? 'نشطة' : 'Active',
        frozen: isAr ? 'مجمدة' : 'Frozen',
        confirmed: isAr ? 'تم التأكيد' : 'Confirmed',
        confirmLimit: isAr ? 'تأكيد الحد الجديد' : 'Confirm new limit',
        confirm: isAr ? 'تأكيد' : 'Confirm',
        cancel: isAr ? 'إلغاء' : 'Cancel',
        card: isAr ? 'البطاقة' : 'Card',
    };

    const title = actionLabels[action]?.[locale] || action;
    const { Icon, tone } = actionIcons[action] || actionIcons.set_daily_limit;

    const money = (value: number) => formatCurrency(value, 'SAR', locale);

    const isLimit = action === 'set_daily_limit' || action === 'set_transaction_limit';
    const isToggle = action === 'toggle_international' || action === 'toggle_online';
    const isFreeze = action === 'freeze' || action === 'unfreeze';
    // A confirmed card stops asking for a decision: neutral border, success pill.
    const done = Boolean(confirmedLabel);
    // An action with nothing to compare (freeze without a known current status,
    // reset PIN, replacement) says everything in its title and object block —
    // an empty terms block would just leave a hole above the button.
    const hasTerms = isLimit || isToggle || (isFreeze && Boolean(cardPreview.cardStatus));

    const newValue =
        action === 'set_daily_limit' ? cardPreview.newDailyLimit : cardPreview.newTransactionLimit;
    const currentValue =
        action === 'set_daily_limit'
            ? cardPreview.currentDailyLimit
            : cardPreview.currentTransactionLimit;

    const cardSubtitle = [
        cardPreview.cardNetwork ? cardPreview.cardNetwork.toUpperCase() : null,
        cardPreview.cardLastFour ? `•••• ${cardPreview.cardLastFour}` : null,
    ]
        .filter(Boolean)
        .join(' · ');

    return (
        <Card variant={done ? 'info' : 'decision'}>
            <View style={styles.header}>
                <Text style={text('cardTitle')} numberOfLines={2}>
                    {title}
                </Text>
                <StatusPill
                    label={done ? t.confirmed : t.awaiting}
                    tone={done ? 'success' : 'brandTint'}
                    dot={!done}
                />
            </View>

            {/* The object the action applies to. */}
            <View style={styles.object}>
                <IconBox box={size.iconBox.md} tone={tone}>
                    <Icon size={size.icon.md} color={iconOn(tone)} strokeWidth={iconStroke} />
                </IconBox>
                <View style={styles.objectText}>
                    <Text style={text('rowValue')} numberOfLines={1}>
                        {cardPreview.cardName || `${t.card} ${cardPreview.cardId.slice(-4)}`}
                    </Text>
                    {cardSubtitle ? (
                        <Text style={text('caption')} numberOfLines={1}>
                            {cardSubtitle}
                        </Text>
                    ) : null}
                </View>
            </View>

            {hasTerms ? (
                <View style={styles.terms}>
                    {isLimit ? (
                        <>
                            <DetailRow
                                label={action === 'set_daily_limit' ? t.currentDaily : t.currentTxn}
                                value={currentValue !== undefined ? money(currentValue) : null}
                                struck={currentValue !== undefined}
                            />
                            <DetailRow
                                label={action === 'set_daily_limit' ? t.newDaily : t.newTxn}
                                value={newValue !== undefined ? money(newValue) : null}
                                total
                            />
                        </>
                    ) : isToggle ? (
                        <DetailRow label={t.status} value={`${title} → ${t.on}`} />
                    ) : isFreeze && cardPreview.cardStatus ? (
                        <DetailRow
                            label={t.status}
                            value={`${cardPreview.cardStatus === 'frozen' ? t.frozen : t.active} → ${action === 'freeze' ? t.frozen : t.active}`}
                        />
                    ) : null}
                </View>
            ) : null}

            <ActionRow
                primaryLabel={onConfirm ? (isLimit ? t.confirmLimit : t.confirm) : undefined}
                onPrimary={onConfirm}
                ghostLabel={onCancel ? t.cancel : undefined}
                onGhost={onCancel}
                working={working}
                confirmedLabel={confirmedLabel}
            />
        </Card>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: layout.sectionGap,
    },
    object: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: layout.rowGap,
        backgroundColor: color.surface2,
        borderRadius: radius.inner,
        padding: layout.rowGap,
        marginBottom: layout.sectionGap,
    },
    objectText: { flex: 1 },
    terms: { gap: layout.rowGap, marginBottom: layout.sectionGap },
});

export default CardPreviewBlock;
