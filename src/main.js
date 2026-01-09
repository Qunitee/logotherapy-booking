import './style.css';
import { Calendar } from './modules/calendar.js';
import { fetchDailyQuote, fetchArticlesPage } from './modules/api.js';
import { getAppointments, saveAppointment, isSlotTaken } from './modules/storage.js';
import { validatePhone, validateEmail } from './modules/validation.js';

let selectedTime = null;
let currentSelectedDate = null;
let currentUser = null;

let articlesPage = 1;
const ARTICLES_LIMIT = 10;
let articlesTotal = 0;
let isLoadingArticles = false;

const USER_KEY = 'logotherapy_user';

function loadCurrentUser() {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
        const user = JSON.parse(raw);
        if (user && user.email) {
            user.email = user.email.toLowerCase();
        }
        return user;
    } catch {
        return null;
    }
}

function saveCurrentUser(user) {
    if (!user) {
        localStorage.removeItem(USER_KEY);
        currentUser = null;
        return;
    }
    if (user.email) {
        user.email = user.email.toLowerCase();
    }
    currentUser = user;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
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

// --- Ініціалізація ---
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = loadCurrentUser();
    updateAuthUI();

    const quoteData = await fetchDailyQuote();
    document.getElementById('quote-text').textContent = `"${quoteData.text}"`;
    document.getElementById('quote-author').textContent = quoteData.author;

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

    const form = document.getElementById('booking-form');
    const submitBtn = document.getElementById('submit-btn');
    const phoneInput = document.getElementById('phone');
    const nameInput = document.getElementById('name');

    const validateState = () => {
        const isPhoneValid = validatePhone(phoneInput.value);
        const isNameValid = nameInput.value.length >= 2;
        const isTimeSelected = selectedTime !== null;
        const isLoggedIn = !!currentUser;

        submitBtn.disabled = !(isPhoneValid && isNameValid && isTimeSelected && isLoggedIn);
    };

    [phoneInput, nameInput].forEach(el => el.addEventListener('input', validateState));

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        if (!currentSelectedDate || !selectedTime || !currentUser) return;

        const appointment = {
            id: crypto.randomUUID(),
            userEmail: currentUser.email,
            name: nameInput.value,
            phone: phoneInput.value,
            date: currentSelectedDate,
            time: selectedTime,
            createdAt: new Date().toISOString()
        };

        saveAppointment(appointment);

        const modalEl = document.getElementById('successModal');
        document.getElementById('modal-date').textContent = currentSelectedDate;
        document.getElementById('modal-time').textContent = selectedTime;

        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        form.reset();
        selectedTime = null;
        onDateSelected(currentSelectedDate);
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
                document.getElementById('name').dispatchEvent(new Event('input'));
            });
        }

        slotsContainer.appendChild(btn);
    });
}

function setupAuthHandlers(revalidateBookingForm) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const logoutBtn = document.getElementById('logout-btn');

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value.trim();
        const email = document.getElementById('register-email').value.trim().toLowerCase();
        const password = document.getElementById('register-password').value.trim();

        if (!name || name.length < 2) {
            document.getElementById('register-name').classList.add('is-invalid');
            return;
        }

        if (!validateEmail(email)) {
            document.getElementById('register-email').classList.add('is-invalid');
            return;
        }

        if (password.length < 6) {
            document.getElementById('register-password').classList.add('is-invalid');
            return;
        }

        const user = { name, email, passwordHash: btoa(password) };
        saveCurrentUser(user);
        updateAuthUI();

        registerForm.reset();
        document.querySelectorAll('#register-pane .is-valid, #register-pane .is-invalid').forEach(el => {
            el.classList.remove('is-valid', 'is-invalid');
        });

        const authModalEl = document.getElementById('authModal');
        bootstrap.Modal.getInstance(authModalEl)?.hide();
        revalidateBookingForm();
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim().toLowerCase();
        const password = document.getElementById('login-password').value.trim();

        if (!validateEmail(email)) {
            document.getElementById('login-email').classList.add('is-invalid');
            return;
        }

        const stored = loadCurrentUser();
        
        if (!stored) {
            alert('Користувача з таким email не знайдено. Будь ласка, зареєструйтеся.');
            return;
        }

        const storedEmail = (stored.email || '').toLowerCase();
        const inputEmail = email.toLowerCase();
        const emailMatch = storedEmail === inputEmail;
        const passwordMatch = stored.passwordHash === btoa(password);

        if (!emailMatch || !passwordMatch) {
            alert('Невірний email або пароль');
            document.getElementById('login-password').value = '';
            return;
        }

        saveCurrentUser(stored);
        updateAuthUI();

        loginForm.reset();
        document.querySelectorAll('#login-pane .is-valid, #login-pane .is-invalid').forEach(el => {
            el.classList.remove('is-valid', 'is-invalid');
        });

        const authModalEl = document.getElementById('authModal');
        bootstrap.Modal.getInstance(authModalEl)?.hide();
        revalidateBookingForm();
    });

    document.getElementById('login-email').addEventListener('input', function() {
        if (validateEmail(this.value)) {
            this.classList.remove('is-invalid');
            this.classList.add('is-valid');
        } else {
            this.classList.remove('is-valid');
            if (this.value.length > 0) {
                this.classList.add('is-invalid');
            }
        }
    });

    document.getElementById('register-email').addEventListener('input', function() {
        if (validateEmail(this.value)) {
            this.classList.remove('is-invalid');
            this.classList.add('is-valid');
        } else {
            this.classList.remove('is-valid');
            if (this.value.length > 0) {
                this.classList.add('is-invalid');
            }
        }
    });

    logoutBtn.addEventListener('click', () => {
        saveCurrentUser(null);
        updateAuthUI();
        revalidateBookingForm();
    });
}

async function loadArticlesPage() {
    if (isLoadingArticles) return;
    const listEl = document.getElementById('articles-list');
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

        counter.textContent = `${listEl.children.length} з ${articlesTotal} матеріалів`;
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
        const threshold = 80;
        if (listEl.scrollTop + listEl.clientHeight >= listEl.scrollHeight - threshold) {
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
        : all;

    const upcoming = own
        .filter(a => new Date(`${a.date}T${a.time}`) >= now)
        .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`))
        .slice(0, 5);

    if (upcoming.length === 0) {
        const li = document.createElement('li');
        li.className = 'list-group-item small text-muted';
        li.textContent = 'У вас поки немає запланованих сесій.';
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