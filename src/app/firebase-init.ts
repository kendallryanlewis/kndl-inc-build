// src/app/firebase-init.ts
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyDciq_4bsS_3vDdxElIkvbbMO_j8zC4txo",
    authDomain: "kndl-3663b.firebaseapp.com",
    projectId: "kndl-3663b",
    storageBucket: "kndl-3663b.firebasestorage.app",
    messagingSenderId: "363681629994",
    appId: "1:363681629994:web:5ca220294c3cb0ee3e4053",
    measurementId: "G-CGGZ63SWW1"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);