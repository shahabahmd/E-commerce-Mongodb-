



const db = require('../config/connection');
var collection=require('../config/collections');
const { ObjectId } = require('mongodb');
const objectId=require('mongodb').ObjectId;
module.exports = {
    addProduct: (product, callback) => {
        console.log( product);
        product.Price = Number(product.Price);
        // Verify if the connection is successful
        const database = db.get();
      

        // Inserting product into the 'product' collection
        database.collection('product').insertOne(product)
            .then((data) => {
                console.log(data);
                callback(data.insertedId); // Success
            })
           
    },
    getAllProducts:()=>{
        return new Promise(async(resolve,reject)=>{
            const database = db.get();
            let products=await database.collection(collection.PRODUCT_COLLECTION).find().toArray()
            resolve(products)
        })
    },
    /*deleteProduct:(prodId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({_id: new ObjectId(prodId)}).then((response)=>{
                console.log(response);
                resolve(response)

            })
        })
    }*/
        deleteProduct: (prodId) => {
            return new Promise((resolve, reject) => {
                try {
                    if (!ObjectId.isValid(prodId)) {
                        console.log("Invalid ObjectId:", prodId);
                        return reject(new Error("Invalid ObjectId format"));
                    }
        
                    db.get().collection(collection.PRODUCT_COLLECTION)
                        .deleteOne({ _id:new ObjectId(prodId) }) // Ensure correct conversion
                        .then((response) => {
                            console.log("Delete Response:", response);
                            resolve(response);
                        })
                        .catch((error) => {
                            console.error("Error deleting product:", error);
                            reject(error);
                        });
                } catch (error) {
                    console.error("Unexpected error:", error);
                    reject(error);
                }
            });
        },
        getProductDetails:(proId)=>{
            return new Promise((resolve,reject)=>{
                db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id: new objectId(proId)}).then((product)=>{
                    resolve(product)
                })
            })
        },
        updateProduct:(proId,proDetails)=>{
            return new Promise((resolve,reject)=>{
                proDetails.Price = Number(proDetails.Price);
               db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:new objectId(proId)},{
                $set:{
                    Name:proDetails.Name,
                    Description:proDetails.Description,
                    Price:proDetails.Price
                }
               }).then((response)=>{
                    resolve()
               })

            })
        },
        getAllOrders: () => {
            return new Promise(async (resolve, reject) => {
                try {
                    let orders = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                        {
                            $match: { status: { $ne: "delivered" } } // Exclude delivered orders
                        },
                        {
                            $lookup: {
                                from: collection.USER_COLLECTION, 
                                localField: "userId",
                                foreignField: "_id",
                                as: "user"
                            }
                        },
                        {
                            $unwind: "$user"
                        },
                        {
                            $project: {
                                _id: 1,
                                userId: 1,
                                totalAmount: 1,
                                paymentMethod: 1,
                                status: 1,
                                date: 1,
                                userName: "$user.Name"
                            }
                        }
                    ]).toArray();
                    resolve(orders);
                } catch (err) {
                    reject(err);
                }
            });
        },
       
        getDeliveredOrders: () => {
            return new Promise(async (resolve, reject) => {
                try {
                    let deliveredOrders = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                        { 
                            $match: { status: "delivered" } // Filter only delivered orders
                        },
                        { 
                            $lookup: { 
                                from: collection.USER_COLLECTION, 
                                localField: "userId", 
                                foreignField: "_id", 
                                as: "user" 
                            } 
                        },
                        { 
                            $unwind: "$user" // Convert user array to object
                        },
                        { 
                            $unwind: "$products" // Unwind products array to access individual items
                        },
                        { 
                            $lookup: { 
                                from: collection.PRODUCT_COLLECTION, 
                                localField: "products.item", // Join with product ID
                                foreignField: "_id", 
                                as:  "productInfo" 
                            } 
                        },
                        { 
                            $unwind:"$productInfo" // Convert productDetails array to object
                        },
                        { 
                            $addFields: { 
                                "productInfo.rating": "$products.rating" // Merge products.rating into productInfo
                            }
                        },
                        { 
                            $group: { 
                                _id: "$_id",
                                userId: { $first: "$userId" },
                                userName: { $first: "$user.Name" },
                                totalAmount: { $first: "$totalAmount" },
                                paymentMethod: { $first: "$paymentMethod" },
                                status: { $first: "$status" },
                                date: { $first: "$date" },
                                productDetails: { $push: "$productInfo" } // Re-group products into an array
                            }
                        }
                    ]).toArray();
        
                    console.log("Delivered Orders with Product Ratings:", JSON.stringify(deliveredOrders, null, 2)); // Debugging
        
                    resolve(deliveredOrders);
                } catch (err) {
                    reject(err);
                }
            });
        }
              ,           
       
       
                        
                         
  
        
        
        
       
        getAllUsers: () => {
            return new Promise(async (resolve, reject) => {
                try {
                    let users = await db.get().collection(collection.USER_COLLECTION).find().toArray();
                    resolve(users);
                } catch (err) {
                    reject(err);
                }
            });
        },
        updateOrderStatus: (orderId, status) => {
            return new Promise((resolve, reject) => {
                if (!ObjectId.isValid(orderId)) {
                    return reject(new Error("Invalid ObjectId format"));
                }
        
                db.get().collection(collection.ORDER_COLLECTION)
                    .updateOne({ _id: new ObjectId(orderId) }, { $set: { status: status } })
                    .then((response) => {
                        resolve(response);
                    })
                    .catch((error) => {
                        console.error("Error updating order status:", error);
                        reject(error);
                    });
            });
        },
        
         
};
