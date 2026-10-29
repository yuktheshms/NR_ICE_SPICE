import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { body, validationResult } from 'express-validator';
import { connectDB } from './config/db.js';
import { seedDatabase } from './utils/seed.js';

import User from './models/User.js';
import Category from './models/Category.js';
import MenuItem from './models/MenuItem.js';
import Order from './models/Order.js';
import Payment from './models/Payment.js';
import AuditLog from './models/AuditLog.js';
import CafeSetting from './models/CafeSetting.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const isProduction = process.env.NODE_ENV === 'production';
const corsOrigin = process.env.CLIENT_ORIGIN || (isProduction ? false : '*');
const io = new Server(server, { cors: { origin: corsOrigin } });

const PORT = Number(process.env.PORT) || 5000;
const JWT_SECRET = process.env.JWT_SECRET || (isProduction ? '' : 'nrice-spice-secret');
const clientDistPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');

if (isProduction && !JWT_SECRET) {
  throw new Error('JWT_SECRET must be configured in production.');
}

if (corsOrigin) app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '10mb' }));
if (isProduction) app.set('trust proxy', 1);

const sanitizeOrder = (order) => ({
  ...order.toObject(),
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

const logAudit = async (userId, action, affectedRecord, details = {}) => {
  try {
    await AuditLog.create({ user: userId, action, affectedRecord, details });
  } catch (error) {
    console.error('Audit logging failed:', error.message);
  }
};

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.userId).lean();
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid or inactive user.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token.' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'You do not have permission to access this resource.' });
  }
  next();
};

const formatMenuItem = (item) => ({
  ...item.toObject(),
  categoryName: item.category?.name || 'General',
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'NR_ICE_SPICE API' }));

app.post(
  '/api/auth/login',
  [
    body('username').trim().notEmpty().withMessage('Username is required.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;
    const user = await User.findOne({ username: username.trim() });

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  }
);

app.post('/api/auth/register', authMiddleware, requireRole('admin'), async (req, res) => {
  const { name, username, email, password, role } = req.body;

  if (!name || !username || !email || !password || !role) {
    return res.status(400).json({ message: 'All staff fields are required.' });
  }

  const existing = await User.findOne({ $or: [{ username }, { email }] });
  if (existing) {
    return res.status(409).json({ message: 'User already exists with that username or email.' });
  }

  const user = await User.create({
    name,
    username,
    email,
    passwordHash: await bcrypt.hash(password, 10),
    role,
    isActive: true,
  });

  await logAudit(req.user._id, 'create_user', user._id, { username, role });

  return res.status(201).json({ user: { id: user._id, name: user.name, username: user.username, role: user.role } });
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  res.json({ user: { id: req.user._id, name: req.user.name, username: req.user.username, email: req.user.email, role: req.user.role } });
});

app.get('/api/staff', authMiddleware, requireRole('admin'), async (req, res) => {
  const users = await User.find({}).sort({ createdAt: -1 }).select('-passwordHash');
  res.json({ users });
});

app.get('/api/categories', authMiddleware, async (req, res) => {
  const categories = await Category.find({ isActive: true }).sort({ name: 1 });
  res.json({ categories });
});

app.post('/api/categories', authMiddleware, requireRole('admin'), async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ message: 'Category name is required.' });

  const category = await Category.create({ name, description: description || '', isActive: true });
  await logAudit(req.user._id, 'create_category', category._id, { name });
  res.status(201).json({ category });
});

app.put('/api/categories/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  const { name, description, isActive } = req.body;
  const category = await Category.findByIdAndUpdate(
    req.params.id,
    { name, description, isActive },
    { new: true }
  );

  if (!category) return res.status(404).json({ message: 'Category not found.' });

  await logAudit(req.user._id, 'update_category', category._id, { name, isActive });
  res.json({ category });
});

app.delete('/api/categories/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  await Category.findByIdAndDelete(req.params.id);
  await logAudit(req.user._id, 'delete_category', req.params.id, {});
  res.json({ success: true });
});

app.get('/api/menu', authMiddleware, async (req, res) => {
  const items = await MenuItem.find({}).populate('category').sort({ createdAt: -1 });
  res.json({ items: items.map(formatMenuItem) });
});

app.post('/api/menu', authMiddleware, requireRole('admin'), async (req, res) => {
  const { name, description, category, price, image, isAvailable } = req.body;

  if (!name || !category || Number(price) === undefined) {
    return res.status(400).json({ message: 'Name, category and price are required.' });
  }

  const item = await MenuItem.create({
    name,
    description: description || '',
    category,
    price: Number(price),
    image: image || '',
    isAvailable: typeof isAvailable === 'boolean' ? isAvailable : true,
  });

  await logAudit(req.user._id, 'create_menu_item', item._id, { name, price });
  res.status(201).json({ item: await item.populate('category') });
});

app.put('/api/menu/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  const update = { ...req.body, price: Number(req.body.price) };
  const item = await MenuItem.findByIdAndUpdate(req.params.id, update, { new: true }).populate('category');

  if (!item) {
    return res.status(404).json({ message: 'Menu item not found.' });
  }

  await logAudit(req.user._id, 'update_menu_item', item._id, { name: item.name });
  res.json({ item });
});

app.delete('/api/menu/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  const item = await MenuItem.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ message: 'Menu item not found.' });

  await logAudit(req.user._id, 'delete_menu_item', item._id, { name: item.name });
  res.json({ success: true });
});

app.get('/api/settings', authMiddleware, async (req, res) => {
  const settings = await CafeSetting.findOne();
  res.json({ settings: settings || { cafeName: 'NR_ICE_SPICE', cafeAddress: '', taxRate: 0, currency: 'INR' } });
});

app.put('/api/settings', authMiddleware, requireRole('admin'), async (req, res) => {
  const settings = await CafeSetting.findOneAndUpdate(
    {},
    {
      ...req.body,
      taxRate: 0,
    },
    { new: true, upsert: true }
  );

  await logAudit(req.user._id, 'update_settings', 'cafe_settings', { taxRate: settings.taxRate });
  res.json({ settings });
});

app.get('/api/orders', authMiddleware, async (req, res) => {
  const { status } = req.query;
  const filter = status ? { orderStatus: status } : {};
  const orders = await Order.find(filter).sort({ createdAt: -1 }).populate('createdBy', 'name username role');
  res.json({ orders });
});

app.get('/api/orders/:id', authMiddleware, async (req, res) => {
  const order = await Order.findById(req.params.id).populate('createdBy', 'name username role');
  if (!order) return res.status(404).json({ message: 'Order not found.' });
  res.json({ order });
});

app.post('/api/orders', authMiddleware, [
  body('items').isArray({ min: 1 }).withMessage('Cart must contain at least one item.'),
  body('orderType').isIn(['dine-in', 'takeaway']).withMessage('Order type is invalid.'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { items, orderType, tableNumber, customerName, customerPhone, specialInstructions, discount = 0 } = req.body;
  const settings = await CafeSetting.findOne() || { taxRate: 0 };
  const dbItems = [];
  let subtotal = 0;

  for (const cartItem of items) {
    const menuItem = await MenuItem.findById(cartItem.itemId).populate('category');
    if (!menuItem || !menuItem.isAvailable) {
      return res.status(400).json({ message: `Item ${cartItem.name || 'selected'} is unavailable.` });
    }

    const quantity = Number(cartItem.quantity || 1);
    const unitPrice = Number(menuItem.price);
    const lineTotal = unitPrice * quantity;
    subtotal += lineTotal;

    dbItems.push({
      itemId: menuItem._id,
      name: menuItem.name,
      price: unitPrice,
      quantity,
      specialInstructions: cartItem.specialInstructions || '',
      lineTotal,
    });
  }

  const safeDiscount = Number(discount || 0);
  const tax = 0;
  const total = Number((subtotal - safeDiscount).toFixed(2));

  const orderNumber = `NR-${Date.now().toString().slice(-6)}`;
  const order = await Order.create({
    orderNumber,
    orderType,
    tableNumber: orderType === 'dine-in' ? Number(tableNumber || 0) : null,
    customerName: customerName || 'Walk-in',
    customerPhone: customerPhone || '',
    items: dbItems,
    specialInstructions: specialInstructions || '',
    subtotal: Number(subtotal.toFixed(2)),
    discount: safeDiscount,
    tax,
    total,
    paymentStatus: 'pending',
    orderStatus: 'new',
    createdBy: req.user._id,
  });

  await logAudit(req.user._id, 'create_order', order._id, { orderNumber, total });
  io.emit('orders:update', { type: 'new-order', order });

  res.status(201).json({ order: sanitizeOrder(order) });
});

app.patch('/api/orders/:id/status', authMiddleware, requireRole('kitchen', 'admin'), async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['new', 'accepted', 'preparing', 'ready', 'served', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Status is invalid.' });
  }

  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found.' });

  if (order.paymentStatus === 'paid' || order.paymentStatus === 'refunded') {
    return res.status(409).json({ message: 'A paid or refunded order cannot have its fulfillment status changed.' });
  }

  const nextStatus = {
    new: ['accepted', 'cancelled'],
    accepted: ['preparing', 'cancelled'],
    preparing: ['ready', 'cancelled'],
    ready: ['served', 'cancelled'],
    served: [],
    cancelled: [],
  };
  if (!nextStatus[order.orderStatus]?.includes(status)) {
    return res.status(409).json({ message: `Order cannot move from ${order.orderStatus} to ${status}.` });
  }

  order.orderStatus = status;
  await order.save();
  await logAudit(req.user._id, 'update_order_status', order._id, { status });
  io.emit('orders:update', { type: 'status-update', order });
  res.json({ order });
});

app.post('/api/orders/:id/payment', authMiddleware, requireRole('cashier', 'admin'), async (req, res) => {
  const { method = 'cash', amount, paymentConfirmed = false, transactionReference = '' } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({ message: 'Order not found.' });
  }

  if (order.orderStatus !== 'served') {
    return res.status(409).json({ message: 'Payment is available only after the order has been served.' });
  }

  if (order.paymentStatus !== 'pending') {
    return res.status(409).json({ message: 'This order does not have an outstanding payment.' });
  }

  if (!['cash', 'upi', 'card', 'netbanking'].includes(method)) {
    return res.status(400).json({ message: 'Payment method must be cash, UPI, card, or netbanking.' });
  }

  const paymentAmount = Number(amount);
  if (!Number.isFinite(paymentAmount) || Math.abs(paymentAmount - Number(order.total)) > 0.01) {
    return res.status(400).json({ message: 'Payment amount must match the order total.' });
  }

  if (method !== 'cash' && paymentConfirmed !== true) {
    return res.status(409).json({ message: 'Confirm the UPI or card payment before recording it as paid.' });
  }

  const payment = await Payment.create({
    paymentNumber: `PY-${Date.now()}`,
    order: order._id,
    amount: paymentAmount,
    method,
    status: 'confirmed',
    transactionReference,
    receivedBy: req.user._id,
  });

  order.paymentStatus = 'paid';
  order.orderStatus = 'completed';
  await order.save();

  await logAudit(req.user._id, 'record_payment', order._id, { paymentNumber: payment.paymentNumber, method, amount: paymentAmount });
  io.emit('orders:update', { type: 'payment-update', order, payment });
  res.status(201).json({ payment, order });
});

app.get('/api/payments', authMiddleware, async (req, res) => {
  const payments = await Payment.find({}).sort({ createdAt: -1 }).populate('order').populate('receivedBy', 'name username role');
  res.json({ payments });
});

app.post('/api/orders/:id/refund', authMiddleware, requireRole('admin'), async (req, res) => {
  const { reason = 'Manual refund' } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({ message: 'Order not found.' });
  }

  if (order.paymentStatus !== 'paid') {
    return res.status(409).json({ message: 'Only a paid order can be refunded.' });
  }

  const refundPayment = await Payment.create({
    paymentNumber: `RF-${Date.now()}`,
    order: order._id,
    amount: Number(order.total || 0),
    method: 'cash',
    status: 'refunded',
    transactionReference: `REFUND-${Date.now()}`,
    receivedBy: req.user._id,
  });

  order.paymentStatus = 'refunded';
  order.orderStatus = 'cancelled';
  await order.save();

  await logAudit(req.user._id, 'refund_order', order._id, { reason, refundAmount: order.total });
  io.emit('orders:update', { type: 'refund-update', order, refund: refundPayment });
  res.json({ refund: refundPayment, order });
});

app.get('/api/dashboard', authMiddleware, async (req, res) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [totalSales, totalOrders, pendingOrders, preparingOrders, completedOrders, cancelledOrders, paymentRows, recentOrders, popularItems] = await Promise.all([
    Order.aggregate([{ $match: { createdAt: { $gte: startOfDay } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
    Order.countDocuments(),
    Order.countDocuments({ orderStatus: { $in: ['new', 'accepted'] } }),
    Order.countDocuments({ orderStatus: 'preparing' }),
    Order.countDocuments({ orderStatus: { $in: ['served', 'completed'] } }),
    Order.countDocuments({ orderStatus: 'cancelled' }),
    Payment.find().sort({ createdAt: -1 }).limit(8).populate('order'),
    Order.find().sort({ createdAt: -1 }).limit(8).populate('createdBy', 'name role'),
    Order.aggregate([
      { $unwind: '$items' },
      { $group: { _id: '$items.name', totalSold: { $sum: '$items.quantity' } } },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
    ]),
  ]);

  const salesByDay = [];
  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const nextDay = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
    const count = await Order.countDocuments({ createdAt: { $gte: dayStart, $lt: nextDay } });
    const total = await Order.aggregate([{ $match: { createdAt: { $gte: dayStart, $lt: nextDay } } }, { $group: { _id: null, amount: { $sum: '$total' } } }]);
    salesByDay.push({ label: day.toLocaleDateString('en-US', { weekday: 'short' }), amount: total[0]?.amount || 0, count });
  }

  res.json({
    stats: {
      totalSales: totalSales[0]?.total || 0,
      totalOrders: totalOrders,
      pendingOrders: pendingOrders,
      preparingOrders: preparingOrders,
      completedOrders: completedOrders,
      cancelledOrders: cancelledOrders,
    },
    recentTransactions: paymentRows,
    recentOrders,
    popularItems,
    salesByDay,
  });
});

app.get('/api/reports', authMiddleware, async (req, res) => {
  const orders = await Order.find({}).sort({ createdAt: -1 });
  const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const totalDiscount = orders.reduce((sum, order) => sum + (order.discount || 0), 0);

  res.json({
    totalRevenue,
    totalDiscount,
    totalOrders: orders.length,
    orders,
  });
});

if (existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    return res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: error.message || 'Internal server error.' });
});


const startServer = async () => {
  try {
    await connectDB();
    await seedDatabase();

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`NR_ICE_SPICE API running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};


io.on('connection', (socket) => {
  socket.on('join-room', (room) => socket.join(room));
  socket.on('disconnect', () => console.log('Socket disconnected'));
});

startServer();
