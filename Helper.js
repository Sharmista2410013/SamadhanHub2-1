const mongoose = require('mongoose');

const helperSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true },
    area: { type: String, required: true },
    skills: { type: Array, default: [] },
    bio: { type: String, default: '' }
});

module.exports = mongoose.model('Helper', helperSchema);