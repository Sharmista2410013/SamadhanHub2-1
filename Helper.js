const mongoose = require('mongoose');

const helperSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    identifier: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    phone: { type: String, default: '' },
    inst: { type: String, default: '' },
    dept: { type: String, default: '' },
    area: { type: String, default: '' },
    skills: { type: [String], default: [] },
    bio: { type: String, default: '' },
    registeredAt: { type: String, required: true },
    // Fields for Forgot & Reset Password
    resetPasswordCode: { type: String },
    resetPasswordExpires: { type: Date }
});

module.exports = mongoose.model('Helper', helperSchema);
