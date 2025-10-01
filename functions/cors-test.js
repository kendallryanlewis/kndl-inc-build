const functions = require('firebase-functions');
const cors = require('cors')({
    origin: [
        'http://localhost:4200',
        'http://127.0.0.1:4200',
        'https://kndl-3663b.web.app',
        'https://kndl-3663b.firebaseapp.com'
    ],
    credentials: true
});

// Simple HTTP function to test CORS
exports.testCors = functions.https.onRequest((req, res) => {
    return cors(req, res, () => {
        res.json({
            success: true,
            message: 'CORS is working!',
            timestamp: new Date().toISOString()
        });
    });
});