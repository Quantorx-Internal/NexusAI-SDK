import {
    ShoppingCart, UtensilsCrossed, ShoppingBag, Car, Film, HeartPulse,
    Plane, Receipt, Banknote, ArrowLeftRight, RotateCcw, Landmark, CircleDollarSign,
} from 'lucide-react-native';
import { Tone } from '../../../theme/tokens';

/**
 * Transaction category → lucide icon + semantic tint.
 *
 * The tints come from the semantic set rather than a per-category palette: the
 * design system has four accents plus brand and neutral, and a transaction list
 * is information (Family D), so no row is allowed to shout. Anything unmapped
 * falls back to the neutral tint instead of inventing a colour.
 */
export function transactionVisual(category?: string): { Icon: any; tone: Tone } {
    switch (category) {
        case 'groceries':
            return { Icon: ShoppingCart, tone: 'success' };
        case 'dining':
            return { Icon: UtensilsCrossed, tone: 'warning' };
        case 'shopping':
            return { Icon: ShoppingBag, tone: 'brandTint' };
        case 'transportation':
            return { Icon: Car, tone: 'info' };
        case 'entertainment':
            return { Icon: Film, tone: 'brandTint' };
        case 'health':
            return { Icon: HeartPulse, tone: 'danger' };
        case 'travel':
            return { Icon: Plane, tone: 'info' };
        case 'bills':
            return { Icon: Receipt, tone: 'warning' };
        case 'salary':
            return { Icon: Banknote, tone: 'success' };
        case 'transfer':
            return { Icon: ArrowLeftRight, tone: 'brandTint' };
        case 'refund':
            return { Icon: RotateCcw, tone: 'success' };
        case 'atm':
            return { Icon: Landmark, tone: 'neutralTint' };
        default:
            return { Icon: CircleDollarSign, tone: 'neutralTint' };
    }
}
