const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({}, { strict: false });

module.exports = mongoose.model('Order', orderSchema, 'shopping.order');
