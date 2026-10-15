import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { getAuth, fetchSignInMethodsForEmail } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBUd4q19huYhVmL0lKXWIJuLmB0j1TzEGM",
  authDomain: "notion-f316c.firebaseapp.com",
  projectId: "notion-f316c",
  storageBucket: "notion-f316c.firebasestorage.app",
  messagingSenderId: "1029865359819",
  appId: "1:1029865359819:web:208482b174ffe214b88e4e"
};

console.log("=== RevRecovery OS Live Firebase Diagnostics ===");
console.log("1. Initializing Firebase App...");
const app = initializeApp(firebaseConfig);
console.log("✓ Firebase App initialized. App Name:", app.name);

console.log("\n2. Testing Firebase Authentication...");
const auth = getAuth(app);
try {
  const methods = await fetchSignInMethodsForEmail(auth, "test@revrecovery.io");
  console.log("✓ Auth service contacted successfully. Configured methods:", methods);
} catch (authErr) {
  console.log("Auth probe result:", authErr.code, authErr.message);
}

console.log("\n3. Testing Cloud Firestore Connection...");
const db = getFirestore(app);
try {
  console.log("Attempting to probe Firestore /system/ping...");
  const probeRef = doc(db, "system", "ping");
  const snap = await getDoc(probeRef);
  console.log("✓ Firestore read succeeded! Document exists:", snap.exists());

  // Attempt test write
  console.log("Attempting to write test probe to /system/connectivity_test...");
  const testRef = doc(db, "system", "connectivity_test");
  await setDoc(testRef, { timestamp: Date.now(), source: "revrecovery_os_connection_test" });
  console.log("✓ Firestore write succeeded!");

  // Clean up test probe
  await deleteDoc(testRef);
  console.log("✓ Firestore test probe cleaned up!");
} catch (dbErr) {
  console.log("Firestore error code:", dbErr.code);
  console.log("Firestore error message:", dbErr.message);
}
