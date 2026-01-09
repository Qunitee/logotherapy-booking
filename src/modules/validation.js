export function validatePhone(phone) {
    if (!phone || typeof phone !== 'string') return false;
    
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    
    if (/^\+380\d{9}$/.test(cleaned)) return true;
    if (/^0\d{9}$/.test(cleaned)) return true;
    if (/^380\d{9}$/.test(cleaned)) return true;
    
    return false;
}

export function validateEmail(email) {
    if (!email || typeof email !== 'string') return false;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) return false;
    
    const parts = email.split('@');
    if (parts.length !== 2) return false;
    
    const [localPart, domain] = parts;
    
    if (localPart.length === 0 || localPart.startsWith('.') || localPart.endsWith('.')) return false;
    
    if (domain.length === 0 || domain.startsWith('.') || domain.endsWith('.') || 
        domain.startsWith('-') || domain.endsWith('-')) return false;
    
    const domainParts = domain.split('.');
    if (domainParts.length < 2 || domainParts[domainParts.length - 1].length < 2) return false;
    
    if (email.length > 254) return false;
    
    if (localPart.length > 64) return false;
    
    return true;
}

export function normalizePhone(phone) {
    if (!phone) return '';
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    
    if (cleaned.startsWith('+380')) return cleaned;
    if (cleaned.startsWith('380')) return '+' + cleaned;
    if (cleaned.startsWith('0')) return '+380' + cleaned.substring(1);
    
    return phone;
}

export function setupFormValidation(formId, phoneInputId, submitBtnId) {
    const form = document.getElementById(formId);
    const phoneInput = document.getElementById(phoneInputId);
    const submitBtn = document.getElementById(submitBtnId);

    phoneInput.addEventListener('input', () => {
        const isValid = validatePhone(phoneInput.value);
        if (isValid) {
            phoneInput.classList.remove('is-invalid');
            phoneInput.classList.add('is-valid');
        } else {
            phoneInput.classList.remove('is-valid');
            phoneInput.classList.add('is-invalid');
        }
        checkFormValidity();
    });

    phoneInput.addEventListener('blur', () => {
        if (validatePhone(phoneInput.value)) {
            phoneInput.value = normalizePhone(phoneInput.value);
        }
    });

    function checkFormValidity() {
        const isPhoneValid = validatePhone(phoneInput.value);
        const isNameValid = document.getElementById('name').value.length >= 2;
        return isPhoneValid && isNameValid;
    }

    return { checkFormValidity };
}