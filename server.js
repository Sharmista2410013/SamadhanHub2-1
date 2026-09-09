require('dotenv').config();
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

// Configure Nodemailer transporter using Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

mongoose.connect(process.env.MONGO_URI, { autoSelectFamily: false })
  .then(() => console.log('Connected to MongoDB Atlas successfully!'))
  .catch((err) => console.error('Database connection error:', err));

const Task = require('./Task');
const Helper = require('./Helper');
const Expert = require('./Expert');
const Customer = require('./Customer');

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static HTML/CSS files from the current directory
app.use(express.static(__dirname));

// ==================== ROOT ROUTE ====================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ==================== TASK ENDPOINTS ====================

app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await Task.find().sort({ _id: -1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

app.post('/api/tasks', async (req, res) => {
    try {
        const { name, area, jobType, wages, desc } = req.body;
        
        const newTask = new Task({
            id: 'task_' + Date.now(),
            name: name ? name.trim() : 'Anonymous',
            area,
            jobType,
            wages,
            desc,
            urgency: 'Medium (Within Hours)',
            timestamp: new Date().toLocaleTimeString(),
            status: 'Pending',
            helper: null,
            messages: []
        });

        await newTask.save();
        res.status(201).json({ message: 'Task published successfully', task: newTask });
    } catch (err) {
        console.error("Task save error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/tasks/:id/accept', async (req, res) => {
    try {
        const { id } = req.params;
        const { helperData } = req.body;

        const task = await Task.findOne({ id });
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        task.status = 'Accepted';
        task.helper = helperData;
        await task.save();

        // Automatically find customer and send notification email via Nodemailer
        const customer = await Customer.findOne({ name: new RegExp('^' + task.name + '$', 'i') });

        if (customer && customer.email) {
            const mailOptions = {
                from: `"Samadhan Hub" <${process.env.EMAIL_USER}>`,
                to: customer.email,
                subject: `Your Task "${task.jobType}" has been Accepted!`,
                html: `
                    <h2>Great News, ${customer.name}!</h2>
                    <p>Your task request has been accepted by a Student Helper.</p>
                    <hr/>
                    <h3>Helper Details:</h3>
                    <ul>
                        <li><strong>Name:</strong> ${helperData.name}</li>
                        <li><strong>Institution:</strong> ${helperData.inst || 'N/A'} (${helperData.dept || 'N/A'})</li>
                        <li><strong>Phone Number:</strong> ${helperData.phone}</li>
                    </ul>
                    <p>You can now log into your Samadhan Hub dashboard to chat with your helper directly!</p>
                `
            };

            try {
                const info = await transporter.sendMail(mailOptions);
                console.log('Acceptance email sent via Nodemailer:', info.response);
            } catch (emailErr) {
                console.error('Nodemailer email send error:', emailErr);
            }
        }

        res.json({ message: 'Task accepted successfully and email dispatched', task });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to accept task' });
    }
});

app.post('/api/tasks/:id/chat', async (req, res) => {
    try {
        const { id } = req.params;
        const { sender, text } = req.body;

        const task = await Task.findOne({ id });
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        if (!task.messages) task.messages = [];
        const newMessage = { sender, text, time: new Date().toLocaleTimeString() };
        task.messages.push(newMessage);
        await task.save();

        res.json({ message: 'Message sent', messages: task.messages });
    } catch (err) {
        res.status(500).json({ error: 'Failed to send message' });
    }
});


// ==================== HELPER PROFILE & AUTH ENDPOINTS ====================

app.get('/api/helpers/:name', async (req, res) => {
    try {
        const helperName = req.params.name.toLowerCase();
        const helper = await Helper.findOne({ name: helperName });
        res.json(helper || null);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch helper profile' });
    }
});

app.post('/api/helpers', async (req, res) => {
    try {
        const profile = req.body;
        const helperName = profile.name.toLowerCase();

        let helper = await Helper.findOne({ name: helperName });

        if (helper) {
            helper.phone = profile.phone;
            helper.area = profile.area;
            helper.skills = profile.skills;
            helper.bio = profile.bio;
            await helper.save();
        } else {
            helper = new Helper({
                name: helperName,
                phone: profile.phone,
                area: profile.area,
                skills: profile.skills,
                bio: profile.bio
            });
            await helper.save();
        }

        res.json({ message: 'Helper profile saved successfully', profile });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save helper profile' });
    }
});

// Helper Signup Route
app.post('/api/helpers/signup', async (req, res) => {
    try {
        const { name, identifier, inst, dept, area, password } = req.body;
        const cleanIdentifier = identifier ? identifier.toLowerCase().trim() : '';
        const helperName = name ? name.toLowerCase().trim() : '';

        const existingHelper = await Helper.findOne({
            $or: [
                { identifier: cleanIdentifier },
                { phone: cleanIdentifier }
            ]
        });

        if (existingHelper) {
            return res.status(400).json({ message: 'A helper with this email or phone is already registered.' });
        }

        const newHelper = new Helper({
            id: 'helper_' + Date.now(),
            name: helperName,
            identifier: cleanIdentifier,
            phone: cleanIdentifier,
            password,
            inst,
            dept,
            area,
            skills: [],
            bio: '',
            registeredAt: new Date().toLocaleDateString()
        });

        await newHelper.save();
        res.status(201).json({ message: 'Helper registered successfully', helper: newHelper });
    } catch (err) {
        console.error('Helper signup error:', err);
        res.status(500).json({ message: 'Failed to register helper account' });
    }
});

// Helper Login Route
app.post('/api/helpers/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;
        const cleanIdentifier = identifier ? identifier.toLowerCase().trim() : '';

        const helper = await Helper.findOne({
            $or: [
                { identifier: cleanIdentifier },
                { phone: cleanIdentifier }
            ]
        });

        if (!helper || helper.password !== password) {
            return res.status(401).json({ message: 'Invalid email/phone or password.' });
        }

        res.json({
            message: 'Login successful',
            helper: {
                id: helper.id,
                name: helper.name,
                identifier: helper.identifier,
                phone: helper.phone,
                inst: helper.inst,
                dept: helper.dept,
                area: helper.area,
                skills: helper.skills,
                bio: helper.bio
            }
        });
    } catch (err) {
        console.error('Helper login error:', err);
        res.status(500).json({ message: 'Server error during helper login' });
    }
});


// ==================== EXPERT REGISTRY ENDPOINTS ====================

app.get('/api/experts', async (req, res) => {
    try {
        const experts = await Expert.find().sort({ _id: -1 });
        res.json(experts);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch experts' });
    }
});

app.post('/api/experts', async (req, res) => {
    try {
        const expertProfile = new Expert({
            id: 'expert_' + Date.now(),
            ...req.body,
            registeredAt: new Date().toLocaleDateString()
        });

        await expertProfile.save();
        res.status(201).json({ message: 'Expert registered successfully', expert: expertProfile });
    } catch (err) {
        res.status(500).json({ error: 'Failed to register expert' });
    }
});


// ==================== CUSTOMER ENDPOINTS ====================

app.post('/api/customers/register', async (req, res) => {
    try {
        const { name, email, password, phone, area } = req.body;

        const existingCustomer = await Customer.findOne({ email: email.toLowerCase() });
        if (existingCustomer) {
            return res.status(400).json({ error: 'Email is already registered' });
        }

        const newCustomer = new Customer({
            id: 'cust_' + Date.now(),
            name,
            email: email.toLowerCase(),
            password,
            phone: phone || '',
            area: area || '',
            registeredAt: new Date().toLocaleDateString()
        });

        await newCustomer.save();
        res.status(201).json({ message: 'Customer registered successfully', customer: { id: newCustomer.id, name: newCustomer.name, email: newCustomer.email } });
    } catch (err) {
        res.status(500).json({ error: 'Failed to register customer' });
    }
});

app.post('/api/customers/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const identifier = email ? email.toLowerCase().trim() : '';

        const customer = await Customer.findOne({
            $or: [
                { email: identifier },
                { phone: identifier }
            ]
        });

        if (!customer || customer.password !== password) {
            return res.status(401).json({ error: 'Invalid email/phone or password' });
        }

        res.json({ 
            message: 'Login successful', 
            customer: { 
                id: customer.id, 
                name: customer.name, 
                email: customer.email, 
                phone: customer.phone,
                area: customer.area 
            } 
        });
    } catch (err) {
        res.status(500).json({ error: 'Login failed' });
    }
});


// ==================== FORGOT & RESET PASSWORD ENDPOINTS ====================

async function findUserByIdentifier(identifier) {
    const cleanId = identifier.toLowerCase().trim();
    
    // 1. Check Customer collection
    let user = await Customer.findOne({ $or: [{ email: cleanId }, { phone: cleanId }] });
    if (user) return { user, type: 'Customer' };

    // 2. Check Helper collection
    user = await Helper.findOne({ $or: [{ identifier: cleanId }, { phone: cleanId }] });
    if (user) return { user, type: 'Helper' };

    // 3. Check Expert collection
    user = await Expert.findOne({ identifier: cleanId });
    if (user) return { user, type: 'Expert' };

    return null;
}

app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { identifier } = req.body;
        if (!identifier) {
            return res.status(400).json({ error: 'Please provide your email or phone number.' });
        }

        const found = await findUserByIdentifier(identifier);
        if (!found) {
            return res.status(404).json({ error: 'No account found with this email or phone.' });
        }

        const { user, type } = found;
        const emailToUse = user.email || user.identifier;

        if (!emailToUse || !emailToUse.includes('@')) {
            return res.status(400).json({ error: 'No valid email address is associated with this account identifier.' });
        }

        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        user.resetPasswordCode = resetCode;
        user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
        await user.save();

        const mailOptions = {
            from: `"Samadhan Hub" <${process.env.EMAIL_USER}>`,
            to: emailToUse,
            subject: 'Password Reset Code - Samadhan Hub',
            html: `
                <h2>Password Reset Verification</h2>
                <p>You requested a password reset for your Samadhan Hub <strong>${type}</strong> account.</p>
                <p>Your secure verification code is:</p>
                <h1 style="color: #059669; letter-spacing: 3px;">${resetCode}</h1>
                <p>This code will expire in 15 minutes. If you did not request this, please ignore this email.</p>
            `
        };

        try {
            const info = await transporter.sendMail(mailOptions);
            console.log('Reset email sent via Nodemailer:', info.response);
        } catch (emailErr) {
            console.error('Nodemailer send error:', emailErr);
            return res.status(500).json({ error: 'Failed to send reset email.' });
        }

        res.json({ message: 'Password reset code sent to your email successfully!' });

    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ error: 'Server error processing request.' });
    }
});

app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { identifier, code, newPassword } = req.body;
        if (!identifier || !code || !newPassword) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        const found = await findUserByIdentifier(identifier);
        if (!found) {
            return res.status(404).json({ error: 'Account not found.' });
        }

        const { user } = found;

        if (!user.resetPasswordCode || user.resetPasswordCode !== code) {
            return res.status(400).json({ error: 'Invalid verification code.' });
        }

        if (Date.now() > user.resetPasswordExpires) {
            return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
        }

        user.password = newPassword;
        user.resetPasswordCode = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: 'Password has been reset successfully! You can now log in.' });

    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ error: 'Failed to reset password.' });
    }
});


// Start Server
app.listen(PORT, () => {
    console.log(`Samadhan Hub backend running live at http://localhost:${PORT}`);
});
