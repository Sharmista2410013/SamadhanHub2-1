const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, default: 'Anonymous' },
    area: { type: String, required: true },
    jobType: { type: String, required: true },
    wages: { type: String, required: true },
    desc: { type: String, required: true },
    urgency: { type: String, default: 'Medium (Within Hours)' },
    timestamp: { type: String, required: true },
    status: { type: String, default: 'Pending' },
    helper: { type: Object, default: null },
    messages: { type: Array, default: [] }
});

module.exports = mongoose.model('Task', taskSchema);