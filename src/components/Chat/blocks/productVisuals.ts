import {
    TrendingUp,
    ArrowLeftRight, ArrowRightLeft, CircleArrowUp, Banknote, Calendar, Car,
    CreditCard, House, Layers, PiggyBank, Plane, RefreshCw, Split, Target,
    Wallet, Zap,
} from 'lucide-react-native';
import { Tone } from '../../../theme/tokens';
import { Product } from '../../../types';

/**
 * The server names its product icons in lucide kebab case. Two of the names it
 * uses were renamed in the lucide version we ship — `arrow-up-circle` became
 * `circle-arrow-up` and `home` became `house` — so mapping by name blindly would
 * render nothing for those two. This table is the full vocabulary the products
 * API actually returns, checked against the installed icon set.
 */
const ICONS: Record<string, any> = {
    'arrow-left-right': ArrowLeftRight,
    'arrow-right-left': ArrowRightLeft,
    'arrow-up-circle': CircleArrowUp,
    'circle-arrow-up': CircleArrowUp,
    banknote: Banknote,
    calendar: Calendar,
    car: Car,
    'credit-card': CreditCard,
    home: House,
    house: House,
    layers: Layers,
    'piggy-bank': PiggyBank,
    plane: Plane,
    'refresh-cw': RefreshCw,
    split: Split,
    target: Target,
    wallet: Wallet,
    zap: Zap,
    // Not in the live vocabulary; used by the offline mock adapter.
    'trending-up': TrendingUp,
};

/** Three product categories, three tints — no per-product colour. */
const CATEGORY_TONE: Record<string, Tone> = {
    saving: 'success',
    lending: 'info',
    credit_card: 'brandTint',
};

export function productVisual(product: Product): { Icon: any; tone: Tone } {
    return {
        Icon: ICONS[product.icon || ''] || Wallet,
        tone: CATEGORY_TONE[product.category] || 'brandTint',
    };
}

export const categoryLabel = (category: string, locale: 'en' | 'ar'): string => {
    const labels: Record<string, { en: string; ar: string }> = {
        saving: { en: 'Saving', ar: 'ادخار' },
        lending: { en: 'Financing', ar: 'تمويل' },
        credit_card: { en: 'Cards', ar: 'بطاقات' },
    };
    return labels[category]?.[locale] || category;
};
