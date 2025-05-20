const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({}, { strict: false });

module.exports = mongoose.model('Cart', cartSchema, 'shopping.cart');
