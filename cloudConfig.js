const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name:process.env.CLOUDE_NAME,
    api_key:process.env.CLOUDE_API_KEY,
    api_secret:process.env.CLOUDE_API_SECRATE

})
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'wanderlust_DEV',
      allowedFormats: async (req, file) =>['jpg','png','jpeg']
     
    },
  });

  module.exports={
    cloudinary,
    storage
  }