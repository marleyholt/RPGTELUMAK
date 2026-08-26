const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc } = require('firebase/firestore');
const firebaseConfigLocal = require('./firebase-applet-config.json');

const firebaseConfig = {
  apiKey: firebaseConfigLocal.apiKey,
  authDomain: firebaseConfigLocal.authDomain,
  projectId: firebaseConfigLocal.projectId,
  storageBucket: firebaseConfigLocal.storageBucket,
  messagingSenderId: firebaseConfigLocal.messagingSenderId,
  appId: firebaseConfigLocal.appId,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfigLocal.firestoreDatabaseId || undefined);

async function fixNames() {
  const querySnapshot = await getDocs(collection(db, 'npcs'));
  querySnapshot.forEach(async (document) => {
    const data = document.data();
    if (!data.name && data.nome) {
      console.log(`Fixing doc ${document.id}: nome -> name`);
      await updateDoc(doc(db, 'npcs', document.id), {
        name: data.nome
      });
    } else if (!data.name) {
      console.log(`Fixing doc ${document.id}: missing name`);
      await updateDoc(doc(db, 'npcs', document.id), {
        name: 'Sem Nome'
      });
    }
  });
  console.log("Done");
}

fixNames();
