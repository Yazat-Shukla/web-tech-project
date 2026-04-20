const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express(); 
app.use(cors());
app.use(bodyParser.json());

// DATABASE CONNECTION
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    port: 3307,          
    password: '',        
    database: 'student_erp'
});

db.connect(err => {
    if (err) console.error('DB Error: ' + err);
    else console.log('MySQL Database Connected Successfully!');
});

// --- API ROUTES ---

// 1. Login Route
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const sql = "SELECT * FROM users WHERE email = ? AND password = ?";
    db.query(sql, [email, password], (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.length > 0) res.json(result[0]);
        else res.status(401).json({ message: 'Invalid credentials' });
    });
});

// 2. Get Student Profile
app.get('/student/:userId', (req, res) => {
    const sql = "SELECT * FROM students WHERE user_id = ?";
    db.query(sql, [req.params.userId], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result[0]);
    });
});

// 3. Get ALL Students
app.get('/students', (req, res) => {
    const sql = "SELECT * FROM students";
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result);
    });
});

// 4. Mark Attendance
app.post('/attendance', (req, res) => {
    const { student_id, status } = req.body;
    const date = new Date().toISOString().split('T')[0];
    
    const checkSql = "SELECT * FROM attendance WHERE student_id = ? AND date = ?";
    db.query(checkSql, [student_id, date], (err, result) => {
        if (result.length > 0) {
            const updateSql = "UPDATE attendance SET status = ? WHERE id = ?";
            db.query(updateSql, [status, result[0].id], (err, data) => res.json({ message: 'Attendance Updated' }));
        } else {
            const insertSql = "INSERT INTO attendance (student_id, date, status) VALUES (?, ?, ?)";
            db.query(insertSql, [student_id, date, status], (err, data) => res.json({ message: 'Attendance Marked' }));
        }
    });
});

// 5. Get My Attendance
app.get('/attendance/:studentId', (req, res) => {
    const sql = "SELECT * FROM attendance WHERE student_id = ?";
    db.query(sql, [req.params.studentId], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result);
    });
});

// 6. Register New Student
app.post('/register', (req, res) => {
    const { name, email, password, roll_number } = req.body;
    const sqlUser = "INSERT INTO users (email, password, role) VALUES (?, ?, 'student')";
    db.query(sqlUser, [email, password], (err, result) => {
        if (err) return res.status(500).json(err);
        const newUserId = result.insertId;
        const sqlStudent = "INSERT INTO students (user_id, name, roll_number) VALUES (?, ?, ?)";
        db.query(sqlStudent, [newUserId, name, roll_number], (err, result) => {
            if (err) return res.status(500).json(err);
            res.json({ message: 'Student Registered Successfully!' });
        });
    });
});

// 7. Add/Update Fees (Using Roll Number)
app.post('/fees', (req, res) => {
    const { roll_number, total, paid, scholarship } = req.body;
    const pending = total - paid - scholarship;

    const findStudentSql = "SELECT student_id FROM students WHERE roll_number = ?";
    db.query(findStudentSql, [roll_number], (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.length === 0) return res.status(404).json({ message: "Roll Number not found!" });

        const student_id = result[0].student_id;

        db.query('SELECT * FROM fees WHERE student_id = ?', [student_id], (err, feeResult) => {
            if (feeResult.length > 0) {
                const sql = 'UPDATE fees SET total_fees=?, paid_amount=?, pending_amount=?, scholarship=? WHERE student_id=?';
                db.query(sql, [total, paid, pending, scholarship, student_id], (err, data) => res.json({message: "Fees Updated Successfully!"}));
            } else {
                const sql = 'INSERT INTO fees (student_id, total_fees, paid_amount, pending_amount, scholarship) VALUES (?, ?, ?, ?, ?)';
                db.query(sql, [student_id, total, paid, pending, scholarship], (err, data) => res.json({message: "Fees Added Successfully!"}));
            }
        });
    });
});

// 8. Get Fees
app.get('/fees/:studentId', (req, res) => {
    db.query('SELECT * FROM fees WHERE student_id = ?', [req.params.studentId], (err, result) => {
        if(err) return res.status(500).json(err);
        res.json(result[0] || { message: "No fee record found" });
    });
});

// 9. Add Grade (Using Roll Number)
app.post('/grades', (req, res) => {
    const { roll_number, subject, marks, total } = req.body;

    const findStudentSql = "SELECT student_id FROM students WHERE roll_number = ?";
    db.query(findStudentSql, [roll_number], (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.length === 0) return res.status(404).json({ message: "Roll Number not found!" });

        const student_id = result[0].student_id;
        const sql = 'INSERT INTO grades (student_id, subject, marks_obtained, total_marks) VALUES (?, ?, ?, ?)';
        db.query(sql, [student_id, subject, marks, total], (err, result) => {
            if(err) return res.status(500).json(err);
            res.json({ message: "Grade Added Successfully!" });
        });
    });
});

// 10. Get Grades
app.get('/grades/:studentId', (req, res) => {
    db.query('SELECT * FROM grades WHERE student_id = ?', [req.params.studentId], (err, result) => {
        if(err) return res.status(500).json(err);
        res.json(result);
    });
});

// 11. Timetable Routes
app.get('/timetable', (req, res) => {
    const sql = "SELECT * FROM timetable ORDER BY FIELD(day, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'), start_time";
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result);
    });
});

app.post('/timetable', (req, res) => {
    const { day, subject, start_time, end_time } = req.body;
    const sql = "INSERT INTO timetable (day, subject, start_time, end_time) VALUES (?, ?, ?, ?)";
    db.query(sql, [day, subject, start_time, end_time], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Class Added Successfully!" });
    });
});

// START SERVER
app.listen(3000, () => {
    console.log('Server running on port 3000');
});