/* ========================================
   ALAN VAULT - DATE UTILITIES
   Date & Time Helper Functions
   ======================================== */

class DateUtils {
    // Get current date
    static now() {
        return new Date();
    }
    
    // Format date
    static format(date, format = 'YYYY-MM-DD') {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        
        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    }
    
    // Parse date string
    static parse(dateString, format = 'YYYY-MM-DD') {
        let year, month, day, hours, minutes, seconds;
        
        if (format === 'YYYY-MM-DD') {
            const parts = dateString.split('-');
            year = parseInt(parts[0]);
            month = parseInt(parts[1]) - 1;
            day = parseInt(parts[2]);
            return new Date(year, month, day);
        }
        
        if (format === 'DD/MM/YYYY') {
            const parts = dateString.split('/');
            day = parseInt(parts[0]);
            month = parseInt(parts[1]) - 1;
            year = parseInt(parts[2]);
            return new Date(year, month, day);
        }
        
        return new Date(dateString);
    }
    
    // Add days to date
    static addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }
    
    // Add months to date
    static addMonths(date, months) {
        const result = new Date(date);
        result.setMonth(result.getMonth() + months);
        return result;
    }
    
    // Add years to date
    static addYears(date, years) {
        const result = new Date(date);
        result.setFullYear(result.getFullYear() + years);
        return result;
    }
    
    // Add hours to date
    static addHours(date, hours) {
        const result = new Date(date);
        result.setHours(result.getHours() + hours);
        return result;
    }
    
    // Add minutes to date
    static addMinutes(date, minutes) {
        const result = new Date(date);
        result.setMinutes(result.getMinutes() + minutes);
        return result;
    }
    
    // Get difference in days
    static diffDays(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const diffTime = Math.abs(d2 - d1);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    // Get difference in hours
    static diffHours(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const diffTime = Math.abs(d2 - d1);
        return Math.ceil(diffTime / (1000 * 60 * 60));
    }
    
    // Get difference in minutes
    static diffMinutes(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const diffTime = Math.abs(d2 - d1);
        return Math.ceil(diffTime / (1000 * 60));
    }
    
    // Get difference in seconds
    static diffSeconds(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const diffTime = Math.abs(d2 - d1);
        return Math.ceil(diffTime / 1000);
    }
    
    // Check if date is today
    static isToday(date) {
        const today = new Date();
        const d = new Date(date);
        return d.toDateString() === today.toDateString();
    }
    
    // Check if date is yesterday
    static isYesterday(date) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const d = new Date(date);
        return d.toDateString() === yesterday.toDateString();
    }
    
    // Check if date is tomorrow
    static isTomorrow(date) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const d = new Date(date);
        return d.toDateString() === tomorrow.toDateString();
    }
    
    // Check if date is this week
    static isThisWeek(date) {
        const now = new Date();
        const d = new Date(date);
        const startOfWeek = this.startOfWeek(now);
        const endOfWeek = this.endOfWeek(now);
        return d >= startOfWeek && d <= endOfWeek;
    }
    
    // Check if date is this month
    static isThisMonth(date) {
        const now = new Date();
        const d = new Date(date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    
    // Check if date is this year
    static isThisYear(date) {
        const now = new Date();
        const d = new Date(date);
        return d.getFullYear() === now.getFullYear();
    }
    
    // Get start of day
    static startOfDay(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
    }
    
    // Get end of day
    static endOfDay(date) {
        const d = new Date(date);
        d.setHours(23, 59, 59, 999);
        return d;
    }
    
    // Get start of week (Monday)
    static startOfWeek(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = (day === 0 ? 6 : day - 1);
        d.setDate(d.getDate() - diff);
        d.setHours(0, 0, 0, 0);
        return d;
    }
    
    // Get end of week (Sunday)
    static endOfWeek(date) {
        const d = this.startOfWeek(date);
        d.setDate(d.getDate() + 6);
        d.setHours(23, 59, 59, 999);
        return d;
    }
    
    // Get start of month
    static startOfMonth(date) {
        const d = new Date(date);
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        return d;
    }
    
    // Get end of month
    static endOfMonth(date) {
        const d = new Date(date);
        d.setMonth(d.getMonth() + 1);
        d.setDate(0);
        d.setHours(23, 59, 59, 999);
        return d;
    }
    
    // Get start of year
    static startOfYear(date) {
        const d = new Date(date);
        d.setMonth(0, 1);
        d.setHours(0, 0, 0, 0);
        return d;
    }
    
    // Get end of year
    static endOfYear(date) {
        const d = new Date(date);
        d.setMonth(11, 31);
        d.setHours(23, 59, 59, 999);
        return d;
    }
    
    // Get days in month
    static daysInMonth(date) {
        const d = new Date(date);
        return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    }
    
    // Get month name
    static getMonthName(date, short = false) {
        const d = new Date(date);
        const months = short 
            ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return months[d.getMonth()];
    }
    
    // Get day name
    static getDayName(date, short = false) {
        const d = new Date(date);
        const days = short
            ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
            : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[d.getDay()];
    }
    
    // Get week number
    static getWeekNumber(date) {
        const d = new Date(date);
        const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
        const pastDaysOfYear = (d - firstDayOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    }
    
    // Get quarter
    static getQuarter(date) {
        const d = new Date(date);
        return Math.floor(d.getMonth() / 3) + 1;
    }
    
    // Get age from birthdate
    static getAge(birthdate) {
        const today = new Date();
        const birth = new Date(birthdate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    }
    
    // Get time ago string
    static timeAgo(date) {
        const d = new Date(date);
        const now = new Date();
        const diffSeconds = Math.floor((now - d) / 1000);
        
        if (diffSeconds < 60) return 'Just now';
        if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} minutes ago`;
        if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} hours ago`;
        if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)} days ago`;
        if (diffSeconds < 2592000) return `${Math.floor(diffSeconds / 604800)} weeks ago`;
        if (diffSeconds < 31536000) return `${Math.floor(diffSeconds / 2592000)} months ago`;
        return `${Math.floor(diffSeconds / 31536000)} years ago`;
    }
    
    // Get remaining time string
    static timeRemaining(targetDate) {
        const target = new Date(targetDate);
        const now = new Date();
        const diffSeconds = Math.floor((target - now) / 1000);
        
        if (diffSeconds < 0) return 'Expired';
        
        const days = Math.floor(diffSeconds / 86400);
        const hours = Math.floor((diffSeconds % 86400) / 3600);
        const minutes = Math.floor((diffSeconds % 3600) / 60);
        const seconds = diffSeconds % 60;
        
        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m ${seconds}s`;
        return `${seconds}s`;
    }
    
    // Generate date range for calendar
    static getMonthCalendar(year, month) {
        const firstDay = new Date(year, month, 1);
        const startDay = firstDay.getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();
        
        const calendar = [];
        
        // Previous month days
        for (let i = startDay - 1; i >= 0; i--) {
            calendar.push({
                date: new Date(year, month - 1, daysInPrevMonth - i),
                isCurrentMonth: false
            });
        }
        
        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            calendar.push({
                date: new Date(year, month, i),
                isCurrentMonth: true
            });
        }
        
        // Next month days (to fill 6 rows = 42 days)
        const remainingDays = 42 - calendar.length;
        for (let i = 1; i <= remainingDays; i++) {
            calendar.push({
                date: new Date(year, month + 1, i),
                isCurrentMonth: false
            });
        }
        
        return calendar;
    }
}

window.DateUtils = DateUtils;