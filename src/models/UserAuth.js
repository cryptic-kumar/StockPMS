// src/models/UserAuth.js
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export class UserAuth {
  // Save data to Firebase Cloud Firestore
  static async savePortfolio(uid, serializedData) {
    try {
      const userRef = doc(db, "users", uid);
      // 'merge: true' ensures we update the document without deleting other fields
      await setDoc(userRef, { portfolioData: serializedData }, { merge: true });
    } catch (error) {
      console.error("Error saving to cloud database:", error);
    }
  }

  // Retrieve data from Firebase Cloud Firestore
  static async getUserPortfolio(uid) {
    try {
      const userRef = doc(db, "users", uid);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        return docSnap.data().portfolioData;
      }
      return null;
    } catch (error) {
      console.error("Error fetching from cloud database:", error);
      return null;
    }
  }
}
