/** User-interface text only. Stored IDs, paths and note contents are unchanged. */
import { english } from './uiMessages';

export function interfaceLanguage(): 'zh' | 'en' {
    // Pure model tests have no host. Obsidian defaults to English when unset.
    if (typeof window === 'undefined') return 'zh';
    try {
        const lang = window.localStorage?.getItem('language') ||
            (typeof document === 'undefined' ? '' : document.documentElement.lang) || 'en';
        return lang.toLowerCase().startsWith('zh') ? 'zh' : 'en';
    }
    catch { return 'en'; }
}

export function localize(text: string | TemplateStringsArray, ...values: unknown[]): string {
    const key = typeof text === 'string' ? text : text.reduce((s, part, i) => s + (i ? `{${i - 1}}` : '') + part, '');
    const translated = interfaceLanguage() === 'zh' ? key : (english[key] ?? key);
    // Replace only placeholders originating from the template, never content
    // inside user-provided names, paths or search queries.
    return typeof text === 'string' ? translated : translated.replace(/\{(\d+)\}/g, (match, i) => Number(i) < values.length ? String(values[Number(i)]) : match);
}
