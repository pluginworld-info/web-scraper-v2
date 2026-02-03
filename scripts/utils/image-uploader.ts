import { Storage } from '@google-cloud/storage';
import axios from 'axios';
import sharp from 'sharp';
import path from 'path'; 
import fs from 'fs';

// CONFIG
const BUCKET_NAME = 'plugin-scraper-images'; 

// 1. Initialize Storage (Prioritize Env Variable, Fallback to File)
let storage: Storage;

// Option A: Cloud Run (Secure)
if (process.env.GCLOUD_CREDENTIALS) {
    try {
        console.log("🔐 Authenticating via GCLOUD_CREDENTIALS environment variable...");
        const credentials = JSON.parse(process.env.GCLOUD_CREDENTIALS);
        storage = new Storage({ credentials });
    } catch (e) {
        console.error("❌ Failed to parse GCLOUD_CREDENTIALS JSON");
        throw new Error("Invalid GCLOUD_CREDENTIALS variable");
    }
} 
// Option B: Local Dev (File)
else {
    const keyPath = path.join(process.cwd(), 'service-account.json');
    console.log(`📂 Checking for local key file at: ${keyPath}`);
    
    if (fs.existsSync(keyPath)) {
        storage = new Storage({ keyFilename: keyPath });
    } else {
        // If neither exists, we must crash so the error box shows up
        throw new Error("CRITICAL: No Authentication found. Set GCLOUD_CREDENTIALS var or add service-account.json");
    }
}

const bucket = storage.bucket(BUCKET_NAME);

export async function processAndUploadImage(imageUrl: string, slug: string): Promise<string | null> {
    try {
        if (!imageUrl) return null;

        // 1. Download
        const response = await axios({ url: imageUrl, responseType: 'arraybuffer', timeout: 15000 });
        const buffer = Buffer.from(response.data);

        // 2. Optimize
        const optimizedBuffer = await sharp(buffer)
            .trim()
            .resize({ width: 1200, withoutEnlargement: true, fit: 'inside' })
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
        console.error(`❌ Upload Failed (${slug}): ${error.message}`);
        throw new Error(`Upload Failed: ${error.message}`);
    }
}

export async function deleteImageFromBucket(slug: string): Promise<boolean> {
    try {
        const destination = `products/${slug}.webp`;
        const file = bucket.file(destination);
        const [exists] = await file.exists();
        if (exists) await file.delete();
        return true;
    } catch (error: any) {
        return false;
    }
}