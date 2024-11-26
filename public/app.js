// Глобальные переменные
const API_URL = window.location.origin + '/api';
let token = localStorage.getItem('token');

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
});
