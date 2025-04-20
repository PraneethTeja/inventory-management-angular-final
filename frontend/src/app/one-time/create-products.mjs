// create-products.js
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

import { environment } from '../../environments/environment';

const firebaseConfig = environment.firebase;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

// Sample jewelry data
const jewelry = [
  // Chains
  {
    category: 'chain',
    items: [
      { name: 'Classic Gold Chain', material: 'Gold', weight: '15g', price: 2499 },
      { name: 'Silver Cuban Link Chain', material: 'Silver', weight: '20g', price: 899 },
      { name: 'Rose Gold Rope Chain', material: 'Rose Gold', weight: '10g', price: 1899 },
      { name: 'Platinum Box Chain', material: 'Platinum', weight: '25g', price: 3999 },
      { name: 'White Gold Figaro Chain', material: 'White Gold', weight: '18g', price: 2799 },
      { name: 'Gold Snake Chain', material: 'Gold', weight: '12g', price: 2199 },
      { name: 'Sterling Silver Wheat Chain', material: 'Silver', weight: '14g', price: 799 },
      { name: 'Platinum Curb Chain', material: 'Platinum', weight: '22g', price: 3699 },
      { name: 'Rose Gold Singapore Chain', material: 'Rose Gold', weight: '8g', price: 1599 },
      { name: 'White Gold Rolo Chain', material: 'White Gold', weight: '16g', price: 2599 },
      { name: 'Gold Mariner Chain', material: 'Gold', weight: '17g', price: 2899 },
      { name: 'Silver Herringbone Chain', material: 'Silver', weight: '11g', price: 699 },
      { name: 'Platinum Byzantine Chain', material: 'Platinum', weight: '28g', price: 4299 }
    ]
  },

  // Pendants
  {
    category: 'pendant',
    items: [
      { name: 'Diamond Heart Pendant', material: 'White Gold', weight: '5g', price: 1999 },
      { name: 'Sapphire Drop Pendant', material: 'Platinum', weight: '6g', price: 2499 },
      { name: 'Ruby Oval Pendant', material: 'Gold', weight: '4g', price: 1899 },
      { name: 'Emerald Halo Pendant', material: 'White Gold', weight: '7g', price: 2699 },
      { name: 'Pearl Flower Pendant', material: 'Silver', weight: '3g', price: 799 },
      { name: 'Amethyst Teardrop Pendant', material: 'Rose Gold', weight: '4g', price: 1299 },
      { name: 'Topaz Square Pendant', material: 'Gold', weight: '5g', price: 1599 },
      { name: 'Opal Butterfly Pendant', material: 'Silver', weight: '3g', price: 899 },
      { name: 'Garnet Circle Pendant', material: 'Rose Gold', weight: '4g', price: 1399 },
      { name: 'Citrine Sunburst Pendant', material: 'Gold', weight: '5g', price: 1699 },
      { name: 'Aquamarine Leaf Pendant', material: 'White Gold', weight: '6g', price: 1899 },
      { name: 'Peridot Star Pendant', material: 'Silver', weight: '3g', price: 899 }
    ]
  },


];

// Product image URLs (replace with actual image URLs)
const imageBaseUrls = {
  chain: 'https://example.com/images/chains/',
  pendant: 'https://example.com/images/pendants/'
};

function getRandomBoolean(trueWeight = 0.7) {
  return Math.random() < trueWeight;
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

async function createProducts() {
  try {
    console.log('Creating jewelry products...');
    const productsRef = collection(firestore, 'products');
    let totalCreated = 0;

    // Go through each category
    for (const category of jewelry) {
      console.log(`Creating ${category.category} products...`);

      // Go through each item in the category
      for (const item of category.items) {
        if (totalCreated >= 50) break; // Stop after creating 50 products

        const productCode = `PROD-${uuidv4().slice(0, 8)}`;
        const isFeatured = getRandomBoolean(0.3); // 30% chance of being featured
        const stockQuantity = getRandomInt(5, 50);

        const features = ['Hypoallergenic'];
        if (item.material.includes('Gold') || item.material === 'Platinum') {
          features.push('Tarnish Resistant');
        }
        if (getRandomBoolean(0.6)) {
          features.push('Handcrafted');
        }
        if (getRandomBoolean(0.4)) {
          features.push('Limited Edition');
        }

        // Prepare product object
        const product = {
          name: item.name,
          category: category.category,
          price: item.price,
          description: `Beautiful ${item.material} ${category.category} weighing ${item.weight}. Perfect for any occasion.`,
          inStock: stockQuantity > 0,
          productCode,
          imageUrl: `${imageBaseUrls[category.category]}${productCode}.jpg`,
          imageUrls: [
            `${imageBaseUrls[category.category]}${productCode}_1.jpg`,
            `${imageBaseUrls[category.category]}${productCode}_2.jpg`
          ],
          stockQuantity,
          details: {
            material: item.material,
            weight: item.weight,
            dimensions: getRandomBoolean() ? 'Standard' : 'Custom',
            features
          },
          featured: isFeatured,
          tags: [category.category, item.material.toLowerCase(), 'jewelry'],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Add discount for some products
        if (getRandomBoolean(0.25)) { // 25% chance of discount
          const discountPercentage = getRandomInt(10, 30);
          product.discount = {
            percentage: discountPercentage,
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
          };
        }

        // Add related products for some items
        if (getRandomBoolean(0.4)) { // 40% chance of related products
          product.relatedProducts = [
            `related_product_${getRandomInt(1, 10)}`,
            `related_product_${getRandomInt(11, 20)}`
          ];
        }

        // Add the product to Firestore
        const docRef = await addDoc(productsRef, product);
        console.log(`Created ${item.name} with ID: ${docRef.id}`);
        totalCreated++;
      }

      if (totalCreated >= 50) break; // Stop after creating 50 products
    }
    console.log(`Successfully created ${totalCreated} jewelry products!`);
  } catch (error) {
    console.error('Error creating products:', error);
  }

  // Execute the function
  createProducts();
  process.exit(0);
}
