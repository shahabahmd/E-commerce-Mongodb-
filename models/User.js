const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({}, { strict: false });

module.exports = mongoose.model('User', userSchema, 'shopping.user');
4