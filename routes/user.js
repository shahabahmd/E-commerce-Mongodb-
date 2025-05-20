var express = require('express');
var router = express.Router();
var productHelper=require('../helpers/product-helpers');
const userHelper=require('../helpers/user-helpers')
const db = require('../config/connection');

const verifyLogin = (req, res, next) => {
  if (req.session.userLoggedIn) {
    next();
  } else {
    res.redirect("/login");
  }
};

/* 🌟 1. Home Page Route (New) */
router.get('/', async function (req, res, next) {
  let user = req.session.user;
  res.render('user/home', { user }); // Ensure 'home.ejs' or 'home.hbs' exists
});

/* 🌟 2. View Products Page */
router.get('/products', async (req, res) => {
  let user = req.session.user;
  let cartCount = null;

  if (req.session.user) {
    cartCount = await userHelper.getCartCount(req.session.user._id);
  }
  let products = await productHelper.getAllProducts();
  let ratings = await userHelper.getAverageRatings();

  products.forEach(product => {
      let rating = ratings.find(r => r._id.equals(product._id));
      product.averageRating = rating ? rating.averageRating.toFixed(1) : "No Ratings";
  });

  res.render('user/view-products', { products, user, cartCount });
 // productHelper.getAllProducts().then((products) => {
   // res.render('user/view-products', { products, user, cartCount });
  });

router.get('/login',(req,res)=>{
  if(req.session.user){
    res.redirect('/')
  }else{

    res.render('user/login',{"LoginErr":req.session.userLoginErr})
   req.session.userLoginErr=false
  }
 
})
router.get('/signup',(req,res)=>{
  res.render('user/signup')
})
router.post('/signup',(req,res)=>{
 userHelper.doSignup(req.body).then((response)=>{
  console.log(response);

  req.session.user=response
  req.session.user.loggedIn=true
  res.redirect('/')
 })
})
router.post('/login', (req, res) => {
  userHelper.doLogin(req.body).then((response) => {
      if (response.status) {
          req.session.user = response.user;
          req.session.userLoggedIn = true;
          res.redirect('/products');  // Redirect to products page after login
      } else {
          req.session.userLoginErr = "Invalid Email or Password";
          res.redirect('/login');
      }
  });
});

router.get('/logout',(req,res)=>{
  req.session.user=null
  req.session.userLoggedIn=false
  res.redirect('/')
})

router.get('/cart', verifyLogin, async (req, res) => {
  let products = await userHelper.getCartProducts(req.session.user._id);
  let totalValue = 0;

  if (products.length > 0) {
      totalValue = await userHelper.getTotalAmount(req.session.user._id);
      res.render('user/cart', { products, user: req.session.user._id, totalValue, cartEmpty: false });
  } else {
      res.render('user/cart', { cartEmpty: true, user: req.session.user });
  }
});

router.get('/add-to-cart/:id',(req,res)=>{
  console.log("api call")
  userHelper.addToCart(req.params.id,req.session.user._id).then(()=>{
   // res.redirect('/')
   res.json({status:true})
  })
})




router.post('/change-product-quantity',(req,res,next)=>{
  console.log(req.body)
  userHelper.changeProductQuantity(req.body).then(async(response)=>{
  response.total= await userHelper.getTotalAmount(req.body.user)
    res.json(response)
  })
})
// router.get('/place-order',verifyLogin,async(req,res)=>{
//  let total=await userHelper.getTotalAmount(req.session.user._id)
//   res.render('user/place-order',{total,user:req.session.user})
// })



router.get('/place-order', verifyLogin, async (req, res) => {
  console.log("Session Data in Place Order:", req.session);  // Debugging

  if (!req.session.user) {
    return res.redirect('/login'); // Ensure user is logged in
  }

  let total = await userHelper.getTotalAmount(req.session.user._id);
  res.render('user/place-order', { total, user: req.session.user });
});


     










router.post('/place-order', async (req, res) => {
  let products = await userHelper.getCartProductList(req.body.userId);
  let totalPrice = await userHelper.getTotalAmount(req.body.userId);

  if (req.body['payment-method'] === 'COD') {
      await userHelper.placeOrder(req.body, products, totalPrice);
      res.json({ status: true, paymentMethod: "COD" }); // Indicate COD success
  } else {
      // Store order details in session before redirecting to payment
      req.session.orderDetails = { order: req.body, products, totalPrice };
      res.json({ status: true, paymentMethod: "ONLINE" });
  }
});

router.get('/payment', (req, res) => {
  if (!req.session.orderDetails) {
      return res.redirect('/'); // Prevent direct access
  }
  console.log(req.session.orderDetails);

  res.render('user/payment', { total: req.session.orderDetails.totalPrice,user:req.session.user });

});

router.post('/payment', async (req, res) => {
  let orderDetails = req.session.orderDetails;
  if (!orderDetails) return res.redirect('/');

  await userHelper.placeOrder(orderDetails.order, orderDetails.products, orderDetails.totalPrice);
  
  //req.session.orderDetails = null; // Clear session
  res.redirect('/order-success');
});


router.get('/order-success',(req,res)=>{
  res.render('user/order-success',{user:req.session.user})
})
router.get('/orders',async(req,res)=>{
  let orders=await userHelper.getUserOrders(req.session.user._id)
  console.log("my orders list");
  console.log(orders);

  res.render('user/orders',{user:req.session.user,orders})
})
router.get('/view-order-products/:id', verifyLogin, async (req, res) => {
  try {
      let orderId = req.params.id;
      let products = await userHelper.getOrderProducts(orderId);
      let order = await userHelper.getOrderDetails(orderId);  // Fetch order details including status

      console.log("Order Details:", order);
      console.log("Order status:", order.status); // Debugging
      console.log("Passing to template - orderStatus:", order ? order.status : "Unknown");
      console.log("Order Id:", orderId);

      res.render('user/view-order-products', {
          user: req.session.user,
          products,
          orderStatus: order ? String(order.status) : "Unknown", 
          orderId
      });
  } catch (error) {
      console.error("Error fetching order details:", error);
      res.redirect('/orders');
  }
});


router.post('/remove-cart-item', (req, res) => {
  userHelper.removeCartItem(req.body.cartId, req.body.productId).then(() => {
      res.json({ success: true });
  }).catch(() => {
      res.json({ success: false });
  });
});
// router.get('/payment', verifyLogin, async (req, res) => {
//   let total = await userHelper.getTotalAmount(req.session.user._id);
//   res.render('user/payment', { user: req.session.user, total });
// });
router.get('/payment', verifyLogin, async (req, res) => {
  console.log("Session Data:", req.session);  // Debugging

  if (!req.session.user) {
    return res.redirect('/login');
  }

  let total = await userHelper.getTotalAmount(req.session.user._id);
  res.render('user/payment', { user: req.session.user, total });
});

router.post('/payment', async (req, res) => {
  let userId = req.session.user._id;
  let paymentDetails = req.body;

  // Validate payment (dummy validation)
  if (paymentDetails.cardNumber.length === 16 && paymentDetails.cvv.length === 3) {
      await userHelper.updateOrderStatus(userId, 'Paid');
      res.redirect('/order-success');
  } else {
      res.render('user/payment', { error: 'Invalid Payment Details', user: req.session.user });
  }
});
router.post('/submit-review', verifyLogin, async (req, res) => {
  let { orderId, productId, rating } = req.body;

  try {
      console.log(`Received rating submission: OrderID=${orderId}, ProductID=${productId}, Rating=${rating}`);
      console.log(orderId)
      await userHelper.submitReview(orderId, productId, parseFloat(rating));
      
      console.log("Review submitted successfully!");
      res.json({ success: true });
  } catch (error) {
      console.error("Error submitting review:", error);
      res.json({ success: false, error: error.message });
  }
});



// router.post('/submit-review', async (req, res) => {
//   let { orderId, rating, review } = req.body;
  
//   try {
//       await userHelper.submitReview(orderId, rating, review);
//       res.json({ success: true });
//   } catch (error) {
//       res.json({ success: false });
//   }
// });

module.exports = router;
