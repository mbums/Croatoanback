import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import admin from 'firebase-admin';
import stripeRoutes from './routes/stripeRoutes.js';

dotenv.config();

// Firebase initialize karo
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
  universe_domain: "googleapis.com"
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Weekly points cron job - Har Sunday midnight (Pakistan time)
cron.schedule('0 0 * * 0', async () => {
  try {
    
    const usersRef = admin.firestore().collection('user1');
    const snapshot = await usersRef
      .where('premium', '==', true)
      .where('subscriptionEnd', '>', new Date())
      .get();


    const batch = admin.firestore().batch();
    let updatedCount = 0;

    snapshot.forEach((doc) => {
      const user = doc.data();
      let pointsToAdd = 0;
      
      // Plan type ke hisab se points set karo
      switch (user.subscriptionType) {
        case 'weekly':
          pointsToAdd = 10;
          break;
        case 'monthly':
          pointsToAdd = 25;
          break;
        case 'yearly':
          pointsToAdd = 50;
          break;
        default:
          pointsToAdd = 25; // Default monthly
      }
      
      if (pointsToAdd > 0) {
        const currentPoints = user.points || 0;
        const newPoints = currentPoints + pointsToAdd;
        
        batch.update(doc.ref, { 
          points: newPoints,
          lastPointsAdded: admin.firestore.FieldValue.serverTimestamp()
        });
        
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      await batch.commit();
    } else {
    }
  } catch (error) {
  }
}, {
  timezone: "Asia/Karachi" // Pakistan time zone
});

// Manual trigger endpoint - Testing ke liye
app.get('/api/trigger-weekly-points', async (req, res) => {
  try {
    
    const usersRef = admin.firestore().collection('user1');
    const snapshot = await usersRef
      .where('premium', '==', true)
      .where('subscriptionEnd', '>', new Date())
      .get();

    const batch = admin.firestore().batch();
    let updatedCount = 0;

    snapshot.forEach((doc) => {
      const user = doc.data();
      let pointsToAdd = 0;
      
      switch (user.subscriptionType) {
        case 'weekly':
          pointsToAdd = 10;
          break;
        case 'monthly':
          pointsToAdd = 25;
          break;
        case 'yearly':
          pointsToAdd = 50;
          break;
        default:
          pointsToAdd = 25;
      }
      
      if (pointsToAdd > 0) {
        const currentPoints = user.points || 0;
        const newPoints = currentPoints + pointsToAdd;
        
        batch.update(doc.ref, { 
          points: newPoints,
          lastPointsAdded: admin.firestore.FieldValue.serverTimestamp()
        });
        
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      await batch.commit();
      res.json({ 
        success: true, 
        message: `Points added to ${updatedCount} users successfully`,
        updatedCount 
      });
    } else {
      res.json({ 
        success: true, 
        message: 'No users eligible for points',
        updatedCount: 0 
      });
    }
  } catch (error) {
    console.error('Error in manual trigger');
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running with weekly points cron job',
    timestamp: new Date().toISOString(),
    features: {
      stripe: 'Active',
      cronJob: 'Active - Weekly points every Sunday midnight',
      firebase: 'Connected'
    }
  });
});

// Routes
app.use('/api', stripeRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Stripe Server Running!',
    cronJob: 'Weekly points system active',
    endpoints: {
      health: '/health',
      manualTrigger: '/api/trigger-weekly-points',
      stripe: '/api/create-checkout-session'
    }
  });
});

app.listen(PORT, () => {
});