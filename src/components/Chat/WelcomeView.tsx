import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, I18nManager, Animated } from 'react-native';
import { Landmark, TrendingDown, FileText, CreditCard, Wallet, Clock, Receipt } from 'lucide-react-native';
import { formatCurrency } from '../../lib/utils';
import { Locale } from '../../contexts/LocaleContext';
import { color } from '../../theme/tokens';

export interface WelcomeSummary {
    totalBalance: number;
    monthlySpending: number;
    pendingBills: { count: number; amount: number };
    activeCards: number;
}

interface WelcomeViewProps {
    summary: WelcomeSummary | null;
    locale: Locale;
    isRTL?: boolean;
    onQuickAction: (action: string) => void;
}

const quickActions = {
    ar: [
        { label: 'مصاريفي', icon: Wallet, message: 'أبي أشوف مصاريفي' },
        { label: 'آخر حركاتي', icon: Clock, message: 'وش آخر حركاتي؟' },
        { label: 'فواتيري', icon: Receipt, message: 'أبي أدفع فواتيري' },
    ],
    en: [
        { label: 'My Spending', icon: Wallet, message: 'Show me my spending' },
        { label: 'Recent Activity', icon: Clock, message: 'Show my recent transactions' },
        { label: 'My Bills', icon: Receipt, message: 'Show me my bills' },
    ],
};

function SummaryCard({
    icon,
    label,
    value,
    subtitle,
    isRTL,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    subtitle?: string;
    isRTL: boolean;
}) {
    return (
        <View style={styles.summaryCard}>
            <View style={[styles.summaryCardHeader, isRTL && styles.summaryCardHeaderRTL]}>
                {icon}
                <Text style={[styles.summaryCardLabel, isRTL && styles.textRTL]}>{label}</Text>
            </View>
            <Text style={[styles.summaryCardValue, isRTL && styles.textRTL]}>{value}</Text>
            {subtitle && (
                <Text style={[styles.summaryCardSubtitle, isRTL && styles.textRTL]}>{subtitle}</Text>
            )}
        </View>
    );
}

export function WelcomeView({ summary, locale, isRTL = false, onQuickAction }: WelcomeViewProps) {
    const isAr = locale === 'ar';
    const actions = quickActions[locale];

    const clientName = isAr ? 'محمد' : 'Mohammed';
    const greeting = isAr ? `هلا ${clientName}` : `Hello, ${clientName}!`;
    const subGreeting = isAr ? 'كيف اقدر افيدك اليوم ؟' : 'How can I help you today?';

    // Determine effective layout direction (XOR logic)
    const isLayoutRTL = isRTL ? !I18nManager.isRTL : I18nManager.isRTL;

    return (
        <View style={styles.container}>
            {/* Greeting */}
            <View style={styles.greetingContainer}>
                <Text style={[styles.greetingText, isRTL && styles.textRTL]}>{greeting}</Text>
                <Text style={[styles.subGreetingText, isRTL && styles.textRTL]}>{subGreeting}</Text>
            </View>

            {/* Summary Grid */}
            {summary && (
                <View style={styles.summaryGrid}>
                    <View style={styles.summaryRow}>
                        <SummaryCard
                            icon={<Landmark size={16} color={color.brand[600]} />}
                            label={isAr ? 'إجمالي الرصيد' : 'Total Balance'}
                            value={formatCurrency(summary.totalBalance, 'SAR', locale)}
                            isRTL={isLayoutRTL}
                        />
                        <SummaryCard
                            icon={<TrendingDown size={16} color="#EF4444" />}
                            label={isAr ? 'المصروفات الشهرية' : 'Monthly Spending'}
                            value={formatCurrency(summary.monthlySpending, 'SAR', locale)}
                            isRTL={isLayoutRTL}
                        />
                    </View>
                    <View style={styles.summaryRow}>
                        <SummaryCard
                            icon={<FileText size={16} color="#D97706" />}
                            label={isAr ? 'فواتير معلقة' : 'Pending Bills'}
                            value={
                                summary.pendingBills.count > 0
                                    ? formatCurrency(summary.pendingBills.amount, 'SAR', locale)
                                    : isAr
                                        ? 'لا توجد'
                                        : 'None'
                            }
                            subtitle={
                                summary.pendingBills.count > 0
                                    ? isAr
                                        ? `${summary.pendingBills.count} فواتير`
                                        : `${summary.pendingBills.count} bills`
                                    : undefined
                            }
                            isRTL={isLayoutRTL}
                        />
                        <SummaryCard
                            icon={<CreditCard size={16} color="#16A34A" />}
                            label={isAr ? 'البطاقات النشطة' : 'Active Cards'}
                            value={`${summary.activeCards}`}
                            subtitle={isAr ? 'بطاقات' : 'cards'}
                            isRTL={isLayoutRTL}
                        />
                    </View>
                </View>
            )}

            {/* Quick Action Buttons */}
            <View style={[styles.quickActionsContainer, isLayoutRTL && styles.quickActionsContainerRTL]}>
                {actions.map((action) => {
                    const Icon = action.icon;
                    return (
                        <TouchableOpacity
                            key={action.label}
                            style={styles.quickActionButton}
                            onPress={() => onQuickAction(action.message)}
                            activeOpacity={0.7}
                        >
                            <Icon size={16} color={color.brand[600]} />
                            <Text style={[styles.quickActionText, isRTL && styles.textRTL]}>
                                {action.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 32,
        paddingBottom: 24,
        gap: 24,
    },
    greetingContainer: {
        alignItems: 'center',
    },
    greetingText: {
        fontSize: 28,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 8,
    },
    subGreetingText: {
        fontSize: 15,
        color: '#6B7280',
    },
    textRTL: {
        textAlign: 'right',
        writingDirection: 'rtl',
    },
    summaryGrid: {
        width: '100%',
        maxWidth: 380,
        gap: 12,
    },
    summaryRow: {
        flexDirection: 'row',
        gap: 12,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#F3F4F6',
        borderRadius: 16,
        padding: 14,
        gap: 8,
    },
    summaryCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    summaryCardHeaderRTL: {
        flexDirection: 'row-reverse',
    },
    summaryCardLabel: {
        fontSize: 11,
        color: '#6B7280',
    },
    summaryCardValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
    },
    summaryCardSubtitle: {
        fontSize: 11,
        color: '#6B7280',
        marginTop: -4,
    },
    quickActionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        maxWidth: 380,
    },
    quickActionsContainerRTL: {
        flexDirection: 'row-reverse',
    },
    quickActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
    },
    quickActionText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#111827',
    },
});
