const { initializeTestEnvironment } = require("@firebase/rules-unit-testing");
const fs = require("fs");

async function runTest() {
  const testEnv = await initializeTestEnvironment({
    projectId: "demo-test",
    firestore: {
      rules: fs.readFileSync("firestore.rules", "utf8"),
    },
  });

  const alice = testEnv.authenticatedContext("alice", { email: "leaog.8@gmail.com" });
  
  try {
    const db = alice.firestore();
    const snapshot = await db.collection("characters").get();
    console.log("SUCCESS: Characters read allowed");
  } catch (err) {
    console.error("ERROR: Characters read denied:", err.message);
  }

  await testEnv.cleanup();
}

runTest();
