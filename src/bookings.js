import { getAppointments } from './modules/storage.js';
import { validateEmail } from './modules/validation.js';

const USER_KEY = 'logotherapy_user';

let currentUser = null;
let allAppointments = [];
let filteredAppointments = [];

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

    if (currentUser) {
        label.textContent = currentUser.name || currentUser.email;
        label.classList.remove('d-none');
        authBtnLabel.textContent = 'Аккаунт';
        logoutBtn.style.display = 'inline-block';
    } else {
        label.classList.add('d-none');
        authBtnLabel.textContent = 'Увійти';
        logoutBtn.style.display = 'none';
    }
}

function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const months = [
        'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
        'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function getStatus(appointment) {
    const now = new Date();
    const appointmentDate = new Date(`${appointment.date}T${appointment.time}`);
    
    if (appointmentDate < now) {
        return { text: 'Минулий', class: 'bg-secondary' };
    } else {
        return { text: 'Майбутній', class: 'bg-success' };
    }
}

function renderAppointments() {
    const container = document.getElementById('appointments-container');
    const emptyState = document.getElementById('empty-state');
    const loginRequired = document.getElementById('login-required');

    container.innerHTML = '';

    if (!currentUser) {
        container.classList.add('d-none');
        emptyState.classList.add('d-none');
        loginRequired.classList.remove('d-none');
        return;
    }

    loginRequired.classList.add('d-none');

    if (filteredAppointments.length === 0) {
        container.classList.add('d-none');
        emptyState.classList.remove('d-none');
        return;
    }

    container.classList.remove('d-none');
    emptyState.classList.add('d-none');

    filteredAppointments.forEach(appointment => {
        const status = getStatus(appointment);
        const card = document.createElement('div');
        card.className = 'col-md-6 col-lg-4';
        card.innerHTML = `
            <div class="card appointment-card shadow-sm h-100">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h5 class="card-title mb-0">${appointment.name}</h5>
                        <span class="badge ${status.class} status-badge">${status.text}</span>
                    </div>
                    <p class="text-muted small mb-2">
                        <i class="bi bi-telephone me-1"></i>${appointment.phone}
                    </p>
                    <hr>
                    <div class="mb-2">
                        <i class="bi bi-calendar3 me-2 text-primary"></i>
                        <strong>Дата:</strong> ${formatDate(appointment.date)}
                    </div>
                    <div class="mb-2">
                        <i class="bi bi-clock me-2 text-primary"></i>
                        <strong>Час:</strong> ${appointment.time}
                    </div>
                    <div class="text-muted small mt-3">
                        <i class="bi bi-info-circle me-1"></i>
                        Записано: ${new Date(appointment.createdAt).toLocaleDateString('uk-UA')}
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function filterAppointments() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const statusFilter = document.getElementById('filter-status').value;

    filteredAppointments = allAppointments.filter(appointment => {
        // Пошук
        const matchesSearch = 
            appointment.name.toLowerCase().includes(searchTerm) ||
            appointment.phone.includes(searchTerm) ||
            appointment.date.includes(searchTerm) ||
            appointment.time.includes(searchTerm);

        if (!matchesSearch) return false;

        // Фільтр за статусом
        if (statusFilter === 'all') return true;
        
        const now = new Date();
        const appointmentDate = new Date(`${appointment.date}T${appointment.time}`);
        const isUpcoming = appointmentDate >= now;

        if (statusFilter === 'upcoming') return isUpcoming;
        if (statusFilter === 'past') return !isUpcoming;

        return true;
    });

    filteredAppointments.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        const now = new Date();
        
        const aIsUpcoming = dateA >= now;
        const bIsUpcoming = dateB >= now;
        
        if (aIsUpcoming && !bIsUpcoming) return -1;
        if (!aIsUpcoming && bIsUpcoming) return 1;
        
        return dateA - dateB;
    });

    renderAppointments();
}

function setupAuthHandlers() {
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
        loadAppointments();

        registerForm.reset();
        document.querySelectorAll('#register-pane .is-valid, #register-pane .is-invalid').forEach(el => {
            el.classList.remove('is-valid', 'is-invalid');
        });

        const authModalEl = document.getElementById('authModal');
        bootstrap.Modal.getInstance(authModalEl)?.hide();
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

        const emailMatch = stored.email.toLowerCase() === email;
        const passwordMatch = stored.passwordHash === btoa(password);

        if (!emailMatch || !passwordMatch) {
            alert('Невірний email або пароль');
            document.getElementById('login-password').value = '';
            return;
        }
        
        saveCurrentUser(stored);
        updateAuthUI();
        loadAppointments();

        loginForm.reset();
        document.querySelectorAll('#login-pane .is-valid, #login-pane .is-invalid').forEach(el => {
            el.classList.remove('is-valid', 'is-invalid');
        });

        const authModalEl = document.getElementById('authModal');
        bootstrap.Modal.getInstance(authModalEl)?.hide();
    });

    logoutBtn.addEventListener('click', () => {
        saveCurrentUser(null);
        updateAuthUI();
        loadAppointments();
    });

    // Валідація email в реальному часі
    document.getElementById('login-email').addEventListener('input', function() {
        if (validateEmail(this.value)) {
            this.classList.remove('is-invalid');
            this.classList.add('is-valid');
        } else {
            this.classList.remove('is-valid');
            this.classList.add('is-invalid');
        }
    });

    document.getElementById('register-email').addEventListener('input', function() {
        if (validateEmail(this.value)) {
            this.classList.remove('is-invalid');
            this.classList.add('is-valid');
        } else {
            this.classList.remove('is-valid');
            this.classList.add('is-invalid');
        }
    });
}

function loadAppointments() {
    currentUser = loadCurrentUser();
    updateAuthUI();

    if (!currentUser) {
        allAppointments = [];
        filteredAppointments = [];
        renderAppointments();
        return;
    }

    const all = getAppointments();
    allAppointments = all.filter(a => a.userEmail === currentUser.email);
    filterAppointments();
}

document.addEventListener('DOMContentLoaded', () => {
    loadAppointments();
    setupAuthHandlers();

    document.getElementById('search-input').addEventListener('input', filterAppointments);
    document.getElementById('filter-status').addEventListener('change', filterAppointments);
});

