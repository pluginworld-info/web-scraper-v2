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
        const response = await axios({ url: imageUrl, responseType: 'arraybuffer', timeout: 10000 });
        const buffer = Buffer.from(response.data);

        // 2. Optimize (WebP + Resize)
        const optimizedBuffer = await sharp(buffer)
            .resize({ width: 800, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();

        // 3. Upload
        const destination = `products/${slug}.webp`;
        const file = bucket.file(destination);

        // FIX: Removed "public: true" because we use Uniform Bucket Access
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