import { Zap, Droplet, Wifi, Phone, CreditCard, Landmark } from 'lucide-react-native';
import { Tone } from '../../../theme/tokens';
import { Bill } from '../../../types';

/**
 * Bill type → lucide icon + semantic tint. Defined once so BillList and
 * BillPaymentPreview cannot drift apart.
 *
 * The tints are the semantic set, not decorative colours: government falls back
 * to the neutral tint rather than inventing a seventh hue.
 */
export function billVisual(type?: Bill['type']): { Icon: any; tone: Tone } {
    switch (type) {
        case 'electricity':
            return { Icon: Zap, tone: 'warning' };
        case 'water':
            return { Icon: Droplet, tone: 'info' };
        case 'internet':
            return { Icon: Wifi, tone: 'brandTint' };
        case 'phone':
            return { Icon: Phone, tone: 'success' };
        case 'credit_card':
            return { Icon: CreditCard, tone: 'danger' };
        case 'government':
            return { Icon: Landmark, tone: 'neutralTint' };
        default:
            return { Icon: Landmark, tone: 'neutralTint' };
    }
}
