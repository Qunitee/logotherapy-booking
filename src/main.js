import './style.css';
import { Calendar } from './modules/calendar.js';
import { loadDailyQuote } from './modules/quote.js';
import { setupArticlesInfiniteScroll } from './modules/articles.js';
import { initBooking } from './modules/booking.js';
import { setupAuthHandlers } from './modules/auth.js';
import { initSession, updateAuthUI } from './modules/session.js';

document.addEventListener('DOMContentLoaded', async () => {
    initSession();
    updateAuthUI();

    await loadDailyQuote();

    const booking = initBooking();

    const calendar = new Calendar(booking.onDateSelected);
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

    setupAuthHandlers({
        onAuthChange: booking.handleUserChange,
        onRevalidateBooking: booking.revalidateBooking
    });

    setupArticlesInfiniteScroll();
    booking.renderUpcomingAppointments();
});