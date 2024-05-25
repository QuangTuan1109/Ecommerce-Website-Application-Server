const express = require('express');
const router = require('express-promise-router')();
const passport = require('passport');

require('../../config/db/passport');
const auth = require('../../config/db/auth');
const ProductController = require('../../app/Controller/Product/product.Controller');


router.route('/search').get(ProductController.searchProduct);

router.route('/categories').get(ProductController.getCategory);

router.route('/get-all-delivery').get( ProductController.getAllDelivery); 

router.route('/categories/:ID').get(ProductController.getSubCategory);

router.route('/categories/subcategories/:id').get(ProductController.getAllSubCategory)

router.route('/:categoryID').get(ProductController.getProductByCategory);

router.route('/detail/:productID').get(auth.verifyToken, ProductController.getProductByID);

router.route('/classify/:productID').get(auth.verifyToken, ProductController.getClassify);

router.route('/wholesales/:productID').get(auth.verifyToken, ProductController.getWholesale);

router.route('/create-new-delivery').post(auth.verifyToken, auth.isAdmin, ProductController.createDelivery); 

router.route('/upload-video').post(auth.verifyToken, ProductController.handleFileUpload, ProductController.handleUploadVideo); 

router.route('/:userID/all-products').get(ProductController.getAllProductBySellerID);

router.route('/wishlist').post(auth.verifyToken, ProductController.getWishList);

router.route('/update-product/:productID').put(auth.verifyToken, auth.isSeller, ProductController.updateProduct);

router.route('/delete-product/:productID').delete(auth.verifyToken, auth.isSeller, ProductController.deleteProduct);

router.route('/delete-category/:categoryId').delete(auth.verifyToken, auth.isAdmin, ProductController.deleteCategory);

router.route('/create-new-product').post(auth.verifyToken, auth.isSeller, ProductController.createNewProduct);

router.route('/create-new-category').post(auth.verifyToken, auth.isAdmin, ProductController.createNewCategory);

router.route('/create-value-detail').post(auth.verifyToken, auth.isAdmin, ProductController.addValueDetail);

router.route('/get-value-detail').post(auth.verifyToken, auth.isSeller, ProductController.getValueDetail);

router.route('/add-wishlist/:productId').post(auth.verifyToken, ProductController.addWishList);

router.route('/review/:productId').post(auth.verifyToken, ProductController.reviewProduct);

module.exports = router;
