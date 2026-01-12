import { isSlotTaken, saveAppointment, getAppointments } from './storage.js';
import { validatePhone, normalizePhone } from './validation.js';
import { getCurrentUser } from './session.js';

export function initBooking() {
    // Отримуємо елементи форми
    const form = document.getElementById('booking-form');
    const submitBtn = document.getElementById('submit-btn');
    const phoneInput = document.getElementById('phone');
    const nameInput = document.getElementById('name');
    const selectedDateDisplay = document.getElementById('selected-date-display');
    const slotsContainer = document.getElementById('time-slots');
    const upcomingListEl = document.getElementById('upcoming-list');

    // Якщо елементів немає на сторінці (наприклад, ми не на index.html), повертаємо заглушки
    if (!form || !submitBtn || !phoneInput || !nameInput || !selectedDateDisplay || !slotsContainer) {
        return {
            onDateSelected: () => {},
            revalidateBooking: () => {},
            handleUserChange: () => {},
            renderUpcomingAppointments: () => {}
        };
    }

    let selectedTime = null;
    let currentSelectedDate = null;

    const validateState = () => {
        const isPhoneValid = validatePhone(phoneInput.value);
        const isNameValid = nameInput.value.length >= 2;
        const isTimeSelected = selectedTime !== null;
        const user = getCurrentUser();

        // Кнопка активна тільки якщо все валідно І користувач залогінений
        submitBtn.disabled = !(isPhoneValid && isNameValid && isTimeSelected && user);

        if (!user) {
            submitBtn.textContent = 'Увійдіть, щоб записатися';
        } else {
            submitBtn.textContent = 'Записатися';
        }
    };

    // --- ОБРОБНИКИ ПОЛІВ ---
    phoneInput.addEventListener('input', () => {
        const isValid = validatePhone(phoneInput.value);
        if (isValid) {
            phoneInput.classList.remove('is-invalid');
            phoneInput.classList.add('is-valid');
        } else {
            phoneInput.classList.remove('is-valid');
            // Показуємо помилку тільки якщо щось введено
            if (phoneInput.value.length > 0) {
                phoneInput.classList.add('is-invalid');
            } else {
                phoneInput.classList.remove('is-invalid');
            }
        }
        validateState();
    });

    phoneInput.addEventListener('blur', () => {
        if (validatePhone(phoneInput.value)) {
            phoneInput.value = normalizePhone(phoneInput.value);
            phoneInput.classList.remove('is-invalid');
            phoneInput.classList.add('is-valid');
        }
        validateState();
    });

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

    // --- ВІДОБРАЖЕННЯ СПИСКУ МАЙБУТНІХ ЗАПИСІВ (Сайдбар) ---
    const renderUpcomingAppointments = () => {
        if (!upcomingListEl) return;

        upcomingListEl.innerHTML = '';
        const all = getAppointments();
        const now = new Date();
        const user = getCurrentUser();

        // Якщо користувач не увійшов
        if (!user) {
            const li = document.createElement('li');
            li.className = 'list-group-item small text-muted text-center';
            li.innerHTML = '<i class="bi bi-lock"></i> Увійдіть, щоб бачити ваші записи.';
            upcomingListEl.appendChild(li);
            return;
        }

        const own = all.filter(a => a.userEmail === user.email);

        // Беремо тільки майбутні
        const upcoming = own
            .filter(a => new Date(`${a.date}T${a.time}`) >= now)
            .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`))
            .slice(0, 5);

        if (upcoming.length === 0) {
            const li = document.createElement('li');
            li.className = 'list-group-item small text-muted text-center';
            li.textContent = 'У вас поки немає запланованих сесій.';
            upcomingListEl.appendChild(li);
            return;
        }

        upcoming.forEach(app => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            const dateObj = new Date(app.date);
            const dateStr = dateObj.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });

            li.innerHTML = `
                <div>
                    <span class="fw-bold">${dateStr}</span> <span class="text-muted small">${app.time}</span>
                </div>
                <span class="badge text-bg-primary rounded-pill"><i class="bi bi-check"></i></span>
            `;
            upcomingListEl.appendChild(li);
        });
    };

    // --- ЛОГІКА ВИБОРУ ДАТИ ТА ЧАСУ ---
    const onDateSelected = (dateStr) => {
        currentSelectedDate = dateStr;
        selectedTime = null;
        selectedDateDisplay.textContent = new Date(dateStr).toLocaleDateString('uk-UA', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        validateState();

        slotsContainer.innerHTML = '';
        const hours = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

        hours.forEach(time => {
            const btn = document.createElement('button');
            const isTaken = isSlotTaken(dateStr, time);

            btn.className = isTaken
                ? 'btn btn-secondary time-slot disabled opacity-50' // Зайнято
                : 'btn btn-outline-primary time-slot'; // Вільно

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
                    validateState(); // Перевіряємо, чи можна розблокувати кнопку "Записатися"
                });
            }
            slotsContainer.appendChild(btn);
        });
    };

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = getCurrentUser();

        if (!currentSelectedDate || !selectedTime || !user) {
            if (!user) alert('Будь ласка, увійдіть у систему.');
            return;
        }

        const finalPhone = normalizePhone(phoneInput.value);
        if (!validatePhone(finalPhone)) {
            alert('Будь ласка, введіть коректний номер телефону.');
            return;
        }

        // Генерація ID
        const appointmentId = typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : Date.now().toString();

        const appointment = {
            id: appointmentId,
            userEmail: user.email,
            name: nameInput.value,
            phone: finalPhone,
            date: currentSelectedDate,
            time: selectedTime,
            createdAt: new Date().toISOString()
        };

        saveAppointment(appointment);

        // 2. Показуємо успіх (Модалка)
        const modalEl = document.getElementById('successModal');
        if (modalEl) {
            document.getElementById('modal-date').textContent = currentSelectedDate;
            document.getElementById('modal-time').textContent = selectedTime;

            if (window.bootstrap) {
                const modal = new bootstrap.Modal(modalEl);
                modal.show();
            }
        } else {
            alert(`Успішно! Ви записані на ${currentSelectedDate} о ${selectedTime}`);
        }

        // 3. Очищення форми
        form.reset();
        phoneInput.classList.remove('is-valid', 'is-invalid');
        nameInput.classList.remove('is-valid', 'is-invalid');

        if (user && user.name) {
            nameInput.value = user.name;
            nameInput.classList.add('is-valid');
        }


        const dateToRefresh = currentSelectedDate;
        selectedTime = null;

        onDateSelected(dateToRefresh);
        renderUpcomingAppointments();
        validateState();
    });

    return {
        onDateSelected,
        revalidateBooking: validateState,
        handleUserChange: () => {
            const user = getCurrentUser();

            if (user && user.name) {
                nameInput.value = user.name;
                nameInput.classList.add('is-valid');
                nameInput.classList.remove('is-invalid');
            } else {
                nameInput.value = '';
                nameInput.classList.remove('is-valid');
            }

            validateState();
            renderUpcomingAppointments();
        },
        renderUpcomingAppointments
    };
}