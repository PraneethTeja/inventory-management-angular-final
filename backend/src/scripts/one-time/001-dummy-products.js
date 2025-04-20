const mongoose = require('mongoose');
const Product = require('../../models/product.model.js'); // Adjust the path if needed
const faker = require('faker');

const MONGO_URI = 'mongodb+srv://praneethpedapati98:Tj4nguIhlnUnd4ll@cluster0.sqhukiy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB connected');
  seedProducts();
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

async function seedProducts() {
  try {
    await Product.deleteMany(); // Clear existing data

    const categories = ['chain', 'pendant'];
    const featuresList = ['Handcrafted', 'Water Resistant', 'Eco-friendly', 'Adjustable'];

    const products = [];

    for (let i = 0; i < 50; i++) {
      const category = faker.random.arrayElement(categories);
      const name = faker.commerce.productName();
      const productCode = `PROD-${faker.datatype.uuid().slice(0, 8).toUpperCase()}`;

      const discount = Math.random() < 0.3 ? {
        percentage: faker.datatype.number({ min: 5, max: 30 }),
        validUntil: faker.date.future()
      } : {
        percentage: 0,
        validUntil: null
      };

      const customProps = new Map();
      if (category === 'chain') {
        customProps.set('chainType', faker.commerce.productMaterial());
      } else if (category === 'pendant') {
        customProps.set('stoneType', faker.commerce.productAdjective());
      }

      const product = new Product({
        name,
        category,
        price: faker.commerce.price(100, 1000, 0),
        description: faker.commerce.productDescription(),
        productCode,
        inStock: true,
        imageUrl: faker.image.imageUrl(),
        imageUrls: [
          faker.image.imageUrl(),
          faker.image.imageUrl()
        ],
        stockQuantity: faker.datatype.number({ min: 5, max: 100 }),
        details: {
          material: faker.commerce.productMaterial(),
          weight: `${faker.datatype.number({ min: 5, max: 50 })}g`,
          dimensions: `${faker.datatype.number({ min: 1, max: 5 })}x${faker.datatype.number({ min: 1, max: 5 })}cm`,
          features: faker.random.arrayElements(featuresList, faker.datatype.number({ min: 1, max: 3 }))
        },
        customProperties: customProps,
        featured: faker.datatype.boolean(),
        discount,
        tags: faker.random.arrayElements(['elegant', 'modern', 'classic', 'gift', 'popular'], 2),
        relatedProducts: [],
      });

      products.push(product);
    }

    await Product.insertMany(products);
    console.log('✅ 50 dummy products inserted');
  } catch (error) {
    console.error('❌ Error seeding products:', error);
  } finally {
    mongoose.connection.close();
  }
}
