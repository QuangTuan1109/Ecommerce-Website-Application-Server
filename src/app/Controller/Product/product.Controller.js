const { v4: uuidv4 } = require('uuid');
const { Storage } = require('@google-cloud/storage');
const multer = require('multer');
const path = require('path');

const Product = require('../../Model/Product/products.Model');
const Category = require('../../Model/Product/categories.Model');
const Seller = require('../../Model/User/seller.Model');
const ValueDetail = require('../../Model/Product/value.detail.model');

const storage = new Storage({
    projectId: 'ecommerce-website-a69f9',
    keyFilename: 'C:/Users/ADMIN/Downloads/ecommerce-website-a69f9-firebase-adminsdk-9jmgt-a92462f6d3.json'
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

        const { Name, Description, Category, Detail, Classify, Discount, SizeTable, Weight, Heigh, Length, hazardousGoods, deliveryFee, preOrderGoods, SKU, Status } = req.body;
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
            Classify,
            Discount,
            SizeTable,
            Weight,
            Heigh,
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
        const foundProduct = await Product.findById(req.params.productID);
        if (!foundProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }

        return res.status(200).json(foundProduct);
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

        const foundCategory = await Category.findOne({ Name });
        if (foundCategory) {
            return res.status(403).json({ error: 'The category already exists in the system' });
        }

        if (ParentCategoryID) {
            const parentCategory = await Category.findById(ParentCategoryID);
            if (!parentCategory) {
                return res.status(403).json({ error: 'Parent category does not exist' });
            }
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

async function getSubCategory(req, res) {
    try {
        const subCategories = await Category.find({ ParentCategoryID: req.params.ID });

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
    getSubCategory,
    addValueDetail,
};
