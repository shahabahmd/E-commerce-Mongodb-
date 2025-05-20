const db = require('../config/connection');
var collection=require('../config/collections')
const objectId=require('mongodb').ObjectId;
const bcrypt=require('bcrypt');
const { ObjectId } = require('mongodb');
module.exports={
    doSignup:(userData)=>{
        return new Promise(async(resolve,reject)=>{
            userData.Password= await bcrypt.hash(userData.Password,10)
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {
                resolve({ ...userData, _id: data.insertedId });
            });
            
           
        })
       
    },
    doLogin:(userData)=>{
        return new Promise(async(resolve,reject)=>{
            let loginStatus=false
            let response={}
            let user=await db.get().collection(collection.USER_COLLECTION).findOne({Email:userData.Email})
        if(user){
                    bcrypt.compare(userData.Password,user.Password).then((status)=>{
                        if(status){
                            console.log("login success")
                            response.user=user
                            response.status=true
                            resolve(response)
                        }else{
                            console.log("login failed")
                            resolve({status:false})
                        }

                    })
            }else{
                console.log("login failed")
                resolve({status:false})
            }

        })
    },
    addToCart:(proId,userId)=>{
        let proObj={
            item:new objectId(proId),
            quantity:1
        }
        return new Promise(async(resolve,reject)=>{
            let userCart=await db.get().collection(collection.CART_COLLECTION).findOne({user:new objectId(userId)})
            if(userCart){
                let proExist=userCart.products.findIndex(product=>product.item==proId)
                console.log(proExist)
                if(proExist!=-1){
                    db.get().collection(collection.CART_COLLECTION).updateOne({user:new objectId(userId),'products.item':new objectId(proId)},
                        {
                            $inc:{'products.$.quantity':1}
                        }

                ).then(()=>{
                    resolve()
                })
                }else{

                
                db.get().collection(collection.CART_COLLECTION).updateOne({user:new objectId(userId)},{
                  
                        $push:{products:proObj}
                    
                }
               
            
            ).then((response)=>{
                resolve()
             })
             }
            }else{
                let cartObj={
                    user:new objectId(userId),
                    products:[proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response)=>{
                    resolve()
                })
            }
        })
    },
    getCartProducts:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cartItems=await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match:{user:new objectId(userId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,
                        quantity:1,
                        product:{$arrayElemAt:['$product',0]}
                    }
                }
              
            ]).toArray()
           // console.log(cartItems[0].products);
            resolve(cartItems)
        })
    },
    getCartCount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let count=0
            let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:new objectId(userId)})
            if(cart){
                count=cart.products.length
            }
            resolve(count)
        })
    },
    changeProductQuantity:(details)=>{
       details.count=parseInt(details.count)
       details.quantity=parseInt(details.quantity)
     //  console.log(cartId,proId)
        return new Promise((resolve,reject)=>{
            if(details.count==-1 && details.quantity==1){
                db.get().collection(collection.CART_COLLECTION).updateOne({_id:new objectId(details.cart)},
                {
                    $pull:{products:{item:new objectId(details.product)}}
                    //$inc:{'products.$.quantity':details.count}
                }
    
                ).then((response)=>{
                    //console.log(res)
                 resolve({removeProduct:true})
             })
    
        
            }else{
                db.get().collection(collection.CART_COLLECTION).updateOne({_id:new objectId(details.cart),'products.item':new objectId(details.product)},
                {
                   $inc:{'products.$.quantity':details.count} 
                }
                ).then((response)=>{
                    //console.log(res)
                 resolve({status:true})
             })
    
            }
        })
    },
    getTotalAmount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let total=await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match:{user:new objectId(userId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,
                        quantity:1,

                        product:{$arrayElemAt:['$product',0]}
                    }
                },
                {
                    $group:{
                        _id:null,
                      
                        total:{$sum:{$multiply:['$quantity','$product.Price']}}
                    }
                } 
            ]).toArray()
            if (total.length > 0) {
                resolve(total[0].total);
            } else {
                resolve(0); // Return total as 0 when no items are found in the cart
            }
            //console.log(total[0].total);
            //resolve(total[0].total)
        })
    },

  /*  ,
   removeCartItem: (cartId, productId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION).updateOne(
                { _id: new objectId(cartId) },
                { $pull: { products: { item: new objectId(productId) } } }
            ).then((response) => {
                resolve(response);
            }).catch((err) => {
                reject(err);
            });
        });
    }*/
        placeOrder: (order, products, total) => {
            return new Promise((resolve, reject) => {
                let status = order['payment-method'] === 'COD' ? 'placed' : 'placed';
        
                let updatedProducts = products.map(p => ({
                    item: new ObjectId(p.item), 
                    quantity: p.quantity,
                    rating: null // Add rating field with default null
                }));
        
                let orderObj = {
                    deliveryDetails: {
                        mobile: order.mobile,
                        address: order.address,
                        pincode: order.pincode
                    },
                    userId: new ObjectId(order.userId),
                    paymentMethod: order['payment-method'],
                    products: updatedProducts, // Include rating in products
                    totalAmount: total,
                    status: status,
                    date: new Date(),
                };
        
                db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj)
                    .then((response) => {
                        db.get().collection(collection.CART_COLLECTION).deleteOne({ user: new ObjectId(order.userId) });
                        resolve(response.insertedId);
                    })
                    .catch((error) => {
                        reject(error);
                    });
            });
        }
        
           
        ,
   getCartProductList:(userId)=>{
    return new Promise(async(resolve,reject)=>{
      let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:new objectId(userId)})  
        resolve(cart.products)
    })
   },
   getUserOrders:(userId)=>{
    return new Promise(async(resolve,reject)=>{
        console.log(userId)
        let orders=await db.get().collection(collection.ORDER_COLLECTION).find({userId:new objectId(userId)}).toArray()
      
        resolve(orders)
    })
   },
   getOrderProducts: (orderId) => {
    return new Promise(async (resolve, reject) => {
        let orderItems = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
            { $match: { _id: new ObjectId(orderId) } },
            { $unwind: "$products" },
            {
                $project: {
                    item: "$products.item",
                    quantity: "$products.quantity",
                    rating: "$products.rating"
                }
            },
            {
                $lookup: {
                    from: collection.PRODUCT_COLLECTION,
                    localField: "item",
                    foreignField: "_id",
                    as: "product"
                }
            },
            {
                $project: {
                    item: 1,
                    quantity: 1,
                    rating: 1,
                    product: { $arrayElemAt: ["$product", 0] }
                }
            }
        ]).toArray();
        
        resolve(orderItems);
    });
}
,  getOrderDetails: async (orderId) => {
    try {
        console.log("Fetching order details for ID:", orderId);
        let order = await db.get().collection('order').findOne({ _id: new ObjectId(orderId) });
        if (!order) {
            console.log("No order found for ID:", orderId);
            return null;
        }

        console.log("Order found:", order);  // Debugging
        return order;
       
    } catch (error) {
        console.error("Error fetching order details:", error);
        return null;
    }
},
   removeCartItem: (cartId, productId) => {
    return new Promise((resolve, reject) => {
        db.get().collection(collection.CART_COLLECTION).updateOne(
            { _id: new objectId(cartId) },
            { $pull: { products: { item: new objectId(productId) } } }
        ).then((response) => {
            resolve(response);
        }).catch((err) => {
            reject(err);
        });
    });
},
updateOrderStatus: (userId, status) => {
    return new Promise(async (resolve, reject) => {
        await db.get().collection(collection.ORDER_COLLECTION).updateMany(
            { userId: new ObjectId(userId), status: "pending" },
            { $set: { status: status } }
        );
        resolve();
    });
},
submitReview: (orderId, productId, rating) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!orderId || orderId.length !== 24) {
                throw new Error("Invalid orderId provided");
            }
            if (!productId || productId.length !== 24) {
                throw new Error("Invalid productId provided");
            }

            let result = await db.get().collection(collection.ORDER_COLLECTION).updateOne(
                { _id: new ObjectId(orderId), "products.item": new ObjectId(productId) },
                { $set: { "products.$.rating": rating } }
            );

            if (result.modifiedCount === 0) {
                throw new Error("No matching document found");
            }

            resolve();
        } catch (error) {
            console.error("Error updating review in DB:", error);
            reject(error);
        }
    });
},




getAverageRatings: () => {
    return new Promise(async (resolve, reject) => {
        let ratings = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
            { $unwind: "$products" },
            { $match: { "products.rating": { $ne: null } } },
            {
                $group: {
                    _id: "$products.item",
                    averageRating: { $avg: "$products.rating" },
                    count: { $sum: 1 }
                }
            }
        ]).toArray();
        resolve(ratings);
    });
}
,


}