const mongoose = require('mongoose');

const helperSchema = new mongoose.Schema({
    id: { type: String },
    name: { type: String, required: true, lowercase: true },
    identifier: { type: String }, // Stores email or phone for login
    password: { type: String },   // Stores login password
    inst: { type: String },       // Institution Name
    dept: { type: String },       // Department
    phone: { type: String, required: true },
    area: { type: String, required: true },
    skills: { type: Array, default: [] },
    bio: { type: String, default: '' },
    registeredAt: { type: String }
});

module.exports = mongoose.model('Helper', helperSchema);
