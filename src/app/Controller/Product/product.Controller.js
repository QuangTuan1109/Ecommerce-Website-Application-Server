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
        const foundUser = await User.findById({_id: mongoose.Types.ObjectId(userID)})
        const roleSeller = await Role.findOne({name: 'seller'})

        if ((foundUser.activeRole).equals(roleSeller._id)) {
            var foundSeller = await Seller.findById({_id: foundUser.SellerID})
        }
        if (!foundSeller) {
            return res.status(404).json({ error: 'Seller not found' });
        }

        const { Name, Description, Video, Image, Category, Detail, Classify, Discount, SizeTable,
                Weight, Height, Length, deliveryFee, preOrderGoods,
                Price, Quantity, Width, SKU, Status } = req.body;

        const categories = Category.split(' > ');

        let parentCategory = null;
        for (let i = 0; i < categories.length; i++) {
            const categoryName = categories[i];
            const foundCategory = await Categories.findOne({ Name: categoryName });

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

        const newProduct = new Product({
            SellerID: foundSeller._id,
            Name,
            Description,
            Category,
            Detail,
            SizeTable,
            Weight,
            Width,
            Height,
            Length,
            deliveryFee,
            preOrderGoods,
            SKU,
            Status,
            Price,
            Quantity,
            Image,
            Video,
            Rating: 0,
            Like: 0,
            CreateAt: new Date(),
            UpdateAt: new Date()
        });

        if(Detail) {
            const detailKeys = Object.keys(Detail)

            for (let key of detailKeys) {
                const foundValueDetails = await ValueDetail.findOne({
                    AttributeName: key
                });

                if (!foundValueDetails.categoryPaths.includes(Category) ) {
                    return res.status(404).json({ error: `${key} is not suitable for ${foundCategory.Name}` });
                }   
            }
        }

       await newProduct.save();

        if (Classify && (Price && Quantity == null || '')) {
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

        const getAllSubcategories = async (category, parentPath = '') => {
            let paths = [];
            const currentPath = parentPath ? `${parentPath} > ${category.Name}` : category.Name;
            paths.push(currentPath);
            const subcategories = await Categories.find({ ParentCategoryID: category._id });
            if (subcategories.length > 0) {
                for (let subcategory of subcategories) {
                    const subPaths = await getAllSubcategories(subcategory, currentPath);
                    paths = paths.concat(subPaths);
                }
            }
            return paths;
        };

        const subcategoryPaths = await getAllSubcategories(parentCategory);

        return res.json({ paths: subcategoryPaths });
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
    createDelivery
};
