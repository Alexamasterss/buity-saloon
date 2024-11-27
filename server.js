require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database connection pool
const pool = mysql.createPool({
    host: 'junction.proxy.rlwy.net',
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    port: 54942,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: {
        rejectUnauthorized: false
    }
}).promise();

// Test database connection and create tables
async function initializeDatabase() {
    try {
        console.log('Connecting to database...');
        
        // Create users table
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        
        await pool.query(createUsersTable);
        console.log('Users table created successfully');

        // Create specialists table
        const createSpecialistsTable = `
            CREATE TABLE IF NOT EXISTS specialists (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                specialization VARCHAR(255) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        
        await pool.query(createSpecialistsTable);
        console.log('Specialists table created successfully');

        // Insert default specialists if they don't exist
        const [existingSpecialists] = await pool.query('SELECT * FROM specialists');
        if (existingSpecialists.length === 0) {
            const specialists = [
                ['Анна Петрова', 'Парикмахер-стилист', ''],
                ['Мария Иванова', 'Мастер маникюра', ''],
                ['Елена Сидорова', 'Косметолог', '']
            ];
            
            for (const specialist of specialists) {
                await pool.query(
                    'INSERT INTO specialists (name, specialization, description) VALUES (?, ?, ?)',
                    specialist
                );
            }
            console.log('Default specialists added successfully');
        }

        // Create services table
        const createServicesTable = `
            CREATE TABLE IF NOT EXISTS services (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                duration INT NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        
        await pool.query(createServicesTable);
        console.log('Services table created successfully');

        // Insert default services if they don't exist
        const [existingServices] = await pool.query('SELECT * FROM services');
        if (existingServices.length === 0) {
            const services = [
                ['Женская стрижка', 'Стрижка любой сложности с мытьем головы', 60, 2500],
                ['Мужская стрижка', 'Классическая мужская стрижка', 45, 1500],
                ['Окрашивание волос', 'Окрашивание волос любой сложности', 120, 5000],
                ['Маникюр классический', 'Классический маникюр с покрытием', 60, 2000],
                ['Педикюр', 'Классический педикюр с покрытием', 90, 2500],
                ['Чистка лица', 'Глубокая чистка лица', 90, 3500],
                ['Массаж лица', 'Классический массаж лица', 30, 1500],
                ['Укладка волос', 'Укладка волос любой сложности', 45, 2000]
            ];
            
            for (const service of services) {
                await pool.query(
                    'INSERT INTO services (name, description, duration, price) VALUES (?, ?, ?, ?)',
                    service
                );
            }
            console.log('Default services added successfully');
        }

        // Пересоздаем таблицу записей
        await recreateAppointmentsTable();
        
    } catch (err) {
        console.error('Error initializing database:', err);
        throw err;
    }
}

// Пересоздание таблицы appointments
async function recreateAppointmentsTable() {
    try {
        // Удаляем существующую таблицу
        await pool.query('DROP TABLE IF EXISTS appointments');
        
        // Создаем таблицу заново
        const createAppointmentsTable = `
            CREATE TABLE appointments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                specialist_id INT,
                service_id INT,
                appointment_date DATETIME,
                status VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (specialist_id) REFERENCES specialists(id),
                FOREIGN KEY (service_id) REFERENCES services(id)
            )
        `;
        
        await pool.query(createAppointmentsTable);
        console.log('Appointments table recreated successfully');
    } catch (err) {
        console.error('Error recreating appointments table:', err);
        throw err;
    }
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Routes
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );
        
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (rows.length === 0) {
            return res.status(400).json({ error: 'User not found' });
        }

        const user = rows[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid password' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({ token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, username, email, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Could not fetch profile' });
    }
});

// Get all specialists
app.get('/api/specialists', async (req, res) => {
    try {
        const [specialists] = await pool.query('SELECT * FROM specialists');
        res.json(specialists);
    } catch (error) {
        console.error('Error fetching specialists:', error);
        res.status(500).json({ error: 'Failed to fetch specialists' });
    }
});

// Get all services
app.get('/api/services', async (req, res) => {
    try {
        const [services] = await pool.query('SELECT * FROM services');
        res.json(services);
    } catch (error) {
        console.error('Error fetching services:', error);
        res.status(500).json({ error: 'Failed to fetch services' });
    }
});

// Get specialist's available time slots
app.get('/api/specialists/:id/availability', authenticateToken, async (req, res) => {
    try {
        const { date } = req.query;
        const specialistId = req.params.id;

        if (!date) {
            return res.status(400).json({ error: 'Date parameter is required' });
        }

        // Получаем все записи специалиста на выбранную дату
        const [appointments] = await pool.query(
            'SELECT appointment_date FROM appointments WHERE specialist_id = ? AND DATE(appointment_date) = DATE(?)',
            [specialistId, date]
        );

        // Генерируем доступные временные слоты (с 9:00 до 20:00)
        const timeSlots = [];
        const startHour = 9;
        const endHour = 20;
        const interval = 60; // интервал в минутах

        for (let hour = startHour; hour < endHour; hour++) {
            const timeSlot = new Date(date);
            timeSlot.setHours(hour, 0, 0, 0);
            
            // Проверяем, не занят ли слот
            const isBooked = appointments.some(app => {
                const appDate = new Date(app.appointment_date);
                return appDate.getHours() === hour;
            });

            if (!isBooked) {
                timeSlots.push(timeSlot);
            }
        }

        res.json(timeSlots);
    } catch (error) {
        console.error('Error fetching availability:', error);
        res.status(500).json({ error: 'Failed to fetch availability' });
    }
});

// Appointments routes
app.post('/api/appointments', authenticateToken, async (req, res) => {
    try {
        console.log('Creating appointment with data:', req.body);
        const { service_id, appointment_date, specialist_id } = req.body;
        
        if (!service_id || !appointment_date || !specialist_id) {
            return res.status(400).json({ 
                error: 'Все поля обязательны для заполнения',
                required_fields: {
                    service_id: 'ID услуги',
                    appointment_date: 'Дата и время записи (формат: YYYY-MM-DD HH:mm:ss)',
                    specialist_id: 'ID специалиста'
                }
            });
        }

        // Проверяем существование услуги
        const [services] = await pool.query('SELECT * FROM services WHERE id = ?', [service_id]);
        if (services.length === 0) {
            return res.status(404).json({ error: 'Услуга не найдена' });
        }

        // Проверяем существование специалиста
        const [specialists] = await pool.query('SELECT * FROM specialists WHERE id = ?', [specialist_id]);
        if (specialists.length === 0) {
            return res.status(404).json({ error: 'Специалист не найден' });
        }

        // Проверяем, не занято ли это время у специалиста
        const appointmentTime = new Date(appointment_date);
        const [existingAppointments] = await pool.query(
            'SELECT * FROM appointments WHERE specialist_id = ? AND DATE(appointment_date) = DATE(?) AND HOUR(appointment_date) = HOUR(?)',
            [specialist_id, appointmentTime, appointmentTime]
        );

        if (existingAppointments.length > 0) {
            return res.status(400).json({ error: 'Это время уже занято у специалиста' });
        }

        const [result] = await pool.query(
            'INSERT INTO appointments (user_id, specialist_id, service_id, appointment_date, status) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, specialist_id, service_id, appointment_date, 'pending']
        );
        
        console.log('Appointment created successfully:', result);
        res.status(201).json({ 
            message: 'Запись успешно создана',
            appointment_id: result.insertId
        });
    } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(500).json({ error: 'Не удалось создать запись' });
    }
});

app.get('/api/appointments', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT 
                a.*, 
                s.name as specialist_name, 
                s.specialization,
                srv.name as service_name,
                srv.duration,
                srv.price
            FROM appointments a 
            JOIN specialists s ON a.specialist_id = s.id 
            JOIN services srv ON a.service_id = srv.id
            WHERE a.user_id = ? 
            ORDER BY a.appointment_date DESC`,
            [req.user.id]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ error: 'Failed to fetch appointments' });
    }
});

// Start server
async function startServer() {
    try {
        await initializeDatabase();
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

startServer();
