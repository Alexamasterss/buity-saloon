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
                username VARCHAR(255) NOT NULL UNIQUE,
                email VARCHAR(255) NOT NULL UNIQUE,
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
                experience_years INT,
                rating DECIMAL(3,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        
        await pool.query(createSpecialistsTable);
        console.log('Specialists table created successfully');

        // Insert default specialists if they don't exist
        const [existingSpecialists] = await pool.query('SELECT * FROM specialists');
        if (existingSpecialists.length === 0) {
            const specialists = [
                ['Анна Петрова', 'Парикмахер-стилист', 5, 4.8],
                ['Мария Иванова', 'Мастер маникюра', 3, 4.9],
                ['Елена Сидорова', 'Косметолог', 7, 4.7]
            ];
            
            for (const specialist of specialists) {
                await pool.query(
                    'INSERT INTO specialists (name, specialization, experience_years, rating) VALUES (?, ?, ?, ?)',
                    specialist
                );
            }
            console.log('Default specialists added successfully');
        }

        // Create appointments table with specialist_id
        const createAppointmentsTable = `
            CREATE TABLE IF NOT EXISTS appointments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                specialist_id INT,
                service_type VARCHAR(255),
                appointment_date DATETIME,
                status VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (specialist_id) REFERENCES specialists(id)
            )
        `;

        await pool.query(createAppointmentsTable);
        console.log('Appointments table created successfully');
    } catch (err) {
        console.error('Error initializing database:', err);
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

// Appointments routes
app.post('/api/appointments', authenticateToken, async (req, res) => {
    try {
        console.log('Creating appointment with data:', req.body);
        const { service_type, appointment_date, specialist_id } = req.body;
        
        if (!service_type || !appointment_date || !specialist_id) {
            return res.status(400).json({ error: 'Service type, appointment date and specialist are required' });
        }

        // Проверяем существование специалиста
        const [specialists] = await pool.query('SELECT id FROM specialists WHERE id = ?', [specialist_id]);
        if (specialists.length === 0) {
            return res.status(404).json({ error: 'Specialist not found' });
        }

        const [result] = await pool.query(
            'INSERT INTO appointments (user_id, specialist_id, service_type, appointment_date, status) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, specialist_id, service_type, appointment_date, 'pending']
        );
        
        console.log('Appointment created successfully:', result);
        res.status(201).json({ 
            message: 'Appointment created successfully',
            appointment_id: result.insertId
        });
    } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(500).json({ error: 'Failed to create appointment' });
    }
});

app.get('/api/appointments', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT 
                a.*, 
                s.name as specialist_name, 
                s.specialization 
            FROM appointments a 
            JOIN specialists s ON a.specialist_id = s.id 
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
