const { v4: uuidv4 } = require('uuid');
const { Storage } = require('@google-cloud/storage');
const multer = require('multer');
const path = require('path');

const ImageModel = require('../Model/image'); // Đảm bảo rằng bạn đã khai báo đúng model của bạn

const storage = new Storage({
    projectId: 'ecommerce-website-a69f9',
    keyFilename: 'C:/Users/ADMIN/Downloads/ecommerce-website-a69f9-firebase-adminsdk-9jmgt-0b36ab9a6e.json'
});

const bucketName = 'ecommerce-website-a69f9.appspot.com';
const bucket = storage.bucket(bucketName);

const storageMulter = multer.memoryStorage();

const upload = multer({ storage: storageMulter }).single('image');

const AddImage = async (req, res) => {
    try {
        upload(req, res, async function (err) {
            if (err) {
                return res.status(500).json({ message: 'Error uploading file' });
            }

            const imageFile = req.file;
            if (!imageFile) {
                return res.status(400).json({ message: 'Image file is required.' });
            }

            const imageName = imageFile.originalname;
            const imageUploadPath = `vouchers/${imageName}`;
            const file = bucket.file(imageUploadPath);
            const uploadStream = file.createWriteStream({
                metadata: {
                    contentType: imageFile.mimetype
                }
            });

            uploadStream.on('error', (error) => {
                console.error(error);
                return res.status(500).json({ message: 'Error uploading image' });
            });

            uploadStream.on('finish', async () => {
                const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(imageUploadPath)}?alt=media`;
                const newImage = new ImageModel({  // Đảm bảo rằng bạn đã thay đổi 'Voucher' thành 'ImageModel'
                    name: req.body.name,
                    image: imageUrl
                });
                try {
                    await newImage.save();
                    res.status(201).json('Successfully created voucher');
                } catch (error) {
                    return res.status(500).json({ message: 'Error saving voucher to database' });
                }
            });

            uploadStream.end(imageFile.buffer);
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

module.exports = {
    AddImage,
};
