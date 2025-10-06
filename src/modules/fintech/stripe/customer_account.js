// customerStripeService.js

import StripeService from './stripeService.js';

class CustomerStripeService {
  static #instance;
  #baseStripeService;

  constructor() {
    if (CustomerStripeService.#instance) {
      return CustomerStripeService.#instance;
    }
    this.#baseStripeService = StripeService.getInstance();
    CustomerStripeService.#instance = this;
  }

  static getInstance() {
    if (!CustomerStripeService.#instance) {
      new CustomerStripeService();
    }
    return CustomerStripeService.#instance;
  }

  async getCustomerPayments({ customerId, limit = 10 }) {
    if (!customerId) {
      throw new Error('customerId is required to retrieve customer payments.');
    }

    try {
      const charges = await this.#baseStripeService.listChargesByCustomer({ customerId, limit });

      return charges.map(charge => ({
        id: charge.id,
        status: charge.status,
        total: charge.amount,
        currency: charge.currency,
        receiptUrl: charge.receipt_url || null,
        invoiceId: charge.invoice || null,
        description: charge.description,
        created: new Date(charge.created * 1000).toISOString(),
      }));

    } catch (error) {
      console.error(`Error retrieving payments for customer ID ${customerId}:`, error);
      throw new Error(`Failed to retrieve customer payments for ID ${customerId}.`);
    }
  }

  async getCustomerDetailedTransaction({ customerId, chargeId }) {
    if (!customerId || !chargeId) {
      throw new Error('customerId and chargeId are required to retrieve a detailed customer transaction.');
    }

    try {
      // SECURITY CHECK: Use the public getChargeById method to get the raw charge
      // and verify ownership.
      const rawCharge = await this.#baseStripeService.getChargeById(chargeId);

      // IMPORTANT: Ensure the charge actually belongs to the provided customerId
      if (!rawCharge.customer || rawCharge.customer !== customerId) {
        throw new Error('Unauthorized: Charge does not belong to the specified customer.');
      }

      // Now that ownership is verified, get the fully processed (merchant-level) details
      const fullTransaction = await this.#baseStripeService.getDetailedTransaction({ chargeId });

      // Construct the customer-safe response, explicitly omitting merchant-only details
      return {
        id: fullTransaction.id,
        status: fullTransaction.status,
        total: fullTransaction.total,
        currency: fullTransaction.currency,
        customerName: fullTransaction.customerName, // This is fine for customer-facing
        invoiceId: fullTransaction.invoiceId,
        receiptUrl: fullTransaction.receiptUrl,
        description: fullTransaction.description,
        created: fullTransaction.created,
        // Crucially, omit merchant-specific details like fee and net
      };

    } catch (error) {
      console.error(`Error retrieving detailed transaction for customer ID ${customerId}, charge ID ${chargeId}:`, error);
      // Re-throw specific unauthorized error
      if (error.message.includes('Unauthorized')) {
        throw error;
      }
      throw new Error(`Failed to retrieve detailed transaction for customer ID ${customerId}, charge ID ${chargeId}.`);
    }
  }
}

export default CustomerStripeService.getInstance();

/*
// --- How to use this ES6 Module in your Node.js application (e.g., myApp.js) ---

// myApp.js
import stripeService from './stripeService.js';
import customerStripeService from './customerStripeService.js'; // Import the new customer service

async function fetchCustomerData() {
  const TEST_CUSTOMER_ID = 'cus_YOUR_CUSTOMER_ID_HERE'; // REPLACE WITH A REAL CUSTOMER ID
  const TEST_CHARGE_ID = 'ch_YOUR_CHARGE_ID_HERE';   // REPLACE WITH A REAL CHARGE ID BELONGING TO THAT CUSTOMER

  try {
    console.log(`\n--- Fetching Payments for Customer ID: ${TEST_CUSTOMER_ID} ---`);
    const customerPayments = await customerStripeService.getCustomerPayments({
      customerId: TEST_CUSTOMER_ID,
      limit: 3
    });

    if (customerPayments.length > 0) {
      console.log('Customer Payments (first 3):');
      customerPayments.forEach(p => {
        console.log(`  - ID: ${p.id}, Amount: ${(p.total / 100).toFixed(2)} ${p.currency.toUpperCase()}, Status: ${p.status}, Receipt: ${p.receiptUrl ? 'Yes' : 'No'}`);
      });

      // Try to get detailed transaction for one of them
      const aChargeId = customerPayments[0].id;
      console.log(`\n--- Getting Detailed Transaction for Charge ${aChargeId} (Customer: ${TEST_CUSTOMER_ID}) ---`);
      const customerTxnDetails = await customerStripeService.getCustomerDetailedTransaction({
        customerId: TEST_CUSTOMER_ID,
        chargeId: aChargeId
      });

      console.log(`Transaction ID: ${customerTxnDetails.id}`);
      console.log(`Status: ${customerTxnDetails.status}`);
      console.log(`Total Amount: ${(customerTxnDetails.total / 100).toFixed(2)} ${customerTxnDetails.currency.toUpperCase()}`);
      console.log(`Customer Name: ${customerTxnDetails.customerName}`);
      console.log(`Invoice ID: ${customerTxnDetails.invoiceId || 'N/A'}`);
      console.log(`Receipt URL: ${customerTxnDetails.receiptUrl || 'N/A'}`);
      console.log(`Description: ${customerTxnDetails.description || 'N/A'}`);
      // Notice: No 'fee' or 'net' fields here!

    } else {
      console.log('No payments found for this customer.');
    }

  } catch (error) {
    console.error('An error occurred during customer Stripe operations:', error.message);
  }
}

fetchCustomerData();
*/
