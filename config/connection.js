//const { MongoClient } = require('mongodb');
/*const mongoClient=require('mongodb').MongoClient
const state={
    db:null
}
module.exports.connect=function(done){
    const url='mongodb://localhost:27017'
    const dbname='shopping'
    mongoClient.connect(url,(err,data)=>{
        if(err)
            {
              console.log("connection failed")
                return done(err)
            } 
        state.db=data.db(dbname)
        done()
    })
   

}
module.exports.get=function(){
  
    return state.db
}
*/

const { MongoClient } = require('mongodb');
const state = {
    db: null
};

module.exports.connect = function(done) {
    const url = 'mongodb://localhost:27017';
    const dbname = 'shopping';

    // Connecting to MongoDB without deprecated options
    MongoClient.connect(url)
        .then((client) => {
            state.db = client.db(dbname);
            console.log('Connected to the database');
            done();
        })
        .catch((err) => {
            console.log('Error connecting to the database:', err);
            done(err);
        });
};

module.exports.get = function() {
    return state.db; // Return the database instance
};









