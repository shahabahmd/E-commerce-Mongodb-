var express = require('express');
var router = express.Router();
var productHelper = require('../helpers/product-helpers');
const { ObjectId } = require('mongodb');

// Hardcoded admin credentials
const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "123"; 

// Middleware to verify admin session
const verifyAdminLogin = (req, res, next) => {
    if (req.session.adminLoggedIn) {
        next();
    } else {
        res.redirect('/admin/login');
    }
};

// Admin login page
router.get('/login', (req, res) => {
  if (req.session.adminLoggedIn) {
      return res.redirect('/admin');
  }
  res.render('admin/login', { loginErr: req.session.adminLoginErr, hideHeader: true }); // 👈 Pass hideHeader: true
  req.session.adminLoginErr = false;
});


// Handle admin login
router.post('/login', (req, res) => {
    const { email, password } = req.body;
    
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        req.session.adminLoggedIn = true;
        res.redirect('/admin');
    } else {
        req.session.adminLoginErr = "Invalid Email or Password";
        res.redirect('/admin/login');
    }
});

// Admin logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});

// Dashboard (Protected Route)
router.get('/', verifyAdminLogin, (req, res) => {
    productHelper.getAllProducts().then((products) => {
        res.render('admin/view-products', { admin: true, products });
    });
});
router.get('/view-products', verifyAdminLogin, (req, res) => {
  productHelper.getAllProducts().then((products) => {
      res.render('admin/view-products', { admin: true, products });
  });
});

// Add product page
router.get('/add-product', verifyAdminLogin, (req, res) => {
    res.render('admin/add-product',{ admin: true, layout: "layout" });
});

// Handle product addition
router.post('/add-product', verifyAdminLogin, (req, res) => {
    req.body.Price = Number(req.body.Price);
    
    if (!req.files || !req.files.Image) {
        return res.status(400).send("❌ No file uploaded.");
    }

    let image = req.files.Image;
    let fileExtension = image.name.split('.').pop().toLowerCase();

    // Validate file type
    if (fileExtension !== 'jpg' && fileExtension !== 'jpeg' && fileExtension !== 'png') {
        return res.status(400).send("❌ Only JPG and PNG files are allowed.");
    }

    productHelper.addProduct(req.body, (id) => {
        let filePath = `./public/product-images/${id}.${fileExtension}`;

        image.mv(filePath, (err) => {
            if (err) {
                console.log(err);
                return res.status(500).send("❌ Error while uploading image.");
            }
            res.redirect('/admin');
        });
    });
});



// Delete product
router.get('/delete-product/:id', verifyAdminLogin, async (req, res) => {
    let proId = req.params.id;

    if (!ObjectId.isValid(proId)) {
        return res.status(400).send("Invalid ObjectId format");
    }

    await productHelper.deleteProduct(proId);
    res.redirect('/admin');
});

// Edit product page
router.get('/edit-product/:id', verifyAdminLogin, async (req, res) => {
    let product = await productHelper.getProductDetails(req.params.id);
    res.render('admin/edit-product', { product, admin: true, layout: "layout"  });
});

// Handle product editing
router.post('/edit-product/:id', verifyAdminLogin, (req, res) => {
    let id = req.params.id;
    req.body.Price = Number(req.body.Price);

    productHelper.updateProduct(id, req.body).then(() => {
        if (req.files && req.files.Image) {
            let image = req.files.Image;
            image.mv('./public/product-images/' + id + '.jpg', () => {
                res.redirect('/admin');
            });
        } else {
            res.redirect('/admin');
        }
    });
});
router.get('/orders', async (req, res) => {
  try {
      let orders = await productHelper.getAllOrders();
      res.render('admin/view-orders', { orders, admin: true, layout: "layout"  });
  } catch (err) {
      console.error(err);
      res.status(500).send("Error fetching orders");
  }
});
router.post("/orders/deliver/:id", async (req, res) => {
    try {
        let orderId = req.params.id;
        await productHelpers.updateOrderStatus(orderId, "Delivered");
        res.json({ success: true });
    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

router.get('/users', async (req, res) => {
  try {
      let users = await productHelper.getAllUsers();
      res.render('admin/view-users', { users, admin: true, layout: 'layout' }); // Pass `admin: true` to show admin header
  } catch (err) {
      console.error(err);
      res.status(500).send("Error fetching users");
  }
});

router.post('/update-order-status/:id', async (req, res) => {
    try {
        let orderId = req.params.id;

        if (!ObjectId.isValid(orderId)) {
            return res.status(400).json({ success: false, message: "Invalid Order ID" });
        }

        await productHelper.updateOrderStatus(orderId, "delivered");

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Error updating order status" });
    }
});
router.get('/delivered-orders', async (req, res) => {
    try {
        let deliveredOrders = await productHelper.getDeliveredOrders();
        console.log("Fetched Delivered Orders:", deliveredOrders); // 🔍 Debug Log
        res.render('admin/view-delivered-orders', { deliveredOrders, admin: true, layout: "layout" });
    } catch (err) {
        console.error("Error fetching delivered orders:", err);
        res.status(500).send("Error fetching delivered orders");
    }
});




module.exports = router;
