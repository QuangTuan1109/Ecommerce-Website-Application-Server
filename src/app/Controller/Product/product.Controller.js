const { v4: uuidv4 } = require('uuid');
const { Storage } = require('@google-cloud/storage');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken');

const User = require('../../Model/User/user.Model')
const Product = require('../../Model/Product/products.Model');
const Category = require('../../Model/Product/categories.Model');
const Seller = require('../../Model/User/seller.Model');
const ValueDetail = require('../../Model/Product/value.detail.model');
const ClassifyDetail = require('../../Model/Product/classifyDetail.Model')
const DiscountModel = require('../../Model/Product/Discount.Model');
const customerModel = require('../../Model/User/customer.Model');

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

async function createNewProduct(req, res) {
    try {
        const foundSeller = await Seller.findOne({ _id: req.params.sellerID });
        if (!foundSeller) {
            return res.status(404).json({ error: 'Seller not found' });
        }

        const { Name, Description, Category, Detail, Classify, Discount, SizeTable, Weight, Height, Length, hazardousGoods, deliveryFee, preOrderGoods, SKU, Status } = req.body;
        const videoFiles = req.files['Video'];
        const imageFiles = req.files['Image'];

        // Handle video upload
        const videoUrls = await Promise.all(videoFiles.map(async (videoFile) => {
            const videoName = uuidv4() + path.extname(videoFile.originalname);
            const videoFilePath = `videos/${videoName}`;
            await bucket.upload(videoFile.path, { destination: videoFilePath });
            return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(videoFilePath)}?alt=media`;
        }));

        // Handle image upload
        const imageUrls = await Promise.all(imageFiles.map(async (imageFile) => {
            const imageName = uuidv4() + path.extname(imageFile.originalname);
            const imagePath = `images/${imageName}`;
            await bucket.upload(imageFile.path, { destination: imagePath });
            return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(imagePath)}?alt=media`;
        }));

        const newProduct = new Product({
            SellerID: foundSeller._id,
            Name,
            Description,
            Category,
            Detail,
            SizeTable,
            Weight,
            Height,
            Length,
            hazardousGoods,
            deliveryFee,
            preOrderGoods,
            SKU,
            Status,
            Image: imageUrls,
            Video: videoUrls,
            Rating: 0,
            Like: 0,
            CreateAt: new Date(),
            UpdateAt: new Date()
        });

        await newProduct.save();

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

async function getProductByCategory(req, res) {
    try {
        const foundCategory = await Category.findOne({ _id: req.params.categoryID });
        if (!foundCategory) {
            return res.status(404).json({ message: 'Category not found' });
        }

        const products = await Product.find({ Category: foundCategory.Name });
        return res.status(200).json(products);
    } catch (error) {
        console.error('Error in getProductByCategory:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function getProductByID(req, res) {
    try {
        const productID = req.params.productID;

        const foundProduct = await Product.findById(productID);
        if (!foundProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const foundDiscounts = await DiscountModel.find({ ProductID: productID });
        const foundClassifyDetails = await ClassifyDetail.find({ ProductID: productID });

        const productWithDetails = {
            ...foundProduct.toJSON(),
            discounts: foundDiscounts,
            classifyDetails: foundClassifyDetails
        };

        return res.status(200).json(productWithDetails);
    } catch (error) {
        console.error('Error in getProductByID:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function getAllProductBySellerID(req, res) {
    try {
        const sellerProducts = await Product.find({ SellerID: req.params.sellerID });
        return res.status(200).json(sellerProducts);
    } catch (error) {
        console.error('Error in getAllProductBySellerID:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function updateProduct(req, res) {
    try {
        const { productID } = req.params;
        const updatedFields = req.body;

        const product = await Product.findByIdAndUpdate(productID, updatedFields, { new: true });

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
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

        const deletedProduct = await Product.findByIdAndDelete(productID);

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
            const parentCategory = await Category.findOne({Name: ParentCategoryID});
            if (!parentCategory) {
                return res.status(403).json({ error: 'Parent category does not exist' });
            }
            ParentCategoryID = parentCategory._id
        }

        const newCategory = new Category({ ParentCategoryID, Name, CreateAt: new Date(), UpdateAt: new Date() });
        await newCategory.save();

        return res.status(201).json({ message: 'Category created successfully' });
    } catch (error) {
        console.error('Error in createNewCategory:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function getCategory(req, res) {
    try {
        const categories = await Category.find({ ParentCategoryID: null });

        if (!categories || categories.length === 0) {
            return res.status(404).json({ message: 'No categories found' });
        }

        return res.status(200).json(categories);
    } catch (error) {
        console.error('Error in getCategory:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function deleteCategory(req, res) {
    try {
        const categoryId = req.params.categoryId;

        const category = await Category.findById(mongoose.Types.ObjectId(categoryId));

        if (!category) {
            return res.status(404).json({ message: "Category does not exist" });
        }

        await Category.deleteMany({ $or: [{ _id: categoryId }, { ParentCategoryID: categoryId }] });

        res.status(200).json({ message: "The category and all subcategories have been successfully deleted" });
    } catch (error) {
        console.error('Error in getCategory:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function getSubCategory(req, res) {
    try {
        const subCategories = await Category.find({ParentCategoryID: mongoose.Types.ObjectId(req.params.ID)});

        if (!subCategories || subCategories.length === 0) {
            return res.status(404).json({ message: 'No subcategories found' });
        }

        return res.status(200).json(subCategories);
    } catch (error) {
        console.error('Error in getSubCategory:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function addValueDetail(req, res) {
    try {
        const { CategoriesID, AttributeName, Data } = req.body;

        const newValueDetail = new ValueDetail({ CategoriesID, AttributeName, Data, CreateAt: new Date(), UpdateAt: new Date() });
        await newValueDetail.save();

        return res.status(201).json({ message: 'Value detail added successfully' });
    } catch (error) {
        console.error('Error in addValueDetail:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function searchProduct(req, res) {
    try {
        const { name, category, minPrice, maxPrice } = req.query;
        let query = {};

        if (name) {
            query.Name = { $regex: name, $options: 'i' }; // Tìm kiếm theo tên sản phẩm, không phân biệt chữ hoa chữ thường
        }
        if (category) {
            query.Category = { $regex: category, $options: 'i' }; // Tìm kiếm theo loại sản phẩm, không phân biệt chữ hoa chữ thường
        }
        if (minPrice && maxPrice) {
            query.Price = { $gte: minPrice, $lte: maxPrice }; // Tìm kiếm theo giá sản phẩm nằm trong khoảng từ minPrice đến maxPrice
        } else if (minPrice) {
            query.Price = { $gte: minPrice }; // Tìm kiếm theo giá sản phẩm lớn hơn hoặc bằng minPrice
        } else if (maxPrice) {
            query.Price = { $lte: maxPrice }; // Tìm kiếm theo giá sản phẩm nhỏ hơn hoặc bằng maxPrice
        }

        const products = await Product.find(query);

        return res.status(200).json(products);
    } catch (error) {
        console.error('Error in searchProduct:', error);
        return res.status(500).json({ message: 'Internal server error' });
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

        const customer = await customerModel.findById(mongoose.Types.ObjectId(user.customerID));
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        const product = await Product.findById(productId);

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

        const customer = await customerModel.findById(mongoose.Types.ObjectId(user.customerID));
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


module.exports = {
    handleFileUpload,
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
    addValueDetail,
    searchProduct,
    addWishList,
    getWishList,
};
