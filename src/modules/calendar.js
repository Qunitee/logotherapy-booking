const MONTH_NAMES = [
    "Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
    "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"
];

export class Calendar {
    constructor(renderCallback) {
        this.currentDate = new Date();
        this.selectedDate = null;
        this.renderCallback = renderCallback;
    }

    get currentMonthName() {
        return `${MONTH_NAMES[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    }

    prevMonth() {
        const today = new Date();
        if (this.currentDate.getMonth() === today.getMonth() &&
            this.currentDate.getFullYear() === today.getFullYear()) {
            return;
        }
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    }

    render(containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        let firstDayIndex = new Date(year, month, 1).getDay();
        firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();

        for (let i = 0; i < firstDayIndex; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.classList.add('day', 'empty');
            container.appendChild(emptyCell);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dayEl = document.createElement('div');
            dayEl.classList.add('day');
            dayEl.textContent = day;

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            dayEl.dataset.date = dateStr;

            if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                dayEl.classList.add('today');
            }

            const cellDate = new Date(year, month, day);
            if (cellDate < new Date().setHours(0,0,0,0)) {
                dayEl.classList.add('disabled');
            } else {
                dayEl.addEventListener('click', () => {
                    document.querySelectorAll('.day').forEach(d => d.classList.remove('selected'));
                    dayEl.classList.add('selected');

                    this.selectedDate = dateStr;
                    this.renderCallback(dateStr);
                });
            }

            container.appendChild(dayEl);
        }
    }
}