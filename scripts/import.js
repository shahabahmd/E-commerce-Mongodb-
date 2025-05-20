const mongoose = require('mongoose');
const fs = require('fs');

// Hardcoded MongoDB URI — REPLACE with your real URI
const MONGO_URI = 'mongodb+srv://yourUsername:yourPassword@cluster0.abcde.mongodb.net/shopping';

//const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

const importData = async () => {
  try {
    await mongoose.connect(MONGO_URI);

    await Cart.deleteMany();
    await Order.deleteMany();
    await Product.deleteMany();
    await User.deleteMany();

    const carts = JSON.parse(fs.readFileSync('./data/shopping.cart.json'));
    const orders = JSON.parse(fs.readFileSync('./data/shopping.order.json'));
    const products = JSON.parse(fs.readFileSync('./data/shopping.product.json'));
    const users = JSON.parse(fs.readFileSync('./data/shopping.user.json'));

    await Cart.insertMany(carts);
    await Order.insertMany(orders);
    await Product.insertMany(products);
    await User.insertMany(users);

    console.log('✅ Data imported successfully!');
    process.exit();
  } catch (err) {
    console.error('❌ Error importing data:', err);
    process.exit(1);
  }
};

importData();
