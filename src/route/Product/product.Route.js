const express = require('express');
const router = require('express-promise-router')();
const passport = require('passport');

require('../../config/db/passport');
const auth = require('../../config/db/auth');
const ProductController = require('../../app/Controller/Product/product.Controller');

router.route('/categories').get(ProductController.getCategory);

router.route('/categories/:ID').get(ProductController.getSubCategory);

router.route('/:categoryID').get(ProductController.getProductByCategory);

router.route('/detail/:productID').get(ProductController.getProductByID);

router.route('/:sellerID/all-products').get(ProductController.getAllProductBySellerID);

router.route('/update-product/:productID').patch(auth.verifyToken, auth.isSeller, ProductController.updateProduct);

router.route('/delete-product/:productID').delete(auth.verifyToken, auth.isSeller, ProductController.deleteProduct);

router.route('/:sellerID/create-new-product').post(auth.verifyToken, auth.isSeller, ProductController.handleFileUpload, ProductController.createNewProduct);

router.route('/:adminID/create-new-category').post(auth.verifyToken, auth.isAdmin, ProductController.createNewCategory);

router.route('/:adminID/create-value-detail').post(auth.verifyToken, auth.isAdmin, ProductController.addValueDetail);

module.exports = router;
