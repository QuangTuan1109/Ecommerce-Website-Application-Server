import express from 'express';
import passport from 'passport';
import '../config/db/passport.js'; // Đảm bảo đường dẫn đúng và phần mở rộng `.js`
import { verifyToken, isAdmin, isSeller } from '../config/db/auth.js'; // Đảm bảo đường dẫn đúng và phần mở rộng `.js`
import ProductController from '../app/Controller/product.Controller.js'; // Đảm bảo đường dẫn đúng và phần mở rộng `.js`

const router = express.Router();

router.route('/search').get(ProductController.searchProduct);

router.route('/categories').get(ProductController.getCategory);

router.route('/get-all-delivery').get(ProductController.getAllDelivery);

router.route('/categories/:ID').get(ProductController.getSubCategory);

router.route('/categories/subcategories/:id').get(ProductController.getAllSubCategory);

router.route('/:categoryID').get(ProductController.getProductByCategory);

router.route('/detail/:productID').get(verifyToken, ProductController.getProductByID);

router.route('/classify/:productID').get(verifyToken, ProductController.getClassify);

router.route('/wholesales/:productID').get(verifyToken, ProductController.getWholesale);

router.route('/create-new-delivery').post(verifyToken, isAdmin, ProductController.createDelivery);

router.route('/upload-video').post(verifyToken, ProductController.handleFileUpload, ProductController.handleUploadVideo);

router.route('/upload-image').post(verifyToken, ProductController.handleFileUpload, ProductController.handleUploadImage);

router.route('/:userID/all-products').get(ProductController.getAllProductBySellerID);

router.route('/wishlist').post(verifyToken, ProductController.getWishList);

router.route('/update-product/:productID').put(verifyToken, isSeller, ProductController.updateProduct);

router.route('/delete-product/:productID').delete(verifyToken, isSeller, ProductController.deleteProduct);

router.route('/delete-category/:categoryId').delete(verifyToken, isAdmin, ProductController.deleteCategory);

router.route('/create-new-product').post(verifyToken, isSeller, ProductController.createNewProduct);

router.route('/create-new-category').post(verifyToken, isAdmin, ProductController.createNewCategory);

router.route('/create-value-detail').post(verifyToken, isAdmin, ProductController.addValueDetail);

router.route('/get-value-detail').post(verifyToken, isSeller, ProductController.getValueDetail);

router.route('/add-wishlist/:productId').post(verifyToken, ProductController.addWishList);

router.route('/review/:productId').post(verifyToken, ProductController.reviewProduct);

router.route('/delete-image/:imagePath').delete(verifyToken, isSeller, ProductController.deleteImage);

router.route('/delete-video/:videoPath').delete(verifyToken, isSeller, ProductController.deleteVideo);

router.route('/recommendation').post(verifyToken, ProductController.recommendationProduct);

export default router;
