import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import sharp from 'sharp';
import { env } from '../config/env';
import { BadRequestError } from '../common/errors/http-errors';

cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
});

export interface CloudinaryUploadResult {
  publicId: string;
  url: string;
}

export async function uploadImage(
  file: Express.Multer.File,
  folder: string,
): Promise<CloudinaryUploadResult> {
  if (!file) throw new BadRequestError('No file provided');

  let bufferToUpload = file.buffer;
  if (file.mimetype !== 'image/svg+xml') {
    try {
      bufferToUpload = await sharp(file.buffer).webp({ quality: 80 }).toBuffer();
    } catch {
      bufferToUpload = file.buffer;
    }
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error || !result) {
          reject(new BadRequestError('Cloudinary upload failed'));
          return;
        }
        resolve({ publicId: result.public_id, url: result.secure_url });
      },
    );

    Readable.from(bufferToUpload).pipe(stream);
  });
}

export async function deleteImage(publicId: string): Promise<void> {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    throw new BadRequestError('Cloudinary delete failed');
  }
}

export function getUrl(publicId: string): string {
  return cloudinary.url(publicId, { secure: true });
}
