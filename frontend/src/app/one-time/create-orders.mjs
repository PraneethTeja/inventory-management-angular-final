// create-orders.js
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, query, limit } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

import { environment } from '../../environments/environment';

const firebaseConfig = environment.firebase;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

// Constants
const ADMIN_USER_ID = "otb3HSZXpQdHHfKa6rBpyZUALUn1";
const orderStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'canceled'];
const paymentMethods = ['cash', 'credit_card', 'bank_transfer', 'upi', 'wallet'];
const paymentStatuses = ['pending', 'paid', 'failed', 'refunded'];
const countries = ['USA', 'India', 'UK', 'Canada', 'Australia'];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function getRandomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function getRandomName() {
  const firstNames = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Eva', 'Frank', 'Grace', 'Henry'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Jones', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor'];

  return `${getRandomElement(firstNames)} ${getRandomElement(lastNames)}`;
}

function getRandomEmail(name) {
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];
  const nameParts = name.toLowerCase().split(' ');
  return `${nameParts.join('.')}${getRandomInt(1, 999)}@${getRandomElement(domains)}`;
}

function getRandomPhone() {
  return `+1${getRandomInt(100, 999)}${getRandomInt(100, 999)}${getRandomInt(1000, 9999)}`;
}

async function fetchProducts() {
  try {
    const productsRef = collection(firestore, 'products');
    const q = query(productsRef, limit(50));
    const querySnapshot = await getDocs(q);

    const products = [];
    querySnapshot.forEach((doc) => {
      products.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return products;
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

async function createOrders(count) {
  try {
    console.log(`Creating ${count} orders...`);
    const ordersRef = collection(firestore, 'orders');
    const products = await fetchProducts();

    if (products.length === 0) {
      throw new Error('No products found in database');
    }

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6); // Orders from last 6 months

    for (let i = 1; i <= count; i++) {
      // Generate random customer
      const customerName = getRandomName();
      const orderDate = getRandomDate(startDate, new Date());
      const status = getRandomElement(orderStatuses);

      // Generate order items (1-5 items per order)
      const itemCount = getRandomInt(1, 5);
      const items = [];
      let subtotal = 0;

      for (let j = 0; j < itemCount; j++) {
        const product = getRandomElement(products);
        const quantity = getRandomInt(1, 3);
        const price = product.price;
        const itemTotal = price * quantity;

        items.push({
          product: product.id,
          name: product.name,
          quantity,
          price,
          category: product.category,
          imageUrl: product.imageUrl
        });

        subtotal += itemTotal;
      }

      // Calculate order totals
      const tax = Math.round(subtotal * 0.1);
      const shippingCost = subtotal > 2000 ? 0 : 150;
      const discount = Math.random() > 0.7 ? Math.round(subtotal * 0.1) : 0;
      const totalAmount = subtotal + tax + shippingCost - discount;

      const paymentMethod = getRandomElement(paymentMethods);
      const paymentStatus = getRandomElement(paymentStatuses);

      // Create order object
      const order = {
        userId: ADMIN_USER_ID,
        customer: {
          name: customerName,
          email: getRandomEmail(customerName),
          phone: getRandomPhone(),
          address: {
            street: `${getRandomInt(100, 9999)} Main St`,
            city: `City ${getRandomInt(1, 100)}`,
            state: `State ${getRandomInt(1, 50)}`,
            zipCode: `${getRandomInt(10000, 99999)}`,
            country: getRandomElement(countries)
          }
        },
        items,
        status,
        subtotal,
        tax,
        shippingCost,
        discount,
        totalAmount,
        paymentMethod,
        paymentStatus,
        whatsapp: {
          messageSent: Math.random() > 0.5,
          conversationId: uuidv4()
        },
        createdAt: orderDate,
        updatedAt: orderDate,
        statusHistory: [
          {
            status: 'pending',
            date: orderDate,
            note: 'Order created'
          }
        ]
      };

      // Add tracking info for shipped or delivered orders
      if (status === 'shipped' || status === 'delivered') {
        order.trackingInfo = {
          carrier: getRandomElement(['FedEx', 'UPS', 'USPS', 'DHL']),
          trackingNumber: `TRK${getRandomInt(1000000, 9999999)}`,
          expectedDelivery: new Date(orderDate.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days after order
          url: `https://example.com/tracking/${getRandomInt(10000, 99999)}`
        };

        // Add status history records
        const confirmedDate = new Date(orderDate.getTime() + 1 * 60 * 60 * 1000); // 1 hour after order
        order.statusHistory.push({
          status: 'confirmed',
          date: confirmedDate,
          note: 'Order confirmed'
        });

        const processingDate = new Date(orderDate.getTime() + 24 * 60 * 60 * 1000); // 1 day after order
        order.statusHistory.push({
          status: 'processing',
          date: processingDate,
          note: 'Order processing started'
        });

        const shippedDate = new Date(orderDate.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days after order
        order.statusHistory.push({
          status: 'shipped',
          date: shippedDate,
          note: 'Order shipped'
        });

        if (status === 'delivered') {
          const deliveredDate = new Date(orderDate.getTime() + 4 * 24 * 60 * 60 * 1000); // 4 days after order
          order.statusHistory.push({
            status: 'delivered',
            date: deliveredDate,
            note: 'Order delivered'
          });
        }
      }

      const docRef = await addDoc(ordersRef, order);
      console.log(`Order ${i} created with ID: ${docRef.id}`);
    }

    console.log('All orders created successfully!');
  } catch (error) {
    console.error('Error creating orders:', error);
  }
}

// Create 50 orders
createOrders(50);
process.exit(0);
