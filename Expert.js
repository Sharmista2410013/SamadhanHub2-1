const mongoose = require('mongoose');

const expertSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    field: { type: String, required: true },
    qualification: { type: String, required: true },
    registeredAt: { type: String, required: true }
});

module.exports = mongoose.model('Expert', expertSchema);