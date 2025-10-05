import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'your_mongodb_connection_uri';
const DB_NAME = 'your_database_name';

if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable.');
}

class FnMongoService {
    #db; // Define the private field

    constructor() {
        this.client = new MongoClient(MONGODB_URI);
        this.#db = null;
        this.connect();
    }
    async connect() {
        if (!this.#db) {
            try {
                await this.client.connect();
                this.#db = this.client.db(DB_NAME); // Assign to the private field
                console.log('MongoDB native driver connected successfully.');
            } catch (error) {
                console.error('Error connecting to MongoDB:', error);
                process.exit(1);
            }
        }
        return this.#db;
    }

    async get(collectionName, docId) {
        try {
            await this.connect(); // Ensure connection is ready
            const collection = this.#db.collection(collectionName); // Reference the private field
            const doc = await collection.findOne({ _id: new ObjectId(docId) });
            return doc;
        } catch (error) {
            console.error(`Error getting document with ID: ${docId}`, error);
            throw error;
        }
    }
    // ... other methods using this.#db
}

const instance = new FnMongoService();
export default instance;
