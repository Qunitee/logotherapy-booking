import { getAllUsers, saveNewUser } from './storage.js';
import { validateEmail } from './validation.js';
import { saveCurrentUser, clearCurrentUser, updateAuthUI } from './session.js';

function safeBtoa(str) {
    try {
        return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
        return '';
    }
}

export function setupAuthHandlers({ onAuthChange = () => {}, onRevalidateBooking = () => {} } = {}) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const logoutBtn = document.getElementById('logout-btn');

    if (!loginForm || !registerForm || !logoutBtn) return;

    // --- РЕЄСТРАЦІЯ ---
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value.trim();
        const emailInput = document.getElementById('register-email');
        const email = emailInput.value.trim().toLowerCase();
        const password = document.getElementById('register-password').value.trim();

        // 1. Базова валідація полів
        if (!name || name.length < 2 || !validateEmail(email) || password.length < 6) {
            alert('Перевірте коректність введених даних');
            return;
        }

        // 2. ПЕРЕВІРКА НА УНІКАЛЬНІСТЬ EMAIL
        const allUsers = getAllUsers();

        // Шукаємо, чи є вже хтось з такою поштою
        const existingUser = allUsers.find(user => user.email === email);

        if (existingUser) {
            alert('Користувач з таким email вже зареєстрований! Спробуйте увійти.');

            // Підсвічуємо поле червоним для наочності
            emailInput.classList.remove('is-valid');
            emailInput.classList.add('is-invalid');
            emailInput.focus();
            return;
        }

        // 3. Якщо перевірку пройдено — створюємо об'єкт
        const newUser = { name, email, passwordHash: safeBtoa(password) };

        // 4. Зберігаємо
        const isSaved = saveNewUser(newUser);


        if (!isSaved) {
            alert('Помилка збереження. Можливо, користувач вже існує.');
            return;
        }

        saveCurrentUser(newUser);
        updateAuthUI();
        onAuthChange();

        registerForm.reset();
        registerForm.querySelectorAll('input').forEach(i => i.classList.remove('is-valid', 'is-invalid'));

        const authModalEl = document.getElementById('authModal');
        if (window.bootstrap) {
            const modal = bootstrap.Modal.getInstance(authModalEl);
            if (modal) modal.hide();
        }
        onRevalidateBooking();
    });

    // --- ВХІД ---
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim().toLowerCase();
        const password = document.getElementById('login-password').value.trim();

        const allUsers = getAllUsers();
        const foundUser = allUsers.find(u => u.email === email);

        if (!foundUser || foundUser.passwordHash !== safeBtoa(password)) {
            alert('Невірний email або пароль');
            return;
        }

        saveCurrentUser(foundUser);
        updateAuthUI();
        onAuthChange();

        loginForm.reset();
        loginForm.querySelectorAll('input').forEach(i => i.classList.remove('is-valid', 'is-invalid'));

        const authModalEl = document.getElementById('authModal');
        if (window.bootstrap) {
            const modal = bootstrap.Modal.getInstance(authModalEl);
            if (modal) modal.hide();
        }
        onRevalidateBooking();
    });

    // --- ВИХІД ---
    logoutBtn.addEventListener('click', () => {
        clearCurrentUser();
        updateAuthUI();
        onAuthChange();
        onRevalidateBooking();
    });

    // --- ЖИВА ВАЛІДАЦІЯ ---
    [document.getElementById('login-email'), document.getElementById('register-email')].forEach(input => {
        if (!input) return;
        input.addEventListener('input', function() {
            this.classList.remove('is-invalid');

            if (validateEmail(this.value)) {
                this.classList.add('is-valid');
            } else {
                this.classList.remove('is-valid');
                if (this.value.length > 0) this.classList.add('is-invalid');
            }
        });
    });
}