const STORAGE_KEY = 'logotherapy_appointments';
const USERS_KEY = 'logotherapy_users_db';
const SESSION_KEY = 'logotherapy_current_session';

export function getAppointments() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

export function saveAppointment(appointment) {
    const appointments = getAppointments();
    appointments.push(appointment);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
}

export function isSlotTaken(dateStr, timeStr) {
    const appointments = getAppointments();
    return appointments.some(app => app.date === dateStr && app.time === timeStr);
}


export function getAllUsers() {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
}

export function saveNewUser(user) {
    const users = getAllUsers();
    if (users.find(u => u.email === user.email.toLowerCase())) {
        return false;
    }
    users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return true;
}

export function getSessionUser() {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
}

export function setSessionUser(user) {
    if (!user) {
        localStorage.removeItem(SESSION_KEY);
    } else {
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    }
}