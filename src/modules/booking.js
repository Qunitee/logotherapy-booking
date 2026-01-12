import { isSlotTaken, saveAppointment, getAppointments } from './storage.js';
import { validatePhone, normalizePhone } from './validation.js';
import { getCurrentUser } from './session.js';

export function initBooking() {
    const form = document.getElementById('booking-form');
    const submitBtn = document.getElementById('submit-btn');
    const phoneInput = document.getElementById('phone');
    const nameInput = document.getElementById('name');
    const selectedDateDisplay = document.getElementById('selected-date-display');
    const slotsContainer = document.getElementById('time-slots');

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
        const isLoggedIn = !!getCurrentUser();
        submitBtn.disabled = !(isPhoneValid && isNameValid && isTimeSelected && isLoggedIn);
    };

    phoneInput.addEventListener('input', () => {
        const isValid = validatePhone(phoneInput.value);
        if (isValid) {
            phoneInput.classList.remove('is-invalid');
            phoneInput.classList.add('is-valid');
        } else {
            phoneInput.classList.remove('is-valid');
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

    const renderUpcomingAppointments = () => {
        const listEl = document.getElementById('upcoming-list');
        if (!listEl) return;

        listEl.innerHTML = '';
        const all = getAppointments();
        const now = new Date();
        const user = getCurrentUser();

        const own = user ? all.filter(a => a.userEmail === user.email) : [];
        const upcoming = own
            .filter(a => new Date(`${a.date}T${a.time}`) >= now)
            .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`))
            .slice(0, 5);

        if (upcoming.length === 0) {
            const li = document.createElement('li');
            li.className = 'list-group-item small text-muted';
            li.textContent = user ? 'У вас поки немає запланованих сесій.' : 'Увійдіть, щоб бачити ваші записи.';
            listEl.appendChild(li);
            return;
        }

        upcoming.forEach(app => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `<span>${app.date} • ${app.time}</span><span class="badge text-bg-primary">${app.name}</span>`;
            listEl.appendChild(li);
        });
    };

    const onDateSelected = (dateStr) => {
        currentSelectedDate = dateStr;
        selectedTime = null;

        selectedDateDisplay.textContent = dateStr;
        submitBtn.disabled = true;

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
                    phoneInput.dispatchEvent(new Event('input'));
                });
            }
            slotsContainer.appendChild(btn);
        });
    };

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = getCurrentUser();
        if (!currentSelectedDate || !selectedTime || !user) return;

        const finalPhone = normalizePhone(phoneInput.value);
        if (!validatePhone(finalPhone)) {
            alert('Будь ласка, введіть коректний номер телефону.');
            return;
        }

        const appointment = {
            id: crypto.randomUUID(),
            userEmail: user.email,
            name: nameInput.value,
            phone: finalPhone,
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
        phoneInput.classList.remove('is-valid', 'is-invalid');
        nameInput.classList.remove('is-valid', 'is-invalid');

        selectedTime = null;
        onDateSelected(currentSelectedDate);
        validateState();
        renderUpcomingAppointments();
    });

    return {
        onDateSelected,
        revalidateBooking: validateState,
        handleUserChange: () => {
            validateState();
            renderUpcomingAppointments();
        },
        renderUpcomingAppointments
    };
}

