import { Storage } from '@google-cloud/storage';
import axios from 'axios';
import sharp from 'sharp';
import path from 'path'; 

// CONFIG: Replace with your actual bucket name
const BUCKET_NAME = 'plugin-scraper-images'; 

// FORCE ABSOLUTE PATH to the key file in the root directory
const KEY_PATH = path.join(process.cwd(), 'service-account.json');

const storage = new Storage({ keyFilename: KEY_PATH });
const bucket = storage.bucket(BUCKET_NAME);

export async function processAndUploadImage(imageUrl: string, slug: string): Promise<string | null> {
    try {
        if (!imageUrl) return null;

        // 1. Download
        const response = await axios({ url: imageUrl, responseType: 'arraybuffer', timeout: 15000 });
        const buffer = Buffer.from(response.data);

        // 2. Optimize (WebP + Resize + Trim)
        // INCREASED QUALITY: 1200px width and 90% quality for crisp retina displays
        const optimizedBuffer = await sharp(buffer)
            .trim() // Removes transparent whitespace around the image
            .resize({ 
                width: 1200, 
                withoutEnlargement: true, 
                fit: 'inside' // Ensures aspect ratio is preserved
            })
            .webp({ quality: 90 }) 
            .toBuffer();

        // 3. Upload
        const destination = `products/${slug}.webp`;
        const file = bucket.file(destination);

        await file.save(optimizedBuffer, {
            contentType: 'image/webp',
            resumable: false
        });

        return `https://storage.googleapis.com/${BUCKET_NAME}/${destination}`;

    } catch (error: any) {
        console.error(`      ❌ Image Error (${slug}): ${error.message}`);
        return null;
    }
}

// ✅ NEW: Delete image when product is removed
export async function deleteImageFromBucket(slug: string): Promise<boolean> {
    try {
        const destination = `products/${slug}.webp`;
        const file = bucket.file(destination);

        // Check if file exists before trying to delete to avoid 404 errors
        const [exists] = await file.exists();
        if (exists) {
            await file.delete();
            console.log(`🗑️ Deleted image: ${destination}`);
        }
        return true;
    } catch (error: any) {
        console.error(`⚠️ Failed to delete image for ${slug}:`, error.message);
        return false;
    }
}