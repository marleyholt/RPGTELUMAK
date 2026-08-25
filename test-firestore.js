const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
  projectId: "finlhub",
  apiKey: "AIzaSyAWsiRWFynuzmmVWtijPPugnZiA27Kus5I",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function run() {
  try {
    const snap = await getDocs(collection(db, 'characters'));
    console.log("Docs:", snap.docs.length);
  } catch(e) {
    console.error("Error:", e.message);
  }
}
run();
