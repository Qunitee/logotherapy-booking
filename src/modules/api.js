import axios from 'axios';
import materialsData from '../data/logotherapy-materials.json';

const QUOTE_CACHE_KEY = 'logotherapy_quote_cache';
const QUOTE_TTL_MS = 1000 * 60 * 60;

const ARTICLES_CACHE_KEY = 'logotherapy_articles_cache';
const ARTICLES_TTL_MS = 1000 * 60 * 60;

export async function fetchDailyQuote() {
    try {
        const cached = localStorage.getItem(QUOTE_CACHE_KEY);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (Date.now() - parsed.timestamp < QUOTE_TTL_MS) {
                return parsed.data;
            }
        }

        const response = await axios.get('https://api.allorigins.win/raw?url=https://zenquotes.io/api/random');

        const data = response.data[0];
        const normalized = {
            text: data.q,
            author: data.a
        };

        localStorage.setItem(QUOTE_CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            data: normalized
        }));

        return normalized;
    } catch (error) {
        console.warn('Quote API failed, using fallback', error);
        return {
            text: "Той, хто має НАВІЩО жити, може витримати майже будь-яке ЯК.",
            author: "Фрідріх Ніцше (улюблена цитата В. Франкла)"
        };
    }
}

export async function fetchArticlesPage(page, limit) {
    const cacheKey = `${ARTICLES_CACHE_KEY}_${page}_${limit}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < ARTICLES_TTL_MS) {
            return parsed.data;
        }
    }

    const start = (page - 1) * limit;
    const end = start + limit;
    const slice = materialsData.slice(start, end);

    const data = {
        items: slice,
        total: materialsData.length
    };

    sessionStorage.setItem(cacheKey, JSON.stringify({
        timestamp: Date.now(),
        data
    }));

    return data;
}