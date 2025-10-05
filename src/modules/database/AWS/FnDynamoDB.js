import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

class FnDynamoDBService {
    #client;

    constructor() {
        this.#client = DynamoDBDocumentClient.from(
            new DynamoDBClient({ region: AWS_REGION })
        );
        console.log('DynamoDB client initialized.');
    }

    /**
     * Gets a single document by its primary key from a table.
     * @param {string} collectionName - The name of the DynamoDB table.
     * @param {object} primaryKey - The primary key of the item, e.g., { id: 'doc123' }.
     * @returns {Promise<object|null>} The item data or null if not found.
     */
    async get(collectionName, primaryKey) {
        const params = {
            TableName: collectionName,
            Key: primaryKey,
        };
        try {
            const data = await this.#client.send(new GetCommand(params));
            return data.Item || null;
        } catch (error) {
            console.error('Error getting document from DynamoDB:', error);
            throw error;
        }
    }

    /**
     * Sets or updates a document in a table. Assumes primary key is in data.
     * @param {string} collectionName - The name of the DynamoDB table.
     * @param {object} data - The entire item data, including the primary key.
     * @returns {Promise<object>} The updated document.
     */
    async set(collectionName, data) {
        const params = {
            TableName: collectionName,
            Item: data,
            ReturnValues: 'ALL_OLD', // or 'NONE'
        };
        try {
            await this.#client.send(new PutCommand(params));
            return data;
        } catch (error) {
            console.error('Error setting document in DynamoDB:', error);
            throw error;
        }
    }

    /**
     * Fetches documents from a table using Query or Scan. Uses Scan for generic filters.
     * WARNING: `Scan` can be very inefficient on large tables. Prefer `Query` with a primary key.
     * @param {string} collectionName - The name of the DynamoDB table.
     * @param {object} [filters] - Optional filters. Use a `KeyConditionExpression` for Query or `FilterExpression` for Scan.
     * @returns {Promise<Array<object>>} An array of documents.
     */
    async fetch(collectionName, filters = {}) {
        let command;
        let params = {
            TableName: collectionName,
        };
        
        // Use Query if filters include a KeyConditionExpression
        if (filters.KeyConditionExpression) {
            params = { ...params, ...filters };
            command = new QueryCommand(params);
        } else {
            // Otherwise use Scan (less efficient)
            params = { ...params, ...filters };
            command = new ScanCommand(params);
        }

        try {
            const data = await this.#client.send(command);
            // Handle pagination for large results (not implemented here for simplicity)
            return data.Items;
        } catch (error) {
            console.error('Error fetching documents from DynamoDB:', error);
            throw error;
        }
    }
}

const dynamoDBInstance = new FnDynamoDBService();
export default dynamoDBInstance;
