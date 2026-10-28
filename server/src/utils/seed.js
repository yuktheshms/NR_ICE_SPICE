import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Category from '../models/Category.js';
import MenuItem from '../models/MenuItem.js';
import CafeSetting from '../models/CafeSetting.js';

export async function seedDatabase() {
  if (process.env.NODE_ENV === 'production') {
    const { ADMIN_NAME, ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
    if (!ADMIN_NAME || !ADMIN_USERNAME || !ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
      throw new Error('Production requires ADMIN_NAME, ADMIN_USERNAME, ADMIN_EMAIL, and an ADMIN_PASSWORD of at least 12 characters.');
    }

    let admin = await User.findOne({ username: ADMIN_USERNAME });
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    if (admin) {
      admin.name = ADMIN_NAME;
      admin.email = ADMIN_EMAIL;
      admin.passwordHash = passwordHash;
      admin.role = 'admin';
      admin.isActive = true;
      await admin.save();
    } else {
      await User.create({
        name: ADMIN_NAME,
        username: ADMIN_USERNAME,
        email: ADMIN_EMAIL,
        passwordHash,
        role: 'admin',
        isActive: true,
      });
    }

    await User.updateMany(
      { username: { $in: ['cashier', 'kitchen'] }, email: { $in: ['cashier@nricespice.com', 'kitchen@nricespice.com'] } },
      { isActive: false }
    );
    await User.updateMany(
      { email: 'admin@nricespice.com', username: { $ne: ADMIN_USERNAME } },
      { isActive: false }
    );
  } else {
    const existingUser = await User.findOne({ username: 'admin' });
    if (!existingUser) {
      await User.create({
        name: 'Admin User',
        username: 'admin',
        email: 'admin@nricespice.com',
        passwordHash: await bcrypt.hash('admin123', 10),
        role: 'admin',
        isActive: true,
      });

      await User.create({
        name: 'Cashier User',
        username: 'cashier',
        email: 'cashier@nricespice.com',
        passwordHash: await bcrypt.hash('cashier123', 10),
        role: 'cashier',
        isActive: true,
      });

      await User.create({
        name: 'Kitchen User',
        username: 'kitchen',
        email: 'kitchen@nricespice.com',
        passwordHash: await bcrypt.hash('kitchen123', 10),
        role: 'kitchen',
        isActive: true,
      });
    }
  }

  const categoryCount = await Category.countDocuments();
  if (categoryCount === 0) {
    const categories = [
      'Ice Cream',
      'Milkshakes',
      'Juices',
      'Cold Drinks',
      'Hot Beverages',
      'Snacks',
      'Fast Food',
      'Sandwiches',
      'Burgers',
      'Pizza',
      'Desserts',
      'Other Items',
    ];

    const savedCategories = [];
    for (const name of categories) {
      const category = await Category.create({
        name,
        description: `${name} available for NR_ICE_SPICE`,
        isActive: true,
      });
      savedCategories.push(category);
    }

    const categoryMap = Object.fromEntries(savedCategories.map((item) => [item.name, item._id]));

    const items = [
      { name: 'Classic Vanilla Scoop', description: 'Creamy vanilla gelato with rich texture.', category: 'Ice Cream', price: 140, image: 'https://images.unsplash.com/...', isAvailable: true },
      { name: 'Brownie Fudge Sundae', description: 'Vanilla ice cream with brownie chunks and fudge.', category: 'Ice Cream', price: 220, image: 'https://images.unsplash.com/...', isAvailable: true },
      { name: 'Choco Burst Shake', description: 'Chocolate shake topped with cream and cocoa dust.', category: 'Milkshakes', price: 220, image: 'https://images.unsplash.com/...', isAvailable: true },
      { name: 'Strawberry Swirl Shake', description: 'Fresh strawberry shakes with a silky finish.', category: 'Milkshakes', price: 210, image: 'https://images.unsplash.com/...', isAvailable: true },
      { name: 'Orange Fresh Juice', description: 'Fresh orange juice, served chilled.', category: 'Juices', price: 140, image: 'https://images.unsplash.com/...', isAvailable: true },
      { name: 'Mango Chill Juice', description: 'Mango pulp blended with ice and citrus.', category: 'Juices', price: 170, image: 'https://images.unsplash.com/...', isAvailable: true },
      { name: 'Coca Cola', description: 'Classic chilled cola can.', category: 'Cold Drinks', price: 90, image: 'https://images.unsplash.com/...', isAvailable: true },
      { name: 'Lemon Mint Soda', description: 'Cool soda with fresh mint and lime.', category: 'Cold Drinks', price: 120, image: 'https://images.unsplash.com/...', isAvailable: true },
      { name: 'Filter Coffee', description: 'Traditional artisanal coffee with aroma.', category: 'Hot Beverages', price: 100, image: 'https://images.unsplash.com/...', isAvailable: true },
      { name: 'Hazelnut Cappuccino', description: 'Creamy cappuccino with hazelnut notes.', category: 'Hot Beverages', price: 180, image: 'https://images.unsplash.com/...', isAvailable: true },
      { name: 'Peri Peri Fries', description: 'Crispy fries tossed in peri peri seasoning.', category: 'Snacks', price: 160, image: 'https://images.unsplash.com/...', isAvailable: true },
      { name: 'Cheese Garlic Nachos', description: 'Loaded with cheese, jalapenos and garlic.', category: 'Snacks', price: 220, image: 'https://images.unsplash.com/...', isAvailable: true },
      { name: 'Veg Burger', description: 'Grilled veggie patty with crisp lettuce.', category: 'Burgers', price: 180, image: 'https://images.unsplash.com/...', isAvailable: true },
      { name: 'Smoky Chicken Burger', description: 'Succulent chicken patty with smoky sauce.', category: 'Burgers', price: 240, image: 'https://images.unsplash.com/...', isAvailable: true },
      { name: 'Margherita Pizza', description: 'Classic pizza with basil and mozzarella.', category: 'Pizza', price: 320, image: 'https://images.unsplash.com/...', isAvailable: true },
      { name: 'Paneer Tikka Pizza', description: 'Tandoori paneer pizza with chili flakes.', category: 'Pizza', price: 360, image: 'https://images.unsplash.com/...', isAvailable: true },
      { name: 'Veg Sandwich', description: 'Grilled vegetable sandwich with herb mayo.', category: 'Sandwiches', price: 180, image: 'https://images.unsplash.com/...', isAvailable: true },
      { name: 'Club Chicken Sandwich', description: 'Layered chicken sandwich with fresh veg.', category: 'Sandwiches', price: 260, image: 'https://images.unsplash.com/...', isAvailable: true },
      { name: 'Chocolate Brownie', description: 'Fresh chocolate brownie served warm.', category: 'Desserts', price: 160, image: 'https://images.unsplash.com/...', isAvailable: true },
      { name: 'Cheese Pasta', description: 'Creamy cheesy pasta served hot.', category: 'Fast Food', price: 280, image: 'https://images.unsplash.com/...', isAvailable: true },
      { name: 'Masala Maggi', description: 'Quick masala noodles with vegetables.', category: 'Other Items', price: 120, image: 'https://images.unsplash.com/...', isAvailable: true },
    ];

    for (const item of items) {
      await MenuItem.create({
        ...item,
        category: categoryMap[item.category],
      });
    }
  }

  const settings = await CafeSetting.findOne();
  if (!settings) {
    await CafeSetting.create({
      cafeName: 'NR_ICE_SPICE',
      cafeAddress: '12 Market Lane, Bengaluru, Karnataka',
      taxRate: 0,
      currency: 'INR',
      contactNumber: '+91 98765 43210',
      upiId: 'shwetha1405003@oksbi',
    });
  } else if (settings.taxRate !== 0 || !settings.upiId) {
    settings.taxRate = 0;
    if (!settings.upiId) settings.upiId = 'shwetha1405003@oksbi';
    await settings.save();
  }
}
