const mongoose = require('mongoose');

const expertSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    identifier: { type: String, required: true, unique: true, lowercase: true }, // Email or phone for login
    password: { type: String, required: true },
    shop: { type: String, default: '' },
    mapUrl: { type: String, default: '' },
    services: { type: String, default: '' },
    registeredAt: { type: String, required: true },
    // Fields for Forgot & Reset Password
    resetPasswordCode: { type: String },
    resetPasswordExpires: { type: Date }
});

module.exports = mongoose.model('Expert', expertSchema);
