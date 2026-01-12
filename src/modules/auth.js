import { getAllUsers, saveNewUser } from './storage.js';
import { validateEmail } from './validation.js';
import { saveCurrentUser, clearCurrentUser, updateAuthUI } from './session.js';

export function setupAuthHandlers({ onAuthChange = () => {}, onRevalidateBooking = () => {} } = {}) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const logoutBtn = document.getElementById('logout-btn');

    if (!loginForm || !registerForm || !logoutBtn) return;

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value.trim();
        const email = document.getElementById('register-email').value.trim().toLowerCase();
        const password = document.getElementById('register-password').value.trim();

        if (!name || name.length < 2 || !validateEmail(email) || password.length < 6) {
            alert('Перевірте коректність введених даних');
            return;
        }

        const newUser = { name, email, passwordHash: btoa(password) };

        const isSaved = saveNewUser(newUser);
        if (!isSaved) {
            alert('Користувач з таким email вже існує!');
            return;
        }

        saveCurrentUser(newUser);
        updateAuthUI();
        onAuthChange();

        registerForm.reset();
        registerForm.querySelectorAll('input').forEach(i => i.classList.remove('is-valid', 'is-invalid'));

        const authModalEl = document.getElementById('authModal');
        bootstrap.Modal.getInstance(authModalEl)?.hide();
        onRevalidateBooking();
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim().toLowerCase();
        const password = document.getElementById('login-password').value.trim();

        const allUsers = getAllUsers();
        const foundUser = allUsers.find(u => u.email === email);

        if (!foundUser || foundUser.passwordHash !== btoa(password)) {
            alert('Невірний email або пароль');
            return;
        }

        saveCurrentUser(foundUser);
        updateAuthUI();
        onAuthChange();

        loginForm.reset();
        loginForm.querySelectorAll('input').forEach(i => i.classList.remove('is-valid', 'is-invalid'));

        const authModalEl = document.getElementById('authModal');
        bootstrap.Modal.getInstance(authModalEl)?.hide();
        onRevalidateBooking();
    });

    logoutBtn.addEventListener('click', () => {
        clearCurrentUser();
        updateAuthUI();
        onAuthChange();
        onRevalidateBooking();
    });

    [document.getElementById('login-email'), document.getElementById('register-email')].forEach(input => {
        if (!input) return;
        input.addEventListener('input', function() {
            if (validateEmail(this.value)) {
                this.classList.remove('is-invalid');
                this.classList.add('is-valid');
            } else {
                this.classList.remove('is-valid');
                if (this.value.length > 0) this.classList.add('is-invalid');
            }
        });
    });
}

