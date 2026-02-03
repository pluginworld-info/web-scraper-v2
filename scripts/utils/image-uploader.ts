import { Storage } from '@google-cloud/storage';
import axios from 'axios';
import sharp from 'sharp';
import path from 'path'; 
import fs from 'fs';

// CONFIG
const BUCKET_NAME = 'plugin-scraper-images'; 

// 🛑 GLOBAL VARIABLES (Initialize as null)
// We do NOT create the connection here anymore to prevent Build crashes.
let storageInstance: Storage | null = null;
let bucketInstance: any = null; 

// ✅ LAZY INITIALIZATION FUNCTION
// This function will only run when you actually click "Sync", 
// ensuring the Build process doesn't crash.
function getStorage() {
    if (storageInstance && bucketInstance) {
        return { storage: storageInstance, bucket: bucketInstance };
    }

    // 1. Check for Env Variable (Cloud Run)
    if (process.env.GCLOUD_CREDENTIALS) {
        try {
            console.log("🔐 Authenticating via GCLOUD_CREDENTIALS...");
            const credentials = JSON.parse(process.env.GCLOUD_CREDENTIALS);
            storageInstance = new Storage({ credentials });
        } catch (e) {
            throw new Error("Invalid GCLOUD_CREDENTIALS variable");
        }
    } 
    // 2. Check for Local File (Development)
    else {
        const keyPath = path.join(process.cwd(), 'service-account.json');
        
        if (fs.existsSync(keyPath)) {
            console.log(`📂 Found local key file at: ${keyPath}`);
            storageInstance = new Storage({ keyFilename: keyPath });
        } else {
            // 3. If neither exists, WE CRASH HERE (But only at Runtime!)
            throw new Error("CRITICAL: No Authentication found. Set GCLOUD_CREDENTIALS var or add service-account.json");
        }
    }

    bucketInstance = storageInstance.bucket(BUCKET_NAME);
    return { storage: storageInstance, bucket: bucketInstance };
}

export async function processAndUploadImage(imageUrl: string, slug: string): Promise<string | null> {
    try {
        if (!imageUrl) return null;

        // 🚀 CONNECT TO STORAGE NOW (Not at build time)
        const { bucket } = getStorage();

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
        // 🚀 CONNECT TO STORAGE NOW
        const { bucket } = getStorage();
        
        const destination = `products/${slug}.webp`;
        const file = bucket.file(destination);
        const [exists] = await file.exists();
        if (exists) await file.delete();
        return true;
    } catch (error: any) {
        return false;
    }
}