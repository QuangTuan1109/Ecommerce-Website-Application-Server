const express = require('express')
const router = require('express-promise-router')()
const passport = require('passport')

require('../../config/db/passport')
const auth = require('../../config/db/auth')
const Product = require('../../app/Controller/Product/product.Controller')

router.route('/:categoryID').get(Product.getProductByCategory)

router.route('/:sellerID/create-new-product').post(auth.verifyToken, auth.isSeller, Product.createNewProduct)

router.route('/:adminID/create-new-category').post(auth.verifyToken, auth.isAdmin, Product.createNewCategory)

module.exports = router