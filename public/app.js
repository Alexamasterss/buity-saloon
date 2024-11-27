// Глобальные переменные
const API_URL = window.location.origin + '/api';
let token = localStorage.getItem('token');
let services = [];
let specialists = [];
let availableTimeSlots = [];
let flatpickrInstance = null;

// Функции для работы с интерфейсом
function showLoginForm() {
    document.getElementById('loginForm').classList.remove('d-none');
    document.getElementById('registerForm').classList.add('d-none');
    document.getElementById('profileSection').classList.add('d-none');
}

function showRegisterForm() {
    document.getElementById('loginForm').classList.add('d-none');
    document.getElementById('registerForm').classList.remove('d-none');
    document.getElementById('profileSection').classList.add('d-none');
}

function showProfile() {
    document.getElementById('loginForm').classList.add('d-none');
    document.getElementById('registerForm').classList.add('d-none');
    document.getElementById('profileSection').classList.remove('d-none');
    loadProfile();
}

function updateNavigation(isLoggedIn) {
    const loginNav = document.getElementById('loginNav');
    const registerNav = document.getElementById('registerNav');
    const profileNav = document.getElementById('profileNav');
    const logoutNav = document.getElementById('logoutNav');

    if (isLoggedIn) {
        loginNav.classList.add('d-none');
        registerNav.classList.add('d-none');
        profileNav.classList.remove('d-none');
        logoutNav.classList.remove('d-none');
        showProfile();
    } else {
        loginNav.classList.remove('d-none');
        registerNav.classList.remove('d-none');
        profileNav.classList.add('d-none');
        logoutNav.classList.add('d-none');
        showLoginForm();
    }
}

// Функции для работы с API
async function login(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        if (response.ok) {
            token = data.token;
            localStorage.setItem('token', token);
            updateNavigation(true);
        } else {
            alert(data.error || 'Ошибка входа');
        }
    } catch (error) {
        alert('Ошибка сервера');
    }
}

async function register(event) {
    event.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password }),
        });

        const data = await response.json();
        if (response.ok) {
            alert('Регистрация успешна! Теперь вы можете войти.');
            showLoginForm();
        } else {
            alert(data.error || 'Ошибка регистрации');
        }
    } catch (error) {
        alert('Ошибка сервера');
    }
}

async function loadProfile() {
    try {
        const response = await fetch(`${API_URL}/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (response.ok) {
            const profileInfo = document.getElementById('profileInfo');
            profileInfo.innerHTML = `
                <p><strong>Имя пользователя:</strong> ${data.username}</p>
                <p><strong>Email:</strong> ${data.email}</p>
                <p><strong>Дата регистрации:</strong> ${new Date(data.created_at).toLocaleDateString()}</p>
            `;
        } else {
            logout();
        }
    } catch (error) {
        logout();
    }
}

async function bookAppointment(event) {
    event.preventDefault();
    const serviceType = document.getElementById('serviceType').value;
    const appointmentDate = document.getElementById('appointmentDate').value;

    try {
        const response = await fetch(`${API_URL}/appointments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ serviceType, appointmentDate }),
        });

        const data = await response.json();
        if (response.ok) {
            alert('Запись успешно создана!');
            document.getElementById('appointmentDate').value = '';
        } else {
            alert(data.error || 'Ошибка при создании записи');
        }
    } catch (error) {
        alert('Ошибка сервера');
    }
}

function logout() {
    localStorage.removeItem('token');
    token = null;
    updateNavigation(false);
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    updateNavigation(!!token);
    checkAuth();
    initializeFlatpickr();
});

// Инициализация выбора даты и времени
function initializeFlatpickr() {
    const dateTimeInput = document.getElementById('appointmentDateTime');
    if (!dateTimeInput) return;

    flatpickrInstance = flatpickr(dateTimeInput, {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        minDate: "today",
        locale: "ru",
        disable: [
            function(date) {
                // Отключаем выходные
                return (date.getDay() === 0 || date.getDay() === 6);
            }
        ],
        // Рабочие часы с 9:00 до 20:00
        minTime: "09:00",
        maxTime: "20:00",
        // Интервал 1 час
        minuteIncrement: 60,
        time_24hr: true,
        // Делаем поле только для чтения
        clickOpens: true,
        disableMobile: false,
        onChange: function(selectedDates, dateStr, instance) {
            if (selectedDates.length > 0) {
                checkTimeSlotAvailability(selectedDates[0]);
            }
        }
    });
}

// Проверка авторизации
async function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const response = await fetch('/api/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const user = await response.json();
                showMainContent(user);
                loadServices();
                loadAppointments();
            } else {
                showAuthForms();
            }
        } catch (error) {
            console.error('Auth check error:', error);
            showAuthForms();
        }
    } else {
        showAuthForms();
    }
}

// Показать формы авторизации
function showAuthForms() {
    document.getElementById('authForms').classList.remove('d-none');
    document.getElementById('mainContent').classList.add('d-none');
    document.getElementById('authButtons').classList.remove('d-none');
    document.getElementById('userInfo').classList.add('d-none');
}

// Показать основной контент
function showMainContent(user) {
    document.getElementById('authForms').classList.add('d-none');
    document.getElementById('mainContent').classList.remove('d-none');
    document.getElementById('authButtons').classList.add('d-none');
    document.getElementById('userInfo').classList.remove('d-none');
    document.getElementById('userEmail').textContent = user.email;
}

// Загрузка услуг
async function loadServices() {
    try {
        const response = await fetch('/api/services');
        services = await response.json();
        const select = document.getElementById('serviceSelect');
        select.innerHTML = '<option value="">Выберите услугу</option>';
        services.forEach(service => {
            select.innerHTML += `
                <option value="${service.id}">
                    ${service.name} - ${service.duration} мин. (${service.price}₽)
                </option>
            `;
        });
    } catch (error) {
        console.error('Error loading services:', error);
        showToast('Ошибка загрузки услуг', 'danger');
    }
}

// Обновление списка специалистов при выборе услуги
async function updateSpecialists() {
    const serviceId = document.getElementById('serviceSelect').value;
    if (!serviceId) return;

    try {
        const response = await fetch('/api/specialists');
        specialists = await response.json();
        const select = document.getElementById('specialistSelect');
        select.innerHTML = '<option value="">Выберите специалиста</option>';
        specialists.forEach(specialist => {
            select.innerHTML += `
                <option value="${specialist.id}">
                    ${specialist.name} - ${specialist.specialization} 
                    (Опыт: ${specialist.experience_years} лет, Рейтинг: ${specialist.rating})
                </option>
            `;
        });
    } catch (error) {
        console.error('Error loading specialists:', error);
        showToast('Ошибка загрузки специалистов', 'danger');
    }
}

// Обновление доступного времени при выборе специалиста
async function updateAvailableTime() {
    const specialistId = document.getElementById('specialistSelect').value;
    if (!specialistId) return;

    const today = new Date();
    flatpickrInstance.set('enable', []);
    
    try {
        const response = await fetch(`/api/specialists/${specialistId}/availability?date=${today.toISOString().split('T')[0]}`);
        availableTimeSlots = await response.json();
        
        // Обновляем доступные слоты в календаре
        flatpickrInstance.set('enable', availableTimeSlots.map(slot => new Date(slot)));
    } catch (error) {
        console.error('Error loading time slots:', error);
        showToast('Ошибка загрузки доступного времени', 'danger');
    }
}

// Создание записи
async function createAppointment(event) {
    event.preventDefault();
    
    const serviceId = document.getElementById('serviceSelect').value;
    const specialistId = document.getElementById('specialistSelect').value;
    const appointmentDateTime = document.getElementById('appointmentDateTime').value;

    if (!serviceId || !specialistId || !appointmentDateTime) {
        showToast('Пожалуйста, заполните все поля', 'danger');
        return;
    }

    try {
        const response = await fetch('/api/appointments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                service_id: serviceId,
                specialist_id: specialistId,
                appointment_date: appointmentDateTime
            })
        });

        if (response.ok) {
            showToast('Запись успешно создана!', 'success');
            loadAppointments();
            event.target.reset();
        } else {
            const error = await response.json();
            showToast(error.error, 'danger');
        }
    } catch (error) {
        console.error('Error creating appointment:', error);
        showToast('Ошибка при создании записи', 'danger');
    }
}

// Загрузка списка записей
async function loadAppointments() {
    try {
        const response = await fetch('/api/appointments', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const appointments = await response.json();
        const tbody = document.getElementById('appointmentsList');
        tbody.innerHTML = '';
        
        appointments.forEach(appointment => {
            tbody.innerHTML += `
                <tr>
                    <td>${appointment.service_name}</td>
                    <td>
                        ${appointment.specialist_name}<br>
                        <small class="text-muted">${appointment.specialization}</small>
                    </td>
                    <td>${new Date(appointment.appointment_date).toLocaleString('ru-RU')}</td>
                    <td><span class="status-${appointment.status}">${getStatusText(appointment.status)}</span></td>
                    <td class="price">${appointment.price}₽</td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error loading appointments:', error);
        showToast('Ошибка загрузки записей', 'danger');
    }
}

// Вспомогательные функции
function getStatusText(status) {
    const statuses = {
        'pending': 'Ожидает подтверждения',
        'confirmed': 'Подтверждено',
        'cancelled': 'Отменено'
    };
    return statuses[status] || status;
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toast.classList.remove('bg-success', 'bg-danger');
    toast.classList.add(`bg-${type}`);
    toastMessage.textContent = message;
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

// Функции авторизации
async function login(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('token', data.token);
            checkAuth();
            showToast('Вход выполнен успешно!');
        } else {
            const error = await response.json();
            showToast(error.error, 'danger');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Ошибка при входе', 'danger');
    }
}

async function register(event) {
    event.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });

        if (response.ok) {
            showToast('Регистрация успешна! Теперь вы можете войти.');
            showLoginForm();
        } else {
            const error = await response.json();
            showToast(error.error, 'danger');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showToast('Ошибка при регистрации', 'danger');
    }
}

function logout() {
    localStorage.removeItem('token');
    showAuthForms();
    showToast('Вы успешно вышли из системы');
}

function showLoginForm() {
    document.getElementById('loginForm').classList.remove('d-none');
    document.getElementById('registerForm').classList.add('d-none');
}

function showRegisterForm() {
    document.getElementById('loginForm').classList.add('d-none');
    document.getElementById('registerForm').classList.remove('d-none');
}
