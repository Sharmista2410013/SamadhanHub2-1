require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB Atlas successfully!'))
  .catch((err) => console.error('Database connection error:', err));


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

// In-Memory Database Arrays
let tasks = [];
let helpers = [];
let experts = [];

// ==================== ROOT ROUTE ====================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ==================== TASK ENDPOINTS ====================

app.get('/api/tasks', (req, res) => {
    res.json(tasks);
});

app.post('/api/tasks', (req, res) => {
    const { name, area, jobType, wages, desc } = req.body;
    
    const newTask = {
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
    };

    tasks.unshift(newTask);
    res.status(201).json({ message: 'Task published successfully', task: newTask });
});

app.post('/api/tasks/:id/accept', (req, res) => {
    const { id } = req.params;
    const { helperData } = req.body;

    const task = tasks.find(t => t.id === id);
    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }

    task.status = 'Accepted';
    task.helper = helperData;
    res.json({ message: 'Task accepted successfully', task });
});

app.post('/api/tasks/:id/chat', (req, res) => {
    const { id } = req.params;
    const { sender, text } = req.body;

    const task = tasks.find(t => t.id === id);
    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }

    if (!task.messages) task.messages = [];
    const newMessage = { sender, text, time: new Date().toLocaleTimeString() };
    task.messages.push(newMessage);

    res.json({ message: 'Message sent', messages: task.messages });
});


// ==================== HELPER PROFILE ENDPOINTS ====================

app.get('/api/helpers/:name', (req, res) => {
    const helperName = req.params.name.toLowerCase();
    const helper = helpers.find(h => h.name.toLowerCase() === helperName);
    res.json(helper || null);
});

app.post('/api/helpers', (req, res) => {
    const profile = req.body;
    const existingIndex = helpers.findIndex(h => h.name.toLowerCase() === profile.name.toLowerCase());
    
    if (existingIndex >= 0) {
        helpers[existingIndex] = profile;
    } else {
        helpers.push(profile);
    }

    res.json({ message: 'Helper profile saved successfully', profile });
});


// ==================== EXPERT REGISTRY ENDPOINTS ====================

app.get('/api/experts', (req, res) => {
    res.json(experts);
});

app.post('/api/experts', (req, res) => {
    const expertProfile = {
        id: 'expert_' + Date.now(),
        ...req.body,
        registeredAt: new Date().toLocaleDateString()
    };

    experts.unshift(expertProfile);
    res.status(201).json({ message: 'Expert registered successfully', expert: expertProfile });
});


// Start Server
app.listen(PORT, () => {
    console.log(`Samadhan Hub backend running live at http://localhost:${PORT}`);
});