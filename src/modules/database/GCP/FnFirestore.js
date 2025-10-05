import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import serviceAccount from './serviceAccountKey.json' assert { type: 'json' };

/**
 * The internal class implementation.
 */
class FnFirestoreService {
    #db;
    constructor() {
        if (!serviceAccount || !serviceAccount.private_key) {
            throw new Error('Service account key is missing or invalid.');
        }

        // Initialize Firebase Admin SDK only once
        if (!initializeApp.length) {
            initializeApp({
                credential: cert(serviceAccount)
            });
        }
        this.#db = getFirestore();
    }

    // --- All original methods (get, set, fetch) remain the same ---
    
    async get(collection, docId) {
        try {
            const docRef = this.#db.collection(collection).doc(docId);
            const docSnapshot = await docRef.get();
            if (!docSnapshot.exists) {
                console.log(`No document found with ID: ${docId} in collection: ${collection}`);
                return null;
            }
            return { id: docSnapshot.id, ...docSnapshot.data() };
        } catch (error) {
            console.error('Error getting document:', error);
            throw error;
        }
    }

    async set(collection, docId, data) {
        try {
            const docRef = this.#db.collection(collection).doc(docId);
            await docRef.set(data, { merge: true });
            console.log(`Document with ID: ${docId} successfully set/updated in collection: ${collection}`);
        } catch (error) {
            console.error('Error setting document:', error);
            throw error;
        }
    }

    async fetch(collection, filters = []) {
        try {
            let collectionRef = this.#db.collection(collection);

            for (const filter of filters) {
                collectionRef = collectionRef.where(filter.field, filter.op, filter.value);
            }

            const snapshot = await collectionRef.get();
            if (snapshot.empty) {
                console.log('No matching documents found.');
                return [];
            }

            const documents = [];
            snapshot.forEach(doc => {
                documents.push({ id: doc.id, ...doc.data() });
            });
            return documents;
        } catch (error) {
            console.error('Error fetching documents:', error);
            throw error;
        }
    }
}

// Instantiate the class once and export that instance.
const instance = new FnFirestoreService();
export default instance;

/*  example usage

// Import the singleton instance directly
import firestore from './FirestoreService.js';

const run = async () => {
    try {
        // You no longer need to instantiate it with `new`
        
        // --- Set/Create a document ---
        await firestore.set('users', 'user123', {
            name: 'John Doe',
            email: 'john.doe@example.com',
            age: 30
        });

        // --- Get a single document ---
        const user = await firestore.get('users', 'user123');
        if (user) {
            console.log('Fetched single user:', user);
        }

        // --- Fetch/Search documents with filters ---
        const filteredUsers = await firestore.fetch('users', [
            { field: 'age', op: '>', value: 25 },
            { field: 'name', op: '==', value: 'John Doe' }
        ]);
        console.log('Fetched filtered users:', filteredUsers);

        // --- Fetch all documents in a collection ---
        const allUsers = await firestore.fetch('users');
        console.log('Fetched all users:', allUsers);

    } catch (error) {
        console.error('An error occurred during Firestore operations:', error);
    }
};

run();

*/