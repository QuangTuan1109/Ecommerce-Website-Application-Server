const { v4: uuidv4 } = require('uuid');
const { Storage } = require('@google-cloud/storage');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken');

const User = require('../../Model/User/user.Model')
const Role = require('../../Model/User/role.Model')
const Product = require('../../Model/Product/products.Model');
const Categories = require('../../Model/Product/categories.Model');
const Seller = require('../../Model/User/seller.Model');
const ValueDetail = require('../../Model/Product/value.detail.model');
const ClassifyDetail = require('../../Model/Product/classifyDetail.Model')
const DiscountModel = require('../../Model/Product/Discount.Model');
const customerModel = require('../../Model/User/customer.Model');
const Review = require('../../Model/Product/review.Model')
const Order = require('../../Model/Order/order.Model')
const Delivery = require('../../Model/Product/Delivery.Model')

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

    // Handle video upload
    const videoUrls = await Promise.all(videoFiles.map(async (videoFile) => {
        const videoName = uuidv4() + path.extname(videoFile.originalname);
        const videoFilePath = `videos/${videoName}`;
        await bucket.upload(videoFile.path, { destination: videoFilePath });
        return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(videoFilePath)}?alt=media`;
    }));

    return res.status(200).json({ data: videoUrls});

}

async function handleUploadImage(req, res) {
    const imageFiles = req.files['Image'];

    // Handle image upload
    const imageUrls = await Promise.all(imageFiles.map(async (imageFile) => {
        const imageName = uuidv4() + path.extname(imageFile.originalname);
        const imagePath = `images/${imageName}`;
        await bucket.upload(imageFile.path, { destination: imagePath });
        return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(imagePath)}?alt=media`;
    }));

    return res.status(200).json({ data: imageUrls});

}

async function deleteFile(filePath) {
    try {
        await bucket.file(filePath).delete();
        console.log('File deleted successfully.');
    } catch (error) {
        console.error('Error deleting file:', error);
        throw error; // Ném lỗi nếu có lỗi xảy ra để xử lý ở nơi gọi hàm
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

        if (Classify && Classify.length > 0) {
            const prices = Classify.map(option => option.Price);
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
           
            if (minPrice === maxPrice) {
                productPrice = `${minPrice.toLocaleString()}đ`;
            } else {
                productPrice = `${minPrice.toLocaleString()}đ - ${maxPrice.toLocaleString()}đ`;
            }
        }

        const newProduct = new Product({
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
            Price,
            PriceRange: productPrice, 
            Quantity,
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
        const { deliveryMethod, deliveryFees,weightLimit, sizeLimit } = req.body;

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
        const foundCategory = await Categories.findOne({ _id: req.params.categoryID });
        if (!foundCategory) {
            return res.status(404).json({ message: 'Category not found' });
        }

        const regex = new RegExp(`.*${foundCategory.Name}.*`);
        const products = await Product.find({ Category: { $regex: regex } });

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
        
        return res.status(200).json(productsWithDetails);
    } catch (error) {
        console.error('Error in getProductByCategory:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function getProductByID(req, res) {
    try {
        const productId = req.params.productID;

        const foundProduct = await Product.findById({_id: mongoose.Types.ObjectId(productId)});
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
        const foundUser= await User.findOne({ _id:  req.params.userID })

        if (foundUser) {
            const sellerProducts = await Product.find({ SellerID: foundUser.SellerID });
            const products = [];
            
            for (var i = 0; i < sellerProducts.length; i++ ) {
                const product = sellerProducts[i];
                const getClassify = await ClassifyDetail.findOne({ProductID: product._id})
                
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
            return res.status(200).json({data: products});
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
        const product = await Product.findByIdAndUpdate(productID, { ...productUpdates, updatedAt: Date.now() }, { new: true });

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check and update Classify if exists
        const classifyRecord = await ClassifyDetail.findOne({ ProductID: mongoose.Types.ObjectId(productID) });

            if (classifyRecord) {
                if (classifyData) {
                    await ClassifyDetail.findByIdAndUpdate(
                        classifyRecord._id,
                        { $set: {
                            Options: classifyData,
                            updatedAt: Date.now() 
                        } },
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
                        { $set: {
                            Value: discountData, 
                            updatedAt: Date.now() 
                        } },
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
            const parentCategory = await Categories.findOne({Name: ParentCategoryID});
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
        const subCategories = await Categories.find({ParentCategoryID: mongoose.Types.ObjectId(req.params.ID)});

        if (!subCategories || subCategories.length === 0) {
            return res.status(404).json({ message: 'No subcategories found' });
        }

        return res.status(200).json({data: subCategories});
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

module.exports = {
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
    getWholesale
};