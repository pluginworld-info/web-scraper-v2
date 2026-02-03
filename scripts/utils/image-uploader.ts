import { Storage } from '@google-cloud/storage';
import axios from 'axios';
import sharp from 'sharp';
import path from 'path'; 
import fs from 'fs';

// CONFIG: Replace with your actual bucket name
const BUCKET_NAME = 'plugin-scraper-images'; 
const KEY_FILENAME = 'service-account.json';

// FORCE ABSOLUTE PATH to the key file in the root directory
const KEY_PATH = path.join(process.cwd(), KEY_FILENAME);

// 🔍 DIAGNOSTIC CHECK (Runs when server starts)
if (!fs.existsSync(KEY_PATH)) {
    console.warn(`⚠️ WARNING: '${KEY_FILENAME}' was not found at: ${KEY_PATH}`);
    console.warn("If you are on Cloud Run, images will fail unless you set GCLOUD_CREDENTIALS env var or ensure the file is included in the build.");
} else {
    console.log(`✅ Found credentials file at: ${KEY_PATH}`);
}

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

        const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${destination}`;
        return publicUrl;

    } catch (error: any) {
        // 🚨 CRITICAL UPDATE: THROW THE ERROR
        // Instead of returning null (which hides the problem), we throw it
        // so the Admin Dashboard can show the Red Error Box.
        console.error(`❌ Upload Failed (${slug}): ${error.message}`);
        throw new Error(`Upload Failed: ${error.message}`);
    }
}

// Delete image when product is removed
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
        // We don't throw here because failing to delete isn't critical enough to stop the sync
        return false;
    }
}