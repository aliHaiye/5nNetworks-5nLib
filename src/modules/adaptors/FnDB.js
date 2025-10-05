import { DATABASE_TYPE, DEFAULT_CACHE_EXPIRY } from './config.js';
import redisService from './RedisService.js';

class FnDatabaseAdapter {
    #dbInstance;

    async initialize() {
        if (!this.#dbInstance) {
            try {
                let serviceModule;
                if (DATABASE_TYPE === 'mongodb') {
                    serviceModule = await import('../database/MONGO/FnMongo.js');
                } else if (DATABASE_TYPE === 'firestore') {
                    serviceModule = await import('../database/GCP/FnFirestore.js');
                } else if (DATABASE_TYPE === 'redis') {
                    serviceModule = await import('../database/CACHE/FnRedis.js');
                } else if (DATABASE_TYPE === 'dynamodb') {
                    serviceModule = await import('../database/AWS/FnDynamoDB.js');
                } else {
                    throw new Error(`Unsupported database type: ${DATABASE_TYPE}`);
                }
                this.#dbInstance = serviceModule.default;
            } catch (error) {
                console.error('Failed to initialize database service:', error);
                throw error;
            }
        }
    }

    /**
     * Gets a single document by key from a collection, with configurable caching.
     * @param {string} collection - The name of the collection.
     * @param {object|string} key - The document ID (for Mongo/Firestore/Redis) or primary key object (for DynamoDB).
     * @param {object} [options={}] - Optional cache settings: { useCache: boolean, cacheExpiry: number }.
     * @returns {Promise<object|null>} The document data or null if not found.
     */
    async get(collection, key, options = { useCache: false, cacheExpiry: DEFAULT_CACHE_EXPIRY }) {
        const { useCache, cacheExpiry } = options;
        
        let cacheKey;
        if (typeof key === 'string') {
            cacheKey = `${collection}:${key}`;
        } else if (typeof key === 'object') {
            const keyName = Object.keys(key);
            cacheKey = `${collection}:${key[keyName]}`;
        }

        try {
            if (useCache && cacheKey) {
                const cachedData = await redisService.get(cacheKey);
                if (cachedData) {
                    console.log(`Cache hit for key: ${cacheKey}`);
                    return cachedData;
                }
            }

            if (!this.#dbInstance) await this.initialize();
            const doc = await this.#dbInstance.get(collection, key);
            
            if (doc && useCache && cacheKey) {
                await redisService.set(cacheKey, doc, cacheExpiry);
                console.log(`Stored in cache with key: ${cacheKey} (expires in ${cacheExpiry}s)`);
            }
            
            return doc;
        } catch (error) {
            console.error(`Error getting document with key: ${key}`, error);
            throw error;
        }
    }

    /**
     * Sets or updates a document and invalidates the cache.
     * @param {string} collection - The name of the collection.
     * @param {object|string} keyOrQuery - The document ID or query object (Mongo/Firestore) or entire item (DynamoDB).
     * @param {object} data - The data to set or update.
     * @returns {Promise<object>} The updated document.
     */
    async set(collection, keyOrQuery, data) {
        let cacheKey;

        try {
            if (!this.#dbInstance) await this.initialize();

            let updatedDoc;
            if (DATABASE_TYPE === 'dynamodb') {
                updatedDoc = await this.#dbInstance.set(collection, data);
                const keyName = Object.keys(data);
                cacheKey = `${collection}:${data[keyName]}`;
            } else {
                updatedDoc = await this.#dbInstance.set(collection, keyOrQuery, data);
                if (updatedDoc && updatedDoc._id) {
                    cacheKey = `${collection}:${updatedDoc._id.toString()}`;
                } else if (updatedDoc && updatedDoc.id) {
                    cacheKey = `${collection}:${updatedDoc.id}`;
                } else if (typeof keyOrQuery === 'string') {
                    cacheKey = `${collection}:${keyOrQuery}`;
                }
            }

            if (cacheKey) {
                // Update cache with fresh data using the default expiry
                await redisService.set(cacheKey, updatedDoc, DEFAULT_CACHE_EXPIRY);
                console.log(`Updated cache for key: ${cacheKey} (expires in ${DEFAULT_CACHE_EXPIRY}s)`);
            }

            return updatedDoc;
        } catch (error) {
            console.error('Error setting document:', error);
            throw error;
        }
    }

    /**
     * Fetches documents from a collection, optionally filtered (no caching).
     * @param {string} collection - The name of the collection.
     * @param {object} [filters={}] - Optional filters.
     * @returns {Promise<Array<object>>} An array of documents.
     */
    async fetch(collection, filters = {}) {
        if (!this.#dbInstance) await this.initialize();
        return this.#dbInstance.fetch(collection, filters);
    }
}

const databaseAdapterInstance = new FnDatabaseAdapter();
export default databaseAdapterInstance;
