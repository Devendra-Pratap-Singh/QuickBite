import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    items: {
      type: Array,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    address: {
      type: Object,
      required: true,
    },
    payment: {
      type: Boolean,
      default: false, // false = not paid yet
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "preparing", "out-for-delivery", "delivered", "cancelled"],
      default: "pending", // initial state when order is placed
    },
    paymentId: {
      type: String, // Stripe paymentIntent or session ID (optional)
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true } // adds createdAt & updatedAt automatically
);

const orderModel = mongoose.models.orders || mongoose.model("orders", orderSchema);
export default orderModel;
