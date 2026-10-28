import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    specialInstructions: { type: String, default: '' },
    lineTotal: { type: Number, required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    orderType: { type: String, enum: ['dine-in', 'takeaway'], required: true },
    tableNumber: { type: Number, default: null },
    customerName: { type: String, default: '' },
    customerPhone: { type: String, default: '' },
    items: [orderItemSchema],
    specialInstructions: { type: String, default: '' },
    subtotal: { type: Number, required: true, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true, default: 0 },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'partially_paid', 'refunded'], default: 'pending' },
    orderStatus: { type: String, enum: ['new', 'accepted', 'preparing', 'ready', 'served', 'cancelled', 'completed'], default: 'new' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Order', orderSchema);
