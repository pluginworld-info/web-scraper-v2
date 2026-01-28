import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(), // Uses GOOGLE_APPLICATION_CREDENTIALS or Cloud Run identity
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
  });
}

// Connect to your specific database instance
const db = admin.firestore();
db.settings({
  databaseId: 'scraper-mailersend',
  ignoreUndefinedProperties: true,
});

export { db };