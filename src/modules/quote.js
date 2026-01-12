import { fetchDailyQuote } from './api.js';

export async function loadDailyQuote() {
    try {
        const quoteData = await fetchDailyQuote();
        const textEl = document.getElementById('quote-text');
        const authorEl = document.getElementById('quote-author');
        if (textEl) textEl.textContent = `"${quoteData.text}"`;
        if (authorEl) authorEl.textContent = quoteData.author;
    } catch (e) {
        console.error('Не вдалося завантажити цитату', e);
    }
}

