import mongoose from 'mongoose';

const cafeSettingSchema = new mongoose.Schema(
  {
    cafeName: { type: String, default: 'NR_ICE_SPICE' },
    cafeAddress: { type: String, default: '' },
    taxRate: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    contactNumber: { type: String, default: '' },
    upiId: { type: String, default: 'yuktheshgowda91@okhdfcbank', trim: true },
  },
  { timestamps: true }
);

export default mongoose.model('CafeSetting', cafeSettingSchema);
