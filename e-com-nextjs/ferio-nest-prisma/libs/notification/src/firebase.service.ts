import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);
  private firebaseInitialized = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (this.firebaseInitialized) return;

    try {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (!projectId || !clientEmail || !privateKey) {
        this.logger.warn('⚠️ Firebase credentials not found in env. Push notifications will be disabled.');
        return;
      }

      if (admin.apps.length === 0) {
        const serviceAccount: admin.ServiceAccount = {
          projectId,
          clientEmail,
          privateKey,
        };

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        this.logger.log('✅ Firebase Admin SDK initialized');
      }
      this.firebaseInitialized = true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown initialization error';
      this.logger.warn(`⚠️ Failed to initialize Firebase Admin SDK: ${message}`);
    }
  }

  async sendPushNotification(
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!this.firebaseInitialized) {
      this.logger.warn('⚠️ Push notification skipped (Firebase Admin SDK not initialized)');
      return;
    }
    try {
      const message: admin.messaging.Message = {
        token: fcmToken,
        notification: { title, body },
        data: data || {},
      };
      await admin.messaging().send(message);
      this.logger.log(`✅ Push notification sent to ${fcmToken}`);
    } catch (error) {
      this.logger.error('❌ Error sending push notification:', error);
    }
  }
}
