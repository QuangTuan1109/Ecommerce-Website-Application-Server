import dotenv from 'dotenv';
dotenv.config();
import { v4 as uuidv4 } from 'uuid';
import { Storage } from '@google-cloud/storage';
import multer from 'multer';
import path from 'path';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import { faker } from '@faker-js/faker';

import User from '../Model/user.Model.js';
import Role from '../Model/role.Model.js';
import productModel from '../Model/products.Model.js';
import Categories from '../Model/categories.Model.js';
import searchHistoryModel from '../Model/searchHistory.js';
import Seller from '../Model/seller.Model.js';
import ValueDetail from '../Model/value.detail.model.js';
import ClassifyDetail from '../Model/classifyDetail.Model.js';
import DiscountModel from '../Model/Discount.Model.js';
import Customer from '../Model/customer.Model.js';
import Review from '../Model/review.Model.js';
import Order from '../Model/order.Model.js';
import Delivery from '../Model/Delivery.Model.js';

import { preprocessData } from '../../ai/pre-processing/preProcessData.js'
import { trainModel, recommendProducts } from '../../ai/model/productRecommendModel.js'

async function getEmbedding(text, productTexts) {
    const requestData = {
        source_sentence: text,
        sentences: productTexts
    };

    const response = await fetch('https://api-inference.huggingface.co/models/SeyedAli/Multilingual-Text-Semantic-Search-Siamese-BERT-V1', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.HUGGING_FACE_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    });
    const data = await response.json();
    return data
}

const storage = new Storage({
    projectId: 'ecommerce-website-a69f9',
    keyFilename: 'C:/Users/ADMIN/Downloads/ecommerce-website-a69f9-firebase-adminsdk-9jmgt-0b36ab9a6e.json'
});
const bucketName = 'ecommerce-website-a69f9.appspot.com';
const bucket = storage.bucket(bucketName);
const storageMulter = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'C:/Users/ADMIN/Desktop/');
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storageMulter }).fields([{ name: 'Image', maxCount: 5 }, { name: 'Video', maxCount: 1 }]);
const handleFileUpload = (req, res, next) => {
    upload(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: 'File upload failed' });
        }
        next();
    });
};
async function handleUploadVideo(req, res) {
    const videoFiles = req.files['Video'];
    const videoUrls = await Promise.all(videoFiles.map(async (videoFile) => {
        const videoName = uuidv4() + path.extname(videoFile.originalname);
        const videoFilePath = `videos/${videoName}`;
        await bucket.upload(videoFile.path, { destination: videoFilePath });
        return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(videoFilePath)}?alt=media`;
    }));
    return res.status(200).json({ data: videoUrls });
}
async function handleUploadImage(req, res) {
    const imageFiles = req.files['Image'];
    const imageUrls = await Promise.all(imageFiles.map(async (imageFile) => {
        const imageName = uuidv4() + path.extname(imageFile.originalname);
        const imagePath = `images/${imageName}`;
        await bucket.upload(imageFile.path, { destination: imagePath });
        return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(imagePath)}?alt=media`;
    }));
    return res.status(200).json({ data: imageUrls });
}

async function deleteFile(filePath) {
    try {
        await bucket.file(filePath).delete();
        console.log('File deleted successfully.');
    } catch (error) {
        console.error('Error deleting file:', error);
        throw error;
    }
}

async function deleteImage(req, res) {
    const imagePath = req.params.imagePath;
    try {
        await deleteFile(imagePath);
        res.status(200).json({ message: 'Image deleted successfully.' });
    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({ error: 'An error occurred while deleting image.' });
    }
}

async function deleteVideo(req, res) {
    const videoPath = req.params.videoPath;
    try {
        await deleteFile(videoPath);
        res.status(200).json({ message: 'Video deleted successfully.' });
    } catch (error) {
        console.error('Error deleting video:', error);
        res.status(500).json({ error: 'An error occurred while deleting video.' });
    }
}

async function createNewProduct(req, res) {
    try {
        const token = req.headers.authorization;
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        if (!decodedToken) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userID = decodedToken.sub;
        const foundUser = await User.findById({ _id: mongoose.Types.ObjectId(userID) });
        const roleSeller = await Role.findOne({ name: 'seller' });

        if (!foundUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!foundUser.activeRole.equals(roleSeller._id)) {
            return res.status(403).json({ error: 'User is not a seller' });
        }

        const foundSeller = await Seller.findById({ _id: foundUser.SellerID });
        if (!foundSeller) {
            return res.status(404).json({ error: 'Seller not found' });
        }

        const {
            Name, Description, Video, Image, Category, Detail, Classify, Discount,
            Weight, Height, Length, deliveryFee, preOrderGoods,
            Price, Quantity, Width, preparationTime, SKU, Status
        } = req.body;

        const categories = Category.split(' > ');

        let parentCategory = null;
        let foundCategory = null;
        for (let i = 0; i < categories.length; i++) {
            const categoryName = categories[i];
            foundCategory = await Categories.findOne({ Name: categoryName });

            if (!foundCategory) {
                return res.status(404).json({ error: `${categoryName} not found` });
            }

            if (parentCategory) {
                if (!foundCategory.ParentCategoryID.equals(parentCategory._id)) {
                    return res.status(404).json({ error: `${categoryName} is not a child category of ${parentCategory.Name}` });
                }
            }
            parentCategory = foundCategory;
        }

        let productPrice;
        let totalStock = 0;

        if (Classify && Classify.length > 0) {
            const prices = Classify.map(option => option.Price);
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);

            totalStock = Classify.reduce((accumulator, option) => {
                return accumulator + option.Stock;
            }, 0);

            if (minPrice === maxPrice) {
                productPrice = `${minPrice.toLocaleString()}đ`;
            } else {
                productPrice = `${minPrice.toLocaleString()}đ - ${maxPrice.toLocaleString()}đ`;
            }
        } else {
            productPrice = Price,
                totalStock = Quantity
        }

        const newProduct = new productModel({
            SellerID: foundSeller._id,
            Name,
            Description,
            Category,
            Detail,
            Weight,
            Width,
            Height,
            Length,
            deliveryFee,
            preOrderGoods,
            SKU,
            Status,
            PriceRange: productPrice,
            Price,
            Quantity: totalStock,
            Image,
            preparationTime,
            Video,
            Rating: 0,
            Like: 0,
        });

        await newProduct.save();

        if (Detail) {
            const detailKeys = Object.keys(Detail)

            for (let key of detailKeys) {
                const foundValueDetails = await ValueDetail.findOne({
                    AttributeName: key
                });

                if (!foundValueDetails.categoryPaths.includes(Category)) {
                    return res.status(404).json({ error: `${key} is not suitable for ${foundCategory.Name}` });
                }
            }
        }

        if (Classify) {
            const classifyDetail = new ClassifyDetail({
                ProductID: newProduct._id,
                Options: Classify
            });
            await classifyDetail.save();
        }

        if (Discount) {
            const discount = new DiscountModel({
                ProductID: newProduct._id,
                Value: Discount
            });
            await discount.save();
        }

        return res.status(201).json('Product created successfully');
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

async function getAllDelivery(req, res) {
    try {
        const deliveryMethods = await Delivery.find({});

        res.status(200).json(deliveryMethods);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy danh sách phương thức vận chuyển.' });
    }
}

async function createDelivery(req, res) {
    try {
        const { deliveryMethod, deliveryFees, weightLimit, sizeLimit } = req.body;

        // Check if required fields are provided
        if (!deliveryMethod || !deliveryFees) {
            return res.status(400).json({ message: 'Please provide all necessary information.' });
        }

        // Create a new record in the deliveryModel collection
        const newDelivery = new Delivery({
            deliveryMethod,
            deliveryFees,
            weightLimit,
            sizeLimit
        });

        // Save the new delivery method to the database
        const savedDelivery = await newDelivery.save();

        res.status(201).json(savedDelivery); // Return the newly created delivery method
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred while creating a new delivery method.' });
    }
}

async function getProductByCategory(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const foundCategory = await Categories.findOne({ _id: req.params.categoryID });
        if (!foundCategory) {
            return res.status(404).json({ message: 'Category not found' });
        }

        const regex = new RegExp(`.*${foundCategory.Name}.*`);
        const products = await productModel.find({ Category: { $regex: regex } })
            .skip(skip)
            .limit(limit);

        const totalProducts = await productModel.countDocuments({ Category: { $regex: regex } });

        const classify = await ClassifyDetail.find({ ProductID: products.map(product => product._id) });
        const discount = await DiscountModel.find({ ProductID: products.map(product => product._id) });

        const productsWithDetails = products.map(product => {
            const productClassify = classify.filter(item => item.ProductID.toString() === product._id.toString());
            const productDiscount = discount.filter(item => item.ProductID.toString() === product._id.toString());

            return {
                ...product.toObject(),
                classify: productClassify,
                discount: productDiscount
            };
        });

        return res.status(200).json({ products: productsWithDetails, totalProducts: totalProducts });
    } catch (error) {
        console.error('Error in getProductByCategory:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function getProductByID(req, res) {
    try {
        const productId = req.params.productID;

        const foundProduct = await productModel.findById({ _id: mongoose.Types.ObjectId(productId) }).populate('SellerID');

        if (!foundProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const foundDiscounts = await DiscountModel.find({ ProductID: mongoose.Types.ObjectId(productId) });
        const foundClassifyDetails = await ClassifyDetail.find({ ProductID: mongoose.Types.ObjectId(productId) });

        const productWithDetails = {
            ...foundProduct.toJSON(),
            Discount: foundDiscounts.length > 0 ? foundDiscounts : null,
            Classify: foundClassifyDetails.length > 0 ? foundClassifyDetails : null
        };

        return res.status(200).json(productWithDetails);
    } catch (error) {
        console.error('Error in getProductByID:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function getAllProductBySellerID(req, res) {
    try {
        const foundUser = await User.findOne({ _id: req.params.userID })

        if (foundUser) {
            const sellerProducts = await productModel.find({ SellerID: foundUser.SellerID })
                .sort({ createdAt: -1 });;
            const products = [];

            for (var i = 0; i < sellerProducts.length; i++) {
                const product = sellerProducts[i];
                const getClassify = await ClassifyDetail.findOne({ ProductID: product._id })

                if (getClassify) {
                    const productWithClassify = {
                        ...product.toObject(),
                        Classify: getClassify
                    };
                    products.push(productWithClassify);
                } else {
                    products.push(product.toObject());
                }
            }
            return res.status(200).json({ data: products });
        }
    } catch (error) {
        console.error('Error in getAllProductBySellerID:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function updateProduct(req, res) {
    try {
        const { productID } = req.params;
        const updatedFields = req.body;

        // Extract Classify and Discount from the updatedFields if they exist
        const { Classify: classifyData, Discount: discountData, ...productUpdates } = updatedFields;

        // Update the product itself without Classify and Discount
        const product = await productModel.findByIdAndUpdate(productID, { ...productUpdates, updatedAt: Date.now() }, { new: true });

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check and update Classify if exists
        const classifyRecord = await ClassifyDetail.findOne({ ProductID: mongoose.Types.ObjectId(productID) });

        if (classifyRecord) {
            if (classifyData) {
                await ClassifyDetail.findByIdAndUpdate(
                    classifyRecord._id,
                    {
                        $set: {
                            Options: classifyData,
                            updatedAt: Date.now()
                        }
                    },
                    { new: true }
                );
            } else {
                await ClassifyDetail.findByIdAndDelete(classifyRecord._id);
            }
        } else {
            if (classifyData) {
                await ClassifyDetail.create({
                    ProductID: mongoose.Types.ObjectId(productID),
                    Options: [...classifyData]
                });
            }
        }

        // Check and update Discount if exists
        const discountRecord = await DiscountModel.findOne({ ProductID: mongoose.Types.ObjectId(productID) });
        if (discountRecord) {
            if (discountData) {
                await DiscountModel.findByIdAndUpdate(
                    discountRecord._id,
                    {
                        $set: {
                            Value: discountData,
                            updatedAt: Date.now()
                        }
                    },
                    { new: true }
                );
            } else {
                await DiscountModel.findByIdAndDelete(discountRecord._id);
            }
        } else {
            if (discountData) {
                await DiscountModel.create({
                    ProductID: mongoose.Types.ObjectId(productID),
                    Value: [...discountData]
                });
            }
        }

        return res.status(200).json({ message: 'Product updated successfully', product });
    } catch (error) {
        console.error('Error in updateProduct:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function deleteProduct(req, res) {
    try {
        const { productID } = req.params;

        const classifyRecord = await ClassifyDetail.findOne({ ProductID: productID });
        const discountRecord = await DiscountModel.findOne({ ProductID: productID });

        if (classifyRecord) {
            await ClassifyDetail.findByIdAndDelete(classifyRecord._id);
        }

        if (discountRecord) {
            await DiscountModel.findByIdAndDelete(discountRecord._id);
        }

        const deletedProduct = await productModel.findByIdAndDelete(productID);

        if (!deletedProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }

        return res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error in deleteProduct:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function createNewCategory(req, res) {
    try {
        let { ParentCategoryID, Name } = req.body;

        if (ParentCategoryID) {
            const parentCategory = await Categories.findOne({ Name: ParentCategoryID });
            if (!parentCategory) {
                return res.status(403).json({ error: 'Parent category does not exist' });
            }
            ParentCategoryID = parentCategory._id
        }

        const newCategory = new Categories({ ParentCategoryID, Name, CreateAt: new Date(), UpdateAt: new Date() });
        await newCategory.save();

        return res.status(201).json({ message: 'Category created successfully' });
    } catch (error) {
        console.error('Error in createNewCategory:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function getCategory(req, res) {
    try {
        const categories = await Categories.find({ ParentCategoryID: null });

        if (!categories || categories.length === 0) {
            return res.status(404).json({ message: 'No categories found' });
        }

        return res.status(200).json({ data: categories });

    } catch (error) {
        console.error('Error in getCategory:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function getClassify(req, res) {
    try {
        const classify = await ClassifyDetail.findOne({ ProductID: req.params.productID });

        if (!classify) {
            return res.status(404).json({ message: 'No classify found' });
        }

        return res.status(200).json({ data: classify });

    } catch (error) {
        console.error('Error in getCategory:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function getWholesale(req, res) {
    try {
        const wholesale = await DiscountModel.findOne({ ProductID: req.params.productID });

        if (!wholesale) {
            return res.status(404).json({ message: 'No wholesale found' });
        }

        return res.status(200).json({ data: wholesale });

    } catch (error) {
        console.error('Error in getCategory:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function deleteCategory(req, res) {
    try {
        const categoryId = req.params.categoryId;

        const category = await Categories.findById(mongoose.Types.ObjectId(categoryId));

        if (!category) {
            return res.status(404).json({ message: "Category does not exist" });
        }

        await Categories.deleteMany({ $or: [{ _id: categoryId }, { ParentCategoryID: categoryId }] });

        res.status(200).json({ message: "The category and all subcategories have been successfully deleted" });
    } catch (error) {
        console.error('Error in getCategory:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function getSubCategory(req, res) {
    try {
        const subCategories = await Categories.find({ ParentCategoryID: mongoose.Types.ObjectId(req.params.ID) });

        if (!subCategories || subCategories.length === 0) {
            return res.status(404).json({ message: 'No subcategories found' });
        }

        return res.status(200).json({ data: subCategories });
    } catch (error) {
        console.error('Error in getSubCategory:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function getAllSubCategory(req, res) {
    try {
        const parentID = req.params.id;

        const parentCategory = await Categories.findById(parentID);

        if (!parentCategory) {
            return res.status(404).json({ message: 'Parent category not found' });
        }

        if (parentCategory.ParentCategoryID !== null) {
            return res.status(400).json({ message: 'This category is not a root category' });
        }

        const getAllSubcategories = async (parentID) => {
            const subcategories = await Categories.find({ ParentCategoryID: parentID }, '_id Name');
            let results = [];

            for (const subcategory of subcategories) {
                results.push({ id: subcategory._id, name: subcategory.Name });
                const subSubcategories = await getAllSubcategories(subcategory._id);
                results = results.concat(subSubcategories);
            }

            return results;
        };

        const subcategoryList = await getAllSubcategories(parentID);

        return res.json({ data: subcategoryList });
    } catch (error) {
        console.error('Error in getAllSubcategories:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function addValueDetail(req, res) {
    try {
        const { Category, AttributeName, Data } = req.body;
        let foundCategoriesIDs = [];

        for (let categoryPath of Category) {
            const categories = categoryPath.split(' > ');

            for (let categoryName of categories) {
                const foundCategory = await Categories.findOne({ Name: categoryName });

                if (!foundCategory) {
                    return res.status(404).json({ error: `Category "${categoryName}" not found` });
                }
            }

            foundCategoriesIDs.push(categoryPath);
        }

        const newValueDetail = new ValueDetail({ categoryPaths: foundCategoriesIDs, AttributeName, Data, CreateAt: new Date(), UpdateAt: new Date() });
        await newValueDetail.save();

        return res.status(201).json({ message: 'Value detail added successfully' });
    } catch (error) {
        console.error('Error in addValueDetail:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function getValueDetail(req, res) {
    try {
        const { Category } = req.body;

        // Tìm kiếm tất cả các bản ghi trong ValueDetail có categoryPaths trùng với Category
        const foundValueDetails = await ValueDetail.find({ categoryPaths: Category });

        // Nếu không tìm thấy bản ghi nào, trả về lỗi
        if (!foundValueDetails.length) {
            return res.status(404).json({ error: 'No value details found for this category' });
        }

        // Lấy ra AttributeName và Data của các bản ghi thỏa mãn
        const attributeNames = foundValueDetails.map(detail => detail.AttributeName);
        const data = foundValueDetails.map(detail => detail.Data);

        return res.status(200).json({ attributeNames, data });
    } catch (error) {
        console.error('Error in getValueDetail:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function addWishList(req, res) {
    try {
        const productId = req.params.productId;
        const token = req.headers.authorization;
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        if (!decodedToken) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const user = await User.findById(mongoose.Types.ObjectId(decodedToken.sub));
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const customer = await Customer.findById(mongoose.Types.ObjectId(user.customerID));
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        const product = await productModel.findById(productId);

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        const isProductInWishlist = customer.Wishlist.includes(productId);

        if (isProductInWishlist) {
            return res.status(400).json({ message: "Product is already in the wishlist" });
        }

        customer.Wishlist.push(product);
        await customer.save();

        res.status(200).json({ message: "Product added to wishlist successfully" });

    } catch (error) {
        console.error('Error in addValueDetail:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function getWishList(req, res) {
    try {
        const token = req.headers.authorization;
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        if (!decodedToken) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const user = await User.findById(mongoose.Types.ObjectId(decodedToken.sub));
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const customer = await Customer.findById(mongoose.Types.ObjectId(user.customerID));
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        const wishlistProducts = customer.Wishlist;
        res.status(200).json(wishlistProducts);

    } catch (error) {
        console.error('Error in addValueDetail:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function reviewProduct(req, res) {
    try {
        const { productId } = req.params;
        const { rating, title, content } = req.body;
        const token = req.headers.authorization;
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        if (!decodedToken) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const user = await User.findById(mongoose.Types.ObjectId(decodedToken.sub));
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userId = user.activeRole;
        if (userId != user.CustomerID) {
            return res.status(404).json({ message: 'Your role is not correct' });
        }

        const order = await Order.findOne({
            'customer': userId,
            'products.product': productId,
            'orderStatus': 'Delivered'
        });

        if (!order) {
            return res.status(403).json({ message: 'You cannot rate this product.' });
        }

        const review = new Review({
            user: userId,
            product: productId,
            rating,
            title,
            content
        });

        const savedReview = await review.save();
        res.status(201).json(savedReview);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function searchProduct(req, res) {
    const query = req.query.q;

    try {
        const token = req.headers.authorization;
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        if (!decodedToken) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userID = decodedToken.sub;
        const foundUser = await User.findById(userID);
        if (!foundUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        const foundCustomer = await Customer.findOne({ _id: mongoose.Types.ObjectId(foundUser.CustomerID) });

        const foundSearchHistoryCustomer = await searchHistoryModel.findOne({ customerId: foundCustomer._id })

        if (foundSearchHistoryCustomer) {
            foundSearchHistoryCustomer.keywords.push(query);
            await foundSearchHistoryCustomer.save();
        } else {
            const newSearchHistory = new searchHistoryModel({
                customerId: foundCustomer._id,
                keywords: [query]
            });
            await newSearchHistory.save();
        }

        const products = await productModel.find();

        const productTexts = products.map((product) => `${product.Name}`);

        const embeddings = await getEmbedding(query, productTexts);

        const similarities = products.map((product, index) => ({
            product,
            similarity: embeddings[index]
        }));

        similarities.sort((a, b) => b.similarity - a.similarity);

        const mostSimilarProducts = similarities.map(item => item.product);

        res.json(mostSimilarProducts);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

async function recommendationProduct(req, res) {
    try {
        const token = req.headers.authorization;
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        if (!decodedToken) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userID = decodedToken.sub;
        const foundUser = await User.findById(userID);
        if (!foundUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        const foundCustomer = await Customer.findOne({ _id: mongoose.Types.ObjectId(foundUser.CustomerID) });

        const orders = await Order.find({ customer: foundCustomer._id })
            .populate('products.product')
            .select('products.product')
            .sort({ createdDate: -1 })
            .limit(5);

        let orderProducts = orders.flatMap(order => {
            return order.products.map(product => {
                return product.product.Name;
            });
        });

        let searchHistory = await searchHistoryModel.findOne({ customerId: foundCustomer._id })
            .select('keywords')
            .slice('keywords', -1);

        let products = await productModel.find();

        if (orderProducts && searchHistory) {

            const { input, output } = preprocessData(searchHistory, orderProducts, products);

            const knn = await trainModel(input, output);

            const userInput = preprocessData(searchHistory, orderProducts, products).input;

            const recommendations = recommendProducts(knn, userInput);

            const uniqueRecommendations = Array.from(new Set(recommendations));

            const recommendedProducts = uniqueRecommendations.slice(0, 10).map(index => products[index]);

            res.json(recommendedProducts);
        } else {
            const shuffledProducts = products.sort(() => 0.5 - Math.random());
            const recommendedProducts = shuffledProducts.slice(0, 10);

            res.json(recommendedProducts);
        }

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

const categories = [
    `Fashion > Men's Fashion > Shirt > Men's Shirt`
];

const productName = [
    "Elegant Blue Striped Button-Up Shirt with French Cuffs",
    "Classic White Collared Dress Shirt with Pleated Front",
    "Stylish Slim Fit Long Sleeve Shirt for Formal Occasions",
    "Modern Black Oxford Shirt with Contrast Stitching Details",
    "Casual Plaid Flannel Shirt for Weekend Adventures",
    "Trendy Denim Chambray Shirt with Patch Pocket Design",
    "Formal French Cuff Dress Shirt in Fine Cotton Blend",
    "Vintage Linen Blend Button-Down with Retro Patterns",
    "Designer Printed Silk Shirt with Artistic Flair",
    "Athletic Performance Polo Shirt with Moisture-Wicking Technology",
    "Urban Checkered Button-Up Shirt with Urban Appeal",
    "Business Casual Mandarin Collar Shirt for Office Comfort",
    "Coastal Hawaiian Print Shirt for Tropical Getaways",
    "Bohemian Paisley Pattern Shirt with Boho Chic Vibes",
    "Tropical Floral Short Sleeve Shirt for Summer Style",
    "Eclectic Tie-Dye Button-Front Shirt with Funky Patterns",
    "Retro Corduroy Overshirt for Vintage Lovers",
    "Contemporary Mesh Overlay Shirt for Modern Looks",
    "Sophisticated Pinstripe Dress Shirt with Formal Touch",
    "Hipster Poplin Pocket Shirt with Urban Flair",
    "Rugged Canvas Workwear Shirt for Outdoor Enthusiasts",
    "Artisan Embroidered Linen Shirt with Handcrafted Details",
    "Mountain Plaid Outdoor Shirt for Adventure Seekers",
    "Heritage Twill Button-Up Shirt with Classic Appeal",
    "Avant-Garde Asymmetric Hem Shirt with Unique Style",
    "Minimalist Bamboo Fiber Shirt for Eco-Conscious Individuals",
    "Utility Cargo Pocket Shirt for Practical Wear",
    "Boho Batik Print Shirt with Cultural Influence",
    "Futuristic Metallic Finish Shirt for Tech Enthusiasts",
    "Romantic Lace Trim Blouse for Feminine Charm",
    "Tech-Friendly Performance Shirt for Active Lifestyles",
    "Sustainable Organic Cotton Shirt for Green Living",
    "Edgy Faux Leather Shirt with Urban Edge",
    "Cozy Fleece Lined Flannel Shirt for Cold Weather",
    "Whimsical Sequin Embellished Shirt for Evening Glamour",
    "Exotic Animal Print Shirt with Wild Personality",
    "Elegant Satin Button-Down Blouse with Sophistication",
    "Dapper Herringbone Dress Shirt for Classic Elegance",
    "Hip Hop Graphic Tee Shirt for Street Style",
    "Nomadic Linen Safari Shirt for Travelers",
    "Aviator Pilot Style Shirt for Aviation Enthusiasts",
    "Western Cowboy Plaid Shirt with Frontier Charm",
    "Elegant Ruffled Tuxedo Shirt for Formal Events",
    "Chic Silk Slip Shirt for Luxurious Comfort",
    "Formal Tuxedo Front Shirt for Black Tie Affairs",
    "Stylish Tie-Neck Blouse for Versatile Wear",
    "Glamorous Sequin Mesh Shirt for Evening Glamour",
    "Sporty Quarter Zip Pullover Shirt for Active Days",
    "Couture Sequin Embroidered Shirt for High Fashion",
    "Bohemian Crochet Lace Shirt with Artisanal Craftsmanship"
];


const imageUrls = [
    'https://product.hstatic.net/1000096703/product/1_d4c95fe0dc8a47e28b0b3d3083498997_master.jpg',
    'https://product.hstatic.net/1000378223/product/trang_5ab0b95197cb4cf68f797874c86acc8a.jpg',
    'https://product.hstatic.net/1000378223/product/xanh_d1380fae61644bd4b422874f784c29a6.jpg',
    'https://lh3.googleusercontent.com/c-xQDgA8fNBrts32FqqLrpXH0Rpp-2XdJfcWonU-GyoHv2AnjjxbNNLVxqNI_V4jnSq5o93BWp9Tm5o6NtXfwywdaZEodcRHCQ=rw',
    'https://owen.cdn.vccloud.vn/media/catalog/product/cache/d52d7e242fac6dae82288d9a793c0676/a/r/ar220852dt._79.jpg',
    'https://pos.nvncdn.com/492284-9176/ps/20230424_pA9t17NxsG.jpeg',
    'https://pos.nvncdn.com/492284-9176/ps/20230424_4KdZg4VIkG.jpeg',
    'https://tamanh.net/wp-content/uploads/2023/08/ao-so-mi-nam-tay-dai.jpg',
    'https://tunhalam.com/cdn/shop/products/image_c37028bb-cfc8-466b-a106-d1ca8ad8a323.jpg?v=1676209470',
    'https://pos.nvncdn.com/492284-9176/ps/20230510_yLZBW7ijI3.jpeg',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQWydC7RVz3nbF9y0PyI5MAgAwiv3HQxSq0YACxBN8CvWRXgq1dWzeCxe0yA2y8EL4w2I8&usqp=CAU',
    'https://rustico.vn/wp-content/uploads/2023/11/NVK-86-scaled.jpg',
    'https://rustico.vn/wp-content/uploads/2023/12/ao-so-mi-denim-Rustico-mau-den-2-scaled.jpg',
    'https://rustico.vn/wp-content/uploads/2023/11/NVK-86-scaled.jpg',
    'https://img.ws.mms.shopee.vn/dd542276f01f878a6fc68fc335a45142',
    'https://namfashion.com/home/wp-content/uploads/2022/04/ao-so-mi-dai-tay-ke-caro-dep-ha-noi-gap-nhieu-mau-cao-cap-25.jpg',
    'https://cdn0199.cdn4s.com/media/d61641d2eb8a32d46b9b.jpg',
    'https://cdn0199.cdn4s.com/media/sm178%202.jpg',
    'https://khohangsilami.vn/wp-content/uploads/2021/05/ao-so-mi-soc-cara-tay-dai-nam-mau-1.jpg',
    'https://bumshop.com.vn/wp-content/uploads/2018/11/shop-ban-ao-so-mi-nam-dep-o-tphcm-mazzola.jpg',
    'https://product.hstatic.net/1000344772/product/_s__2370_copy_e6e8d34d4f2849539c509baa259d1359_master.jpg',
    'https://yeepvn.sgp1.digitaloceanspaces.com/2023/05/vn-11134201-23020-bo4ns00znnnv8b.jpg',
    'https://cf.shopee.vn/file/d8f46ff9918876a5dc1eab29051c7b1f',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQfxEiUK3w1Ocooykmpjzb0ZBYVEzTanpiAzSNhyIY3XGYAEJTtB5_Ewde405GkjmwM5N4&usqp=CAU'
];

const videoUrl = 'https://youtu.be/Ah9zyWMPPQk';

const createRandomProduct = async (sellerId) => {
    try {
        // Generate random image URLs
        const randomImageUrls = faker.helpers.shuffle(imageUrls).slice(0, faker.number.int({ min: 5, max: 9 }));

        // Generate a random video URL
        const randomVideoUrl = faker.helpers.arrayElement([videoUrl]);


        // Generate other random product data
        const hasPrice = faker.datatype.boolean();
        const hasPriceRange = faker.datatype.boolean();
        let price = null;
        let priceRange = null;

        if (hasPrice) {
            price = faker.number.int({ min: 200000, max: 700000 });
        }

        if (!hasPrice) {
            const priceMin = faker.number.int({ min: 200000, max: 400000 });
            const priceMax = faker.number.int({ min: 200000, max: 700000 });
            priceRange = `${priceMin.toLocaleString()}đ - ${priceMax.toLocaleString()}đ`;
        }

        // Construct the product object
        const productData = {
            SellerID: sellerId,
            Name: faker.helpers.arrayElement(productName),
            Description: faker.lorem.paragraphs(10),
            Image: randomImageUrls,
            Video: randomVideoUrl,
            Category: faker.helpers.arrayElement(categories),
            Detail: {
                brand: faker.company.name(),
                organization: faker.company.name()
            },
            Price: price,
            PriceRange: priceRange,
            Quantity: faker.number.int({ min: 1, max: 100 }),
            Rating: faker.number.int({ min: 0, max: 5, precision: 0.1 }),
            Like: faker.number.int({ min: 0, max: 200 }),
            Weight: faker.number.int({ min: 100, max: 500, precision: 0.1 }),
            Height: faker.number.int({ min: 10, max: 30 }),
            Width: faker.number.int({ min: 5, max: 20 }),
            Length: faker.number.int({ min: 10, max: 30 }),
            hazardousGoods: faker.helpers.arrayElement(['Yes', 'No']),
            deliveryFee: [{
                name: faker.helpers.arrayElement(['Bulky delivery', 'Fast delivery', 'Economical delivery', 'Express delivery']),
                fee: faker.number.int({ min: 10000, max: 100000 })
            }],
            preOrderGoods: faker.helpers.arrayElement(['Yes', 'No']),
            preparationTime: faker.number.int({ min: 1, max: 5 }),
            Status: faker.helpers.arrayElement(['New', 'Old']),
            SKU: faker.string.alphanumeric(10),
            DiscountType: faker.helpers.arrayElement(['Fixed', 'Percentage']),
            DiscountValue: faker.number.int({ min: 0, max: 50 }),
            Quality: faker.helpers.arrayElement(['High', 'Medium', 'Low'])
        };

        return productData;
    } catch (error) {
        console.error('Error creating fake product:', error);
        throw error;
    }
};

const createRandomClassifyDetail = (productID) => ({
    ProductID: productID,
    Options: Array.from({ length: 3 }, () => ({
        Option1: 'Color',
        Value1: faker.color.human(),
        Option2: 'Size',
        Value2: faker.helpers.arrayElement(['S', 'M', 'L', 'XL']),
        Image: faker.helpers.arrayElement(imageUrls),
        Price: faker.number.int({ min: 200000, max: 700000 }),
        Stock: faker.number.int({ min: 1, max: 100 }),
        SKU: faker.string.alphanumeric(10)
    }))
});


async function createFakeProduct(req, res) {
    try {
        const token = req.headers.authorization;
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        if (!decodedToken) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userID = decodedToken.sub;
        const foundUser = await User.findById({ _id: mongoose.Types.ObjectId(userID) });
        const roleSeller = await Role.findOne({ name: 'seller' });

        if (!foundUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!foundUser.activeRole.equals(roleSeller._id)) {
            return res.status(403).json({ error: 'User is not a seller' });
        }

        const foundSeller = await Seller.findById({ _id: foundUser.SellerID });
        if (!foundSeller) {
            return res.status(404).json({ error: 'Seller not found' });
        }
        const productData = await createRandomProduct(foundSeller._id);
        const newProduct = new productModel(productData);
        await newProduct.save();

        const classifyDetailsData = createRandomClassifyDetail(newProduct._id);
        const newClassifyDetail = new ClassifyDetail(classifyDetailsData);
        await newClassifyDetail.save();

        res.status(200).json({ message: 'Fake product created successfully', product: newProduct });
    } catch (error) {
        console.error('Error creating fake product:', error);
        res.status(500).json({ error: 'Error creating fake product' });
    }
}

export default {
    handleFileUpload,
    handleUploadImage,
    handleUploadVideo,
    deleteImage,
    deleteVideo,
    createNewProduct,
    getProductByCategory,
    getProductByID,
    getAllProductBySellerID,
    updateProduct,
    deleteProduct,
    createNewCategory,
    getCategory,
    deleteCategory,
    getSubCategory,
    getAllSubCategory,
    addValueDetail,
    searchProduct,
    addWishList,
    getWishList,
    reviewProduct,
    getValueDetail,
    getAllDelivery,
    createDelivery,
    getClassify,
    getWholesale,
    recommendationProduct,
    createFakeProduct
};
