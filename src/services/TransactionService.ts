import { ENV } from '../config/constants';
import { TransactionListQuery, TransactionListResult } from '../types';

/**
 * Resolves `ui.transactionList` against the accounts API.
 *
 * The assistant sends a QUERY (days, category, direction, limit…), not rows —
 * the same contract the web app uses — so the client is what actually fetches
 * the transactions. Unset filters are omitted so the server applies its own
 * defaults rather than receiving a literal "null".
 */
export class TransactionService {
    static async fetchTransactions(
        query: TransactionListQuery
    ): Promise<TransactionListResult | null> {
        const base = ENV.API_CALLBACK_URL;
        if (!base) {
            console.error(
                'TransactionService: EXPO_PUBLIC_API_CALLBACK_URL is not set. ' +
                'It is inlined at build time, so a bundle built without it can ' +
                'never resolve transactions.'
            );
            return null;
        }

        const params = new URLSearchParams();
        const forward: (keyof TransactionListQuery)[] = [
            'accountId',
            'merchant',
            'category',
            'direction',
            'days',
            'from',
            'to',
            'minAmount',
            'maxAmount',
            'limit',
        ];

        forward.forEach(key => {
            const value = query[key];
            if (value !== undefined && value !== null && value !== '') {
                params.append(key, String(value));
            }
        });

        const url = `${base.replace(/\/$/, '')}/api/transactions?${params.toString()}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.error(
                    `TransactionService: ${response.status} from ${url}`
                );
                return null;
            }

            const data = await response.json();
            const transactions = Array.isArray(data?.transactions) ? data.transactions : [];

            return {
                transactions,
                count: typeof data?.count === 'number' ? data.count : transactions.length,
                totalIn: typeof data?.totalIn === 'number' ? data.totalIn : 0,
                totalOut: typeof data?.totalOut === 'number' ? data.totalOut : 0,
                currency: data?.currency || 'SAR',
            };
        } catch (error) {
            // A failed lookup must not take the whole reply down — the assistant's
            // text still stands on its own, the card is simply omitted.
            console.error('TransactionService: failed to fetch transactions', error);
            return null;
        }
    }
}

export default TransactionService;
