// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {getFirestore} from 'firebase/firestore'

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBn31nyGLI2NwLLZ7eKfq7ODwVSlGmfYJM",
  authDomain: "inventory-management-2697a.firebaseapp.com",
  projectId: "inventory-management-2697a",
  storageBucket: "inventory-management-2697a.appspot.com",
  messagingSenderId: "777311736799",
  appId: "1:777311736799:web:93471ba32df9df17852a6a",
  measurementId: "G-QWFY4JGHBT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

export{firestore}

