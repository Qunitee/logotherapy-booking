import { fetchArticlesPage } from './api.js';

let articlesPage = 1;
const ARTICLES_LIMIT = 10;
let articlesTotal = 0;
let isLoadingArticles = false;

async function loadArticlesPage() {
    if (isLoadingArticles) return;
    const listEl = document.getElementById('articles-list');
    if (!listEl) return;

    const loader = document.getElementById('articles-loader');
    const endEl = document.getElementById('articles-end');
    const counter = document.getElementById('articles-counter');

    if (articlesTotal && listEl.children.length >= articlesTotal) {
        loader.classList.add('d-none');
        endEl.classList.remove('d-none');
        return;
    }

    isLoadingArticles = true;
    loader.classList.remove('d-none');

    try {
        const pageData = await fetchArticlesPage(articlesPage, ARTICLES_LIMIT);
        articlesTotal = pageData.total;

        pageData.items.forEach((item) => {
            const a = document.createElement('a');
            a.href = '#';
            a.className = 'list-group-item list-group-item-action';
            a.innerHTML = `<h6 class="mb-1">${item.title}</h6><p class="mb-1 small text-muted">${item.body}</p>`;
            listEl.appendChild(a);
        });

        if (counter) counter.textContent = `${listEl.children.length} з ${articlesTotal} матеріалів`;
        articlesPage += 1;
    } catch (e) {
        console.error('Помилка завантаження матеріалів', e);
    } finally {
        isLoadingArticles = false;
        loader.classList.add('d-none');
    }
}

export function setupArticlesInfiniteScroll() {
    const listEl = document.getElementById('articles-list');
    if (!listEl) return;
    listEl.addEventListener('scroll', () => {
        if (listEl.scrollTop + listEl.clientHeight >= listEl.scrollHeight - 80) {
            loadArticlesPage();
        }
    });
    loadArticlesPage();
}

