const port = 4000;

const express = require('express');
const app = express();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const { error } = require('console');
const { type } = require('os');

// app.use("/images",express.static('photos'));
app.use(express.json());
app.use(cors());






//! Database Connection with MongoDb
mongoose.connect(
  "mongodb+srv://dharaneeshoffl:dhara123@garmnets.pamlp.mongodb.net/garments"
);


//! API Creation


app.get("/", (req,res) => {
    res.send("express app is running")

})


//! Image Storage Engine


const storage = multer.diskStorage({
    destination: "./upload/images", filename: (req,file,cb) => {
        return cb(null,`${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})


const upload = multer({storage:storage})

//! Creating upload endpoint for images
app.use('/images',express.static('upload/images'))

app.post("/upload", upload.single('product'), (req,res) => {
    res.json({
        success: 1,
        image_url:`http://localhost:${port}/images/${req.file.filename}`
    })
})


//! Schema for creating products

const Product = mongoose.model("Product", {
    id: {
        type: Number,
        required: true,
    },
    name: {
        type: String,
        required:true,
    },
    image: {
        type: String,
        required:true,
    },
    category: {
        type: String,
        required:true,
    },
    new_price: {
        type: Number,
        required:true,
    },
    old_price: {
        type: Number,
        required:true,
    },
    date: {
        type: Date,
        default:Date.now,
    },
    avilable: {
        type: Boolean,
        default:true,
    },
})


app.post('/addproduct', async (req, res) => {
    let products = await Product.find({});
    let id;
    if (products.length > 0) {
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0]
        id = last_product.id + 1;
    }
    else {
        id = 1;
    }
    const product = new Product({
        id:id,
        name: req.body.name,
        image: req.body.image,
        category: req.body.category,
        new_price: req.body.new_price,
        old_price:req.body.old_price
    })
    console.log(product);
    await product.save();
    console.log("Saved");
    res.json({
        success: true,
        name:req.body.name,
    })
})


//! Creating API for deleting


app.post('/removeproduct', async (req,res) => {
    await Product.findOneAndDelete({ id: req.body.id });
    console.log("removed");
    res.json({
        success: true,
        name:req.body.name,
    })
})



//! creating api for geting all products

app.get('/allproducts', async (req,res) => {
    let products = await Product.find({});
    console.log("all products fetched");
    res.send(products);
})


//! Schema Creating for user Model

const Users = mongoose.model('Users', {
    name: {
        type: String,
    },
    email: {
        type: String,
        unique:true,
    },
    password: {
        type:String,
    },
    cartData: {
        type:Object,
    },
    date: {
        type: Date,
        default:Date.now,
    }
})


//! Creating Endpoint for registering the user


app.post('/signup', async (req, res) => {
    let check = await Users.findOne({ email: req.body.email });
    if (check) {
        return res.status(400).json({success:false,errors:"existing user found with same email address"})
    }

    let cart = [];
    for (let i = 0; i < 300; i++){
        cart[i] = 0;
    }

    const user = new Users({
        name: req.body.username,
        email: req.body.email,
        password: req.body.password,
        cartData:cart,
    })

    await user.save();

    const data = {
        user: {
            id:user.id
        }
    }

    const token = jwt.sign(data, 'secret_garm')
    res.json({success:true,token})

})



//! Creating endpoint for userlogin


app.post('/login', async (req, res) => {
    let user = await Users.findOne({ email: req.body.email });
    if (user) {
        const passCompare = req.body.password === user.password;
        if (passCompare) {
            const data = {
                user: {
                    id: user.id
                }
            }

            const token = jwt.sign(data, 'secret_garm');
            res.json({ success: true, token });
        }

        else {
            res.json({ success: false, errors: " Wrong Password " });
        }
    }

    else {
        res.json({ success: false, errors: "Wrong Email Id" });
    }
})


//! Creating endpoint of new Collection data

app.get('/newcollections', async (req,res) => {
    let products = await Product.find({})
    let newcollection = products.slice(1).slice(-8);
    console.log("NewCollection Fetched");
    res.send(newcollection)
})


//! Creating endpoint for popular in women section


app.get('/popularinwomen', async (req,res) => {
    let products = await Product.find({ category: "women" })
    let popularinwomen = products.slice(0, 4);
    console.log("Popular in Women Fetched");
    res.send(popularinwomen);
})

//! Creating middleware to fetch user


let fetchUser = async (req,res) => {
    let token = req.header('auth-token');
    if (!token) {
        res.status(401).send({errors:"Please authentication using valid token"})
    }

    else {
        try {
            let data = jwt.verify(token, 'secret_garm');
            req.user = data.user;
            next();
        } catch (error) {
            res.status(401).send({errors:"Please authentication valid token"})
        }
    }
} 



//! Creating endpoint for adding products in cartdata


app.post('/addtocart',fetchUser, async (req,res) => {
   console.log("Added",req.body.itemId);
    let userData = await Users.findOne({ _id: req.user.id });
    userData.cartData[req.body.itemId] += 1;
    await Users.findOneAndUpdate({_id: req.user.id }, { cartData: userData.cartData })
    res.send('Added')
})


//! Creating endpoint to remove product from cartdata


app.post('/removefromcart', fetchUser, async (req,res) => {
    console.log("Removed",req.body.itemId);
    let userData = await Users.findOne({ _id: req.user.id });
    if (userData.cartData[req.body.itemId]>0)
      userData.cartData[req.body.itemId] -= 1;
    await Users.findOneAndUpdate(
      { _id: req.user.id },
      { cartData: userData.cartData }
    );
    res.send("Removed");
})


//! Createing endpoint to cartdata

app.post('/getcart', fetchUser, async (req, res) => {
    console.log("getCart");
    let userData = await Users.findOne({ _id: req.user.id })
    res.json(userData.cartData);
})


app.listen(process.env.PORT || port, () => {
    console.log("server is running on port " + port);
   
})


















