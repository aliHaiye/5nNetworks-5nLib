// stripeService.js

import Stripe from 'stripe';

class StripeService {
  static #instance;
  #stripeClient;

  constructor() {
    if (StripeService.#instance) {
      return StripeService.#instance;
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      console.warn("Stripe secret key (STRIPE_SECRET_KEY) is not set in environment variables. Stripe operations may fail.");
    }

    this.#stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });

    StripeService.#instance = this;
  }

  static getInstance() {
    if (!StripeService.#instance) {
      new StripeService();
    }
    return StripeService.#instance;
  }

  async getAccountDetails() {
    try {
      const account = await this.#stripeClient.accounts.retrieve();
      return account;
    } catch (error) {
      console.error('Error retrieving Stripe account details:', error);
      throw new Error('Failed to retrieve Stripe account details.');
    }
  }

  async #_listCharges(options = {}) { // Using a private helper for internal use
    try {
      const charges = await this.#stripeClient.charges.list(options);
      return charges.data;
    } catch (error) {
      console.error('Error listing Stripe charges:', error);
      throw new Error('Failed to list Stripe charges.');
    }
  }

  async getPaymentHistory({ limit = 10 } = {}) {
    return this.#_listCharges({ limit });
  }

  async listChargesByCustomer({ customerId, limit = 10 } = {}) {
    if (!customerId) {
      throw new Error('customerId is required to list charges by customer.');
    }
    return this.#_listCharges({ customer: customerId, limit });
  }

  /**
   * Retrieves a raw Stripe Charge object by its ID.
   * This method is intended for internal use by other services that need
   * access to the full, unprocessed charge data for validation or further processing.
   * @param {string} chargeId - The ID of the Stripe Charge.
   * @returns {Promise<Object>} A Promise that resolves with the raw Stripe Charge object.
   * @throws {Error} If the charge is not found or the API call fails.
   */
  async getChargeById(chargeId) {
    if (!chargeId) {
      throw new Error('chargeId is required to retrieve a raw charge.');
    }
    try {
      const charge = await this.#stripeClient.charges.retrieve(chargeId);
      if (!charge) {
        throw new Error(`Charge with ID ${chargeId} not found.`);
      }
      return charge;
    } catch (error) {
      console.error(`Error retrieving raw charge for ID ${chargeId}:`, error);
      throw new Error(`Failed to retrieve raw charge for ID ${chargeId}.`);
    }
  }

  async getDetailedTransaction({ chargeId }) {
    if (!chargeId) {
      throw new Error('chargeId is required to retrieve a detailed transaction.');
    }

    try {
      const charge = await this.getChargeById(chargeId); // Use the new public method

      let feeDetails = { fee: 0, net: charge.amount };
      if (charge.balance_transaction) {
        const balanceTransaction = await this.#stripeClient.balanceTransactions.retrieve(
          charge.balance_transaction
        );
        feeDetails = {
          fee: balanceTransaction.fee,
          net: balanceTransaction.net,
        };
      } else {
        console.warn(`No balance_transaction found for charge ${chargeId}. Fee and net breakdown may not be available.`);
      }

      let customerName = 'N/A';
      if (charge.customer) {
        try {
          const customer = await this.#stripeClient.customers.retrieve(charge.customer);
          customerName = customer.name || customer.description || customer.email || `Customer ID: ${customer.id}`;
        } catch (customerError) {
          console.warn(`Could not retrieve customer details for ID ${charge.customer}:`, customerError.message);
          customerName = `Customer ID: ${charge.customer} (details unavailable)`;
        }
      } else if (charge.billing_details && charge.billing_details.name) {
        customerName = charge.billing_details.name;
      }

      const invoiceId = charge.invoice || null;
      const receiptUrl = charge.receipt_url || null;

      return {
        id: charge.id,
        status: charge.status,
        total: charge.amount,
        currency: charge.currency,
        fee: feeDetails.fee,
        net: feeDetails.net,
        customerName: customerName,
        invoiceId: invoiceId,
        receiptUrl: receiptUrl,
        description: charge.description,
        created: new Date(charge.created * 1000).toISOString(),
      };

    } catch (error) {
      console.error(`Error retrieving detailed transaction for charge ID ${chargeId}:`, error);
      throw new Error(`Failed to retrieve detailed transaction for charge ID ${chargeId}. Check if the ID is valid and API key has permissions.`);
    }
  }
}

export default StripeService.getInstance();

/*
// --- How to use this ES6 Module in your Node.js application (e.g., myApp.js) ---

// myApp.js
import stripeService from './stripeService.js';

async function fetchStripeData() {
  try {
    console.log('Fetching Stripe account details...');
    const account = await stripeService.getAccountDetails();
    console.log('--- Stripe Account Details ---');
    console.log(`ID: ${account.id}`);

    console.log('\nFetching recent payment history (up to 1 payment to get an ID)...');
    // Ensure you have at least one charge in your test data that has a receipt generated
    const payments = await stripeService.getPaymentHistory({ limit: 1 });

    if (payments.length > 0) {
      const firstChargeId = payments[0].id; // Get the ID of the first charge
      console.log(`\nRetrieving detailed transaction for Charge ID: ${firstChargeId}`);

      const transactionDetails = await stripeService.getDetailedTransaction({ chargeId: firstChargeId });

      console.log('--- Detailed Transaction Breakdown ---');
      console.log(`Transaction ID: ${transactionDetails.id}`);
      console.log(`Status: ${transactionDetails.status}`);
      console.log(`Customer Name: ${transactionDetails.customerName}`);
      console.log(`Invoice ID:    ${transactionDetails.invoiceId || 'N/A'}`);
      console.log(`Receipt URL:   ${transactionDetails.receiptUrl || 'N/A'}`); // Displaying the receipt URL
      console.log(`Total Amount: ${(transactionDetails.total / 100).toFixed(2)} ${transactionDetails.currency.toUpperCase()}`);
      console.log(`Stripe Fee:   ${(transactionDetails.fee / 100).toFixed(2)} ${transactionDetails.currency.toUpperCase()}`);
      console.log(`Net Amount:   ${(transactionDetails.net / 100).toFixed(2)} ${transactionDetails.currency.toUpperCase()}`);
      console.log(`Description: ${transactionDetails.description || 'N/A'}`);
      console.log(`Created At: ${transactionDetails.created}`);

    } else {
      console.log('No payments found to fetch detailed transaction for.');
    }

  } catch (error) {
    console.error('An error occurred during Stripe operations:', error.message);
  }
}

fetchStripeData();
*/