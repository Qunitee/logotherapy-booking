import './style.css';
import { Calendar } from './modules/calendar.js';
import { fetchDailyQuote, fetchArticlesPage } from './modules/api.js';
import {
    getAppointments,
    saveAppointment,
    isSlotTaken,
    getAllUsers,
    saveNewUser,
    getSessionUser,
    setSessionUser
} from './modules/storage.js';
import { validatePhone, validateEmail, normalizePhone } from './modules/validation.js';

let selectedTime = null;
let currentSelectedDate = null;
let currentUser = null;

let articlesPage = 1;
const ARTICLES_LIMIT = 10;
let articlesTotal = 0;
let isLoadingArticles = false;

function loadCurrentUser() {
    const user = getSessionUser();
    if (user && user.email) {
        user.email = user.email.toLowerCase();
    }
    return user;
}

function saveCurrentUser(user) {
    if (user && user.email) {
        user.email = user.email.toLowerCase();
    }
    currentUser = user;
    setSessionUser(user);
}

function updateAuthUI() {
    const label = document.getElementById('current-user-label');
    const authBtnLabel = document.getElementById('auth-btn-label');
    const logoutBtn = document.getElementById('logout-btn');
    const authHint = document.getElementById('auth-hint-text');
    const authWarning = document.getElementById('auth-warning');

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

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = loadCurrentUser();
    updateAuthUI();

    // Завантаження цитати
    try {
        const quoteData = await fetchDailyQuote();
        document.getElementById('quote-text').textContent = `"${quoteData.text}"`;
        document.getElementById('quote-author').textContent = quoteData.author;
    } catch (e) {
        console.error('Не вдалося завантажити цитату', e);
    }

    // Календар
    const calendar = new Calendar(onDateSelected);
    const titleEl = document.getElementById('calendar-title');
    const updateCalendarUI = () => {
        titleEl.textContent = calendar.currentMonthName;
        calendar.render('calendar-grid');
    };

    document.getElementById('prev-month').addEventListener('click', () => {
        calendar.prevMonth();
        updateCalendarUI();
    });

    document.getElementById('next-month').addEventListener('click', () => {
        calendar.nextMonth();
        updateCalendarUI();
    });

    updateCalendarUI();

    // --- ЛОГІКА БРОНЮВАННЯ ТА ВАЛІДАЦІЇ ---
    const form = document.getElementById('booking-form');
    const submitBtn = document.getElementById('submit-btn');
    const phoneInput = document.getElementById('phone');
    const nameInput = document.getElementById('name');

    // Функція перевірки загального стану форми
    const validateState = () => {
        const isPhoneValid = validatePhone(phoneInput.value);
        const isNameValid = nameInput.value.length >= 2;
        const isTimeSelected = selectedTime !== null;
        const isLoggedIn = !!currentUser;

        // Кнопка активна тільки якщо всі умови виконані
        submitBtn.disabled = !(isPhoneValid && isNameValid && isTimeSelected && isLoggedIn);
    };

    // 1. Обробка введення телефону (візуалізація помилок)
    phoneInput.addEventListener('input', () => {
        const isValid = validatePhone(phoneInput.value);
        if (isValid) {
            phoneInput.classList.remove('is-invalid');
            phoneInput.classList.add('is-valid');
        } else {
            phoneInput.classList.remove('is-valid');
            // Показуємо помилку тільки якщо поле не порожнє
            if (phoneInput.value.length > 0) {
                phoneInput.classList.add('is-invalid');
            } else {
                phoneInput.classList.remove('is-invalid');
            }
        }
        validateState();
    });

    // 2. Обробка втрати фокусу телефону (нормалізація: 099 -> +38099)
    phoneInput.addEventListener('blur', () => {
        if (validatePhone(phoneInput.value)) {
            phoneInput.value = normalizePhone(phoneInput.value);
            // Оновлюємо класи після зміни значення
            phoneInput.classList.remove('is-invalid');
            phoneInput.classList.add('is-valid');
        }
        validateState();
    });

    // 3. Обробка введення імені
    nameInput.addEventListener('input', () => {
        if (nameInput.value.length >= 2) {
            nameInput.classList.remove('is-invalid');
            nameInput.classList.add('is-valid');
        } else {
            nameInput.classList.remove('is-valid');
            if (nameInput.value.length > 0) {
                nameInput.classList.add('is-invalid');
            }
        }
        validateState();
    });

    // Обробка відправки форми
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentSelectedDate || !selectedTime || !currentUser) return;

        // Фінальна нормалізація телефону перед збереженням
        const finalPhone = normalizePhone(phoneInput.value);

        if (!validatePhone(finalPhone)) {
            alert('Будь ласка, введіть коректний номер телефону.');
            return;
        }

        const appointment = {
            id: crypto.randomUUID(),
            userEmail: currentUser.email,
            name: nameInput.value,
            phone: finalPhone, // Зберігаємо нормалізований номер
            date: currentSelectedDate,
            time: selectedTime,
            createdAt: new Date().toISOString()
        };

        saveAppointment(appointment);

        // Модальне вікно успіху
        const modalEl = document.getElementById('successModal');
        document.getElementById('modal-date').textContent = currentSelectedDate;
        document.getElementById('modal-time').textContent = selectedTime;

        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        // Очищення форми
        form.reset();
        phoneInput.classList.remove('is-valid', 'is-invalid');
        nameInput.classList.remove('is-valid', 'is-invalid');

        selectedTime = null;
        onDateSelected(currentSelectedDate); // Оновити слоти (прибрати зайнятий)
        validateState();
        renderUpcomingAppointments();
    });

    setupAuthHandlers(validateState);
    setupArticlesInfiniteScroll();
    renderUpcomingAppointments();
});

function onDateSelected(dateStr) {
    currentSelectedDate = dateStr;
    selectedTime = null;

    document.getElementById('selected-date-display').textContent = dateStr;
    // При зміні дати скидаємо час і блокуємо кнопку
    document.getElementById('submit-btn').disabled = true;

    const slotsContainer = document.getElementById('time-slots');
    slotsContainer.innerHTML = '';

    const hours = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

    hours.forEach(time => {
        const btn = document.createElement('button');
        const isTaken = isSlotTaken(dateStr, time);

        btn.className = isTaken
            ? 'btn btn-secondary time-slot disabled'
            : 'btn btn-outline-primary time-slot';

        btn.textContent = time;
        btn.disabled = isTaken;
        btn.type = "button";

        if (!isTaken) {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.time-slot').forEach(b => {
                    if (!b.disabled) {
                        b.classList.remove('btn-primary', 'text-white');
                        b.classList.add('btn-outline-primary');
                    }
                });
                btn.classList.remove('btn-outline-primary');
                btn.classList.add('btn-primary', 'text-white');

                selectedTime = time;
                // Тригеримо перевірку валідності кнопки
                document.getElementById('phone').dispatchEvent(new Event('input'));
            });
        }
        slotsContainer.appendChild(btn);
    });
}

function setupAuthHandlers(revalidateBookingForm) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const logoutBtn = document.getElementById('logout-btn');

    // Реєстрація
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

        registerForm.reset();
        registerForm.querySelectorAll('input').forEach(i => i.classList.remove('is-valid', 'is-invalid'));

        const authModalEl = document.getElementById('authModal');
        bootstrap.Modal.getInstance(authModalEl)?.hide();
        revalidateBookingForm();
    });

    // Логін
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

        loginForm.reset();
        loginForm.querySelectorAll('input').forEach(i => i.classList.remove('is-valid', 'is-invalid'));

        const authModalEl = document.getElementById('authModal');
        bootstrap.Modal.getInstance(authModalEl)?.hide();
        revalidateBookingForm();
    });

    logoutBtn.addEventListener('click', () => {
        saveCurrentUser(null);
        updateAuthUI();
        revalidateBookingForm();
    });

    // Жива валідація Email у модалці
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

function setupArticlesInfiniteScroll() {
    const listEl = document.getElementById('articles-list');
    if (!listEl) return;
    listEl.addEventListener('scroll', () => {
        if (listEl.scrollTop + listEl.clientHeight >= listEl.scrollHeight - 80) {
            loadArticlesPage();
        }
    });
    loadArticlesPage();
}

function renderUpcomingAppointments() {
    const listEl = document.getElementById('upcoming-list');
    if (!listEl) return;

    listEl.innerHTML = '';
    const all = getAppointments();
    const now = new Date();

    const own = currentUser
        ? all.filter(a => a.userEmail === currentUser.email)
        : [];

    const upcoming = own
        .filter(a => new Date(`${a.date}T${a.time}`) >= now)
        .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`))
        .slice(0, 5);

    if (upcoming.length === 0) {
        const li = document.createElement('li');
        li.className = 'list-group-item small text-muted';
        li.textContent = currentUser ? 'У вас поки немає запланованих сесій.' : 'Увійдіть, щоб бачити ваші записи.';
        listEl.appendChild(li);
        return;
    }

    upcoming.forEach(app => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = `<span>${app.date} • ${app.time}</span><span class="badge text-bg-primary">${app.name}</span>`;
        listEl.appendChild(li);
    });
}