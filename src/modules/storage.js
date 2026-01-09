const STORAGE_KEY = 'logotherapy_appointments';

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