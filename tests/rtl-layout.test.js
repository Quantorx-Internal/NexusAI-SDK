import { test, expect, mock, afterEach } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const h = React.createElement;
const nativeDirection = { isRTL: false };
const rendered = [];
const flatten = value => Array.isArray(value)
    ? Object.assign({}, ...value.map(flatten)) : value || {};
function host(kind) {
    return props => {
        const style = flatten(typeof props.style === 'function' ? props.style({ pressed: false }) : props.style);
        rendered.push({ kind, ...props, style });
        return h('div', null, props.children);
    };
}
mock.module('react-native', () => ({
    View: host('View'), Text: host('Text'), Pressable: host('Pressable'), ScrollView: host('ScrollView'),
    StyleSheet: { create: x => x, flatten, hairlineWidth: 1 },
    I18nManager: nativeDirection, Platform: { OS: 'ios', select: x => x.ios ?? x.default },
}));
mock.module('lucide-react-native', () => ({ Copy: host('Copy'), Check: host('Check'), Sparkles: host('Sparkles') }));
mock.module('expo-clipboard', () => ({ setStringAsync: async () => {} }));
const { LayoutDirectionProvider, DirectionalView } = await import('../src/contexts/LayoutDirectionContext');
const { DetailRow } = await import('../src/components/ui/DetailRow');
const { CopyField } = await import('../src/components/ui/CopyField');
const { SuggestionChips } = await import('../src/components/Chat/Composer/SuggestionChips');
afterEach(() => { nativeDirection.isRTL = false; rendered.length = 0; });

for (const nativeRTL of [false, true]) {
    for (const languageRTL of [false, true]) {
        test(`detail labels/values keep opposite reading edges: locale ${languageRTL ? 'ar' : 'en'}, native ${nativeRTL ? 'RTL' : 'LTR'}`, () => {
            nativeDirection.isRTL = nativeRTL;
            renderToStaticMarkup(h(LayoutDirectionProvider, { languageRTL },
                h(DetailRow, { label: 'Monthly installment', value: '983.33 SAR' })));
            const row = rendered.find(x => x.kind === 'View');
            const [label, value] = rendered.filter(x => x.kind === 'Text');
            const reversed = row.style.flexDirection === 'row-reverse';
            expect(nativeRTL !== reversed).toBe(languageRTL);
            const physicalLabelRight = (label.style.textAlign === 'right') !== nativeRTL;
            const physicalValueRight = (value.style.textAlign === 'right') !== nativeRTL;
            expect(physicalLabelRight).toBe(languageRTL);
            expect(physicalValueRight).toBe(!languageRTL);
            expect(label.style.writingDirection).toBe(languageRTL ? 'rtl' : 'ltr');
            expect(label.style.flexShrink).toBe(1);
        });
        test(`scoped card avoids double mirroring: locale ${languageRTL ? 'ar' : 'en'}, native ${nativeRTL ? 'RTL' : 'LTR'}`, () => {
            nativeDirection.isRTL = nativeRTL;
            renderToStaticMarkup(h(LayoutDirectionProvider, { languageRTL },
                h(DirectionalView, { languageRTL }, h(DetailRow, { label: 'المبلغ', value: '1,250.50' }))));
            const views = rendered.filter(x => x.kind === 'View');
            expect(views[0].style.direction).toBe(languageRTL ? 'rtl' : 'ltr');
            expect(views[1].style.flexDirection).toBe('row');
            expect(rendered.find(x => x.kind === 'Text').style.writingDirection).toBe(languageRTL ? 'rtl' : 'ltr');
            expect(nativeDirection.isRTL).toBe(nativeRTL);
        });
    }
}
test('reference IDs retain LTR layout inside Arabic cards', () => {
    renderToStaticMarkup(h(DirectionalView, { languageRTL: true }, h(CopyField, { value: 'TRF-2026-00123' })));
    expect(rendered.find(x => x.kind === 'Pressable').style.direction).toBe('ltr');
    const value = rendered.find(x => x.kind === 'Text');
    expect(value.children).toBe('TRF-2026-00123');
    expect(value.style.writingDirection).toBe('ltr');
    expect(value.style.textAlign).toBe('left');
});
test('Arabic suggestions keep priority order and use native RTL scrolling without inversion', () => {
    renderToStaticMarkup(h(SuggestionChips, { isRTL: true, suggestions: [
        { id: 'primary', label: 'دفع الفاتورة', primary: true }, { id: 'secondary', label: 'الرصيد' },
    ] }));
    expect(rendered[0].style.direction).toBe('rtl');
    expect(rendered.find(x => x.kind === 'ScrollView').inverted).toBeUndefined();
    expect(rendered.filter(x => x.kind === 'Text').map(x => x.children)).toEqual(['دفع الفاتورة', 'الرصيد']);
});
