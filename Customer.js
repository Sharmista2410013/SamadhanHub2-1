const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true }, // In a production app, we would hash this, but keeping it simple for your project!
    phone: { type: String, default: '' },
    area: { type: String, default: '' },
    registeredAt: { type: String, required: true }
});

module.exports = mongoose.model('Customer', customerSchema);