import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check, Sparkles } from 'lucide-react-native';
import { Card, SectionHeader, StatusPill, IconBox, iconOn, Button } from '../../ui';
import { color, layout, radius, size, text, iconStroke } from '../../../theme/tokens';
import { formatCurrency } from '../../../lib/utils';
import { Product, ProductRecommendation, ProductRecommendationPayload } from '../../../types';
import { productVisual, categoryLabel } from './productVisuals';

export type { ProductRecommendation };

/**
 * Family D · Recommendations.
 *
 * Offers are not decisions. "Apply now" opens a flow; it does not move money, so
 * it gets a 40pt button side by side with Details rather than the 44pt
 * full-width primary reserved for Family B. That keeps the strongest button in
 * the thread meaning exactly one thing.
 *
 * The design called out a missing field here: a one-line "why you" that makes an
 * offer feel earned rather than pushed. The server sends exactly that as
 * `reason` ("You keep 45,750 SAR in your Main Account, well above monthly
 * spending") — it gets its own tinted block under the benefit, because it is
 * evidence about the customer, not ad copy about the product.
 */

interface RecommendationsBlockProps {
    payload: ProductRecommendationPayload;
    locale?: 'en' | 'ar';
    onApply?: (recommendation: ProductRecommendation) => void;
    onDetails?: (recommendation: ProductRecommendation) => void;
}

const MAX_BULLETS = 3;

/**
 * Eligibility facts become the check bullets. The benefit is already the
 * description, so it is not repeated here.
 */
function bulletsFor(product: Product, locale: 'en' | 'ar'): string[] {
    const isAr = locale === 'ar';
    const bullets: string[] = [];

    const note = isAr ? product.eligibilityNoteAr : product.eligibilityNote;
    if (note) bullets.push(note);

    if (product.minAmount != null) {
        bullets.push(
            isAr
                ? `الحد الأدنى ${formatCurrency(product.minAmount, 'SAR', locale)}`
                : `From ${formatCurrency(product.minAmount, 'SAR', locale)}`
        );
    }
    if (product.maxAmount != null) {
        bullets.push(
            isAr
                ? `حتى ${formatCurrency(product.maxAmount, 'SAR', locale)}`
                : `Up to ${formatCurrency(product.maxAmount, 'SAR', locale)}`
        );
    }
    if (product.minSalary != null) {
        bullets.push(
            isAr
                ? `راتب من ${formatCurrency(product.minSalary, 'SAR', locale)}`
                : `Salary from ${formatCurrency(product.minSalary, 'SAR', locale)}`
        );
    }

    return bullets.slice(0, MAX_BULLETS);
}

export function RecommendationsBlock({
    payload,
    locale = 'en',
    onApply,
    onDetails,
}: RecommendationsBlockProps) {
    const recommendations = payload?.recommendations || [];
    if (recommendations.length === 0) return null;

    const isAr = locale === 'ar';
    const intro = isAr
        ? payload.contextMessageAr || payload.contextMessage
        : payload.contextMessage;

    return (
        <View>
            {intro ? (
                <Text style={[text('body', { color: color.text.secondary }), styles.intro]}>
                    {intro}
                </Text>
            ) : null}

            <SectionHeader
                title={isAr ? 'مقترحة لك' : 'Recommended for you'}
                count={recommendations.length}
            />

            <View style={styles.stack}>
                {recommendations.map(recommendation => (
                    <OfferCard
                        key={recommendation.product.id}
                        recommendation={recommendation}
                        locale={locale}
                        showApply={payload.showApplyButton !== false}
                        onApply={onApply}
                        onDetails={onDetails}
                    />
                ))}
            </View>
        </View>
    );
}

function OfferCard({
    recommendation,
    locale,
    showApply,
    onApply,
    onDetails,
}: {
    recommendation: ProductRecommendation;
    locale: 'en' | 'ar';
    showApply: boolean;
    onApply?: (recommendation: ProductRecommendation) => void;
    onDetails?: (recommendation: ProductRecommendation) => void;
}) {
    const isAr = locale === 'ar';
    const { product } = recommendation;

    const title = (isAr ? product.nameAr : product.name) || product.name;
    const benefit = isAr ? product.benefitAr : product.benefit;
    const reason = isAr ? recommendation.reasonAr : recommendation.reason;
    const bullets = bulletsFor(product, locale);
    const { Icon, tone } = productVisual(product);

    const applyLabel = isAr ? 'قدّم الآن' : 'Apply now';
    const detailsLabel = isAr ? 'التفاصيل' : 'Details';

    return (
        <Card variant="info">
            <View style={styles.headerRow}>
                <IconBox box={size.iconBox.lg} tone={tone}>
                    <Icon size={size.icon.lg} color={iconOn(tone)} strokeWidth={iconStroke} />
                </IconBox>
                <View style={styles.headerText}>
                    <Text style={text('cardTitle')} numberOfLines={2}>
                        {title}
                    </Text>
                    <View style={styles.badges}>
                        {product.isPromoted && (
                            <StatusPill
                                label={isAr ? 'عرض خاص' : 'Special offer'}
                                tone="brandTint"
                                icon={
                                    <Sparkles
                                        size={11}
                                        color={color.brand[600]}
                                        strokeWidth={iconStroke}
                                    />
                                }
                            />
                        )}
                        <StatusPill
                            label={categoryLabel(product.category, locale)}
                            tone="neutralTint"
                        />
                    </View>
                </View>
            </View>

            {benefit ? (
                <Text style={[text('body', { color: color.text.secondary }), styles.benefit]}>
                    {benefit}
                </Text>
            ) : null}

            {/* The "why you". Evidence about this customer, so it sits in its own
                block rather than reading as more product copy. */}
            {reason ? (
                <View style={styles.reason}>
                    <Text style={text('caption', { color: color.text.secondary })}>{reason}</Text>
                </View>
            ) : null}

            {bullets.length > 0 ? (
                <View style={styles.features}>
                    {bullets.map((bullet, index) => (
                        <View key={index} style={styles.feature}>
                            <Check
                                size={size.icon.xs}
                                color={color.success.fg}
                                strokeWidth={iconStroke}
                            />
                            <Text style={[text('body'), styles.featureText]}>{bullet}</Text>
                        </View>
                    ))}
                </View>
            ) : null}

            {(onDetails || (showApply && onApply)) && (
                <View style={styles.actions}>
                    {onDetails && (
                        <Button
                            label={detailsLabel}
                            kind="secondary"
                            onPress={() => onDetails(recommendation)}
                            style={styles.action}
                        />
                    )}
                    {showApply && onApply && (
                        <Button
                            label={applyLabel}
                            kind="primary"
                            onPress={() => onApply(recommendation)}
                            style={styles.action}
                        />
                    )}
                </View>
            )}
        </Card>
    );
}

const styles = StyleSheet.create({
    intro: { marginBottom: 8 },
    stack: { gap: layout.cardStackGap },
    headerRow: { flexDirection: 'row', gap: layout.rowGap, marginBottom: layout.rowGap },
    headerText: { flex: 1, gap: 6 },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    benefit: { marginBottom: layout.rowGap },
    reason: {
        backgroundColor: color.surface2,
        borderRadius: radius.inner,
        padding: layout.rowGap,
        marginBottom: layout.rowGap,
    },
    features: { gap: 6, marginBottom: layout.rowGap },
    feature: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    featureText: { flex: 1 },
    actions: { flexDirection: 'row', gap: 8 },
    // Offers use the 40pt height, not the 44pt Family B primary.
    action: { flex: 1, height: size.buttonSecondary },
});

export default RecommendationsBlock;
