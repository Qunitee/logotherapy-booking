import { getSessionUser, setSessionUser } from './storage.js';

let currentUser = null;

function normalizeUser(user) {
    if (!user) return null;
    return user.email ? { ...user, email: user.email.toLowerCase() } : { ...user };
}

function loadCurrentUser() {
    const user = getSessionUser();
    return normalizeUser(user);
}

export function initSession() {
    currentUser = loadCurrentUser();
    return currentUser;
}

export function getCurrentUser() {
    return currentUser;
}

export function saveCurrentUser(user) {
    currentUser = normalizeUser(user);
    setSessionUser(currentUser);
    return currentUser;
}

export function clearCurrentUser() {
    currentUser = null;
    setSessionUser(null);
}

export function updateAuthUI() {
    const label = document.getElementById('current-user-label');
    const authBtnLabel = document.getElementById('auth-btn-label');
    const logoutBtn = document.getElementById('logout-btn');
    const authHint = document.getElementById('auth-hint-text');
    const authWarning = document.getElementById('auth-warning');

    if (!label || !authBtnLabel || !logoutBtn || !authHint || !authWarning) {
        return;
    }

    if (currentUser) {
        label.textContent = currentUser.name || currentUser.email;
        label.classList.remove('d-none');
        authBtnLabel.textContent = 'Обліковий запис';
        logoutBtn.style.display = 'inline-block';
        authHint.textContent = 'Ви авторизовані. Ви можете підтверджувати запис.';
        authWarning.style.display = 'none';
    } else {
        label.classList.add('d-none');
        authBtnLabel.textContent = 'Увійти';
        logoutBtn.style.display = 'none';
        authHint.textContent = 'Для підтвердження запису потрібно увійти або зареєструватися.';
        authWarning.style.display = 'block';
    }
}

