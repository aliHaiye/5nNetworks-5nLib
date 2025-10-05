import Redis from 'ioredis';

// Define the cluster startup nodes. ioredis will discover the rest.
const REDIS_CLUSTER_NODES = [
    { host: 'your_cluster_node_1_host', port: 6379 },
    { host: 'your_cluster_node_2_host', port: 6379 },
    // Add more nodes for initial connection discovery
];

// Configure the connection options
const REDIS_OPTIONS = {
    // Add your cluster options here (e.g., password)
    password: process.env.REDIS_PASSWORD,
    // Other options for resilience
    retryStrategy: (times) => Math.min(times * 50, 2000),
    maxRetriesPerRequest: 1,
    enableTLS: false, // Set to true if using TLS
};

class FnRedisService {
    #client;

    constructor() {
        this.connect();
    }

    async connect() {
        if (!this.#client || !this.#client.status) {
            try {
                this.#client = new Redis.Cluster(REDIS_CLUSTER_NODES, REDIS_OPTIONS);
                
                // Add error handling
                this.#client.on('error', (err) => console.error('Redis Cluster Error', err));
                
                await new Promise((resolve, reject) => {
                    this.#client.on('ready', () => {
                        console.log('Redis Cluster connected successfully.');
                        resolve();
                    });
                    this.#client.on('error', (err) => {
                        reject(err);
                    });
                });

            } catch (error) {
                console.error('Error connecting to Redis Cluster:', error);
                process.exit(1);
            }
        }
        return this.#client;
    }

    /**
     * Gets data from Redis by key.
     * @param {string} key - The key of the data to retrieve.
     * @returns {Promise<string|null>} The stored data as a string, or null if not found.
     */
    async get(key) {
        try {
            const client = await this.connect();
            const data = await client.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`Error getting data for key: ${key}`, error);
            throw error;
        }
    }

    /**
     * Sets data in Redis with a key and optional expiration.
     * @param {string} key - The key to store the data under.
     * @param {object} data - The data to store.
     * @param {number} [expiresInSeconds] - Optional expiration time in seconds.
     * @returns {Promise<void>}
     */
    async set(key, data, expiresInSeconds) {
        try {
            const client = await this.connect();
            const serializedData = JSON.stringify(data);
            if (expiresInSeconds) {
                await client.set(key, serializedData, 'EX', expiresInSeconds);
            } else {
                await client.set(key, serializedData);
            }
            console.log(`Key "${key}" successfully set in Redis Cluster.`);
        } catch (error) {
            console.error(`Error setting data for key: ${key}`, error);
            throw error;
        }
    }

    /**
     * Fetches keys from Redis that match a pattern.
     * Note: `KEYS` is a broadcast command in a cluster and should be avoided in production.
     * @param {string} pattern - The key pattern to match (e.g., 'user:*').
     * @returns {Promise<Array<object>>} An array of matched key values.
     */
    async fetch(pattern) {
        try {
            const client = await this.connect();
            // This is not a performant way to search a large cluster!
            // It broadcasts the KEYS command to all master nodes.
            const keys = await client.keys(pattern);
            if (keys.length === 0) {
                return [];
            }
            const values = await client.mget(keys);
            const parsedValues = values.map(value => value ? JSON.parse(value) : null);
            return parsedValues.filter(value => value !== null);
        } catch (error) {
            console.error(`Error fetching keys with pattern: ${pattern}`, error);
            throw error;
        }
    }
}

const redisServiceInstance = new FnRedisService();
export default redisServiceInstance;
