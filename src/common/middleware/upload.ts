import multer from 'multer';

const IMAGE_UPLOAD_LIMITS = { fileSize: 5 * 1024 * 1024 };

const upload = multer({ storage: multer.memoryStorage(), limits: IMAGE_UPLOAD_LIMITS });

export const uploadSingleImage = upload.single('image');
export const uploadImages = upload.array('images', 5);
