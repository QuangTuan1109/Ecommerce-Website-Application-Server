const Product = require('../../Model/Product/products.Model');
const Categories = require('../../Model/Product/categories.Model')
const Seller = require('../../Model/User/seller.Model')

async function createNewProduct(req, res) {
    const foundSeller = await Seller.findOne({_id: req.params.sellerID});
    const SellerID = foundSeller._id;
    const Like = 0
    const Rating = 0
    const CreateAt = new Date().getTime();
    const UpdateAt = new Date().getTime();
    const {Name, Price, Description, Image, Category, Size, Color, Quantity, Detail, Type, Status} = req.body

    // Check Product is already or not
    const foundProduct = await Product.findOne({Name})

    if (foundProduct && foundProduct.SellerID == SellerID) {
        return res.status(403).json({
            error : 'The product had already in your shop'
        })
    }    

    // Create new Product
    const newProduct = new Product({SellerID, Name, Price, Description, Image, Category, Rating, Size, Color, Like, Quantity, Detail, Type, Status, CreateAt, UpdateAt})
    newProduct.save()
    return res.status(201).json('Successfully')
}

async function getProductByCategory(req, res) {
    var count = 0
    var Products = []
    const foundCategory = await Categories.findOne({_id : req.params.categoryID});

    Product.find({}, (err, result) => {
        for (var i = 0; i < result.length; i++) {
            for (var j = 0; j < result[i].Category.split('>').length; j++) {
                if (result[i].Category.split('>')[j] == foundCategory.Name) {
                    Products[count] = result[i]
                    count++
                }
            }
        }
        return res.status(200).json(Products);
    })
}

async function createNewCategory(req, res) {
    var {ParentCategoryID, Name} = req.body
    var CreateAt = new Date().getTime();
    var UpdateAt = new Date().getTime();

    // Check Category had already ỏ not
    const foundCategory = await Categories.findOne({Name})

    if (foundCategory) {
        return res.status(403).json({
            error : 'The category had already in the system'
        })
    }

    if (req.body.ParentCategoryID != null) {
        Category.findOne({Name: req.body.ParentCategoryID}, (err, result) => {
            if (err) {
                res.status(500).json({
                    message: err
                })
                return
            } else {
                if (result == null) {
                    res.status(403).json('Parent category has not yet')
                } else {
                    ParentCategoryID = result._id

                    // Create new category
                    const newCategory = new Categories({ParentCategoryID, Name, CreateAt, UpdateAt})
                    newCategory.save()

                    return res.status(201).json('successfully');
                }
            }
        })
    } else {
        // Create new category
        const newCategory = new Categories({ParentCategoryID, Name, CreateAt, UpdateAt})
        newCategory.save()
    
        return res.status(201).json('successfully');
    }

}

// async function getProductByCategory(req, res) {
//     //const product = await Product.find({});

//     return res.status(200).json('successfully');
// }

module.exports= {
    createNewProduct,
    getProductByCategory,
    createNewCategory,
}