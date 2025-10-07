import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Stripe from "stripe";
import jwt from "jsonwebtoken";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ✅ PLACE ORDER (create Stripe session + save pending order)
const placeOrder = async (req, res) => {
  const frontend_url = "https://quickbite-frontend-tj2n.onrender.com"; // update if needed


  try {
    // --- Verify user token or userId ---
    const authHeader = req.headers.authorization || "";
    const headerToken = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : req.headers.token;
    let userId = req.body.userId;

    if (!userId && headerToken) {
      try {
        const decoded = jwt.verify(headerToken, process.env.JWT_SECRET);
        userId = decoded.id || decoded.userId || decoded._id;
      } catch (err) {
        console.log("Token verify failed:", err.message);
      }
    }

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing userId or invalid token" });
    }

    // --- Validate items ---
    const items = req.body.items;
    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No items provided" });
    }

    // --- Calculate totals ---
    const itemsTotal = items.reduce((sum, it) => {
      const price = Number(it.price) || 0;
      const qty = Number(it.quantity) || 0;
      return sum + price * qty;
    }, 0);

    const deliveryFee = 30;
    const totalAmount = itemsTotal + deliveryFee;

    // --- Create pending order in DB ---
    const newOrder = new orderModel({
      userId,
      items,
      amount: totalAmount,
      address: req.body.address,
      payment: false, // initially unpaid
      status: "pending",
    });

    await newOrder.save();

    // --- Clear user's cart ---
    await userModel.findByIdAndUpdate(userId, { cartData: {} });

    // --- Prepare Stripe line items ---
    const line_items = items.map((item) => ({
      price_data: {
        currency: "inr",
        product_data: { name: item.name || "Item" },
        unit_amount: Math.round((Number(item.price) || 0) * 100),
      },
      quantity: Number(item.quantity) || 1,
    }));

    line_items.push({
      price_data: {
        currency: "inr",
        product_data: { name: "Delivery Charges" },
        unit_amount: deliveryFee * 100,
      },
      quantity: 1,
    });

    // --- Create Stripe Checkout session ---
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      success_url: `${frontend_url}/verify?session_id={CHECKOUT_SESSION_ID}&orderId=${newOrder._id}`,
      cancel_url: `${frontend_url}/verify?cancel=true&orderId=${newOrder._id}`,
    });

    console.log("Stripe session created:", session.url);

    // --- Send session info to frontend ---
    return res.json({
      success: true,
      session_url: session.url,
      orderId: newOrder._id,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("placeOrder error:", error);
    return res
      .status(500)
      .json({ success: false, message: error.message || "Server error" });
  }
};

// ✅ VERIFY ORDER (called after Stripe redirects user)
const verifyOrder = async (req, res) => {
  const { orderId, sessionId } = req.body;

  try {
    if (!sessionId || !orderId) {
      return res.status(400).json({ success: false, message: "Missing data" });
    }

    // --- Retrieve Stripe session details ---
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      // ✅ Payment confirmed
      await orderModel.findByIdAndUpdate(orderId, {
        payment: true,
        status: "confirmed",
      });

      return res.json({
        success: true,
        message: "Payment verified and order confirmed",
      });
    } else {
      // ❌ Payment not completed or canceled
      await orderModel.findByIdAndUpdate(orderId, {
        payment: false,
        status: "cancelled",
      });

      return res.json({
        success: false,
        message: "Payment not completed or cancelled",
      });
    }
  } catch (error) {
    console.error("verifyOrder error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error verifying payment" });
  }
};

// ✅ Get orders of a user (authMiddleware required)
const userOrders = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res
        .status(400)
        .json({ success: false, message: "User not authenticated" });

    const orders = await orderModel.find({ userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error("userOrders error:", error);
    res.status(500).json({ success: false, message: "Error fetching orders" });
  }
};

// ✅ Admin: list all orders
const listOrders = async (req, res) => {
  try {
    const orders = await orderModel.find({}).sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error("listOrders error:", error);
    res.status(500).json({ success: false, message: "Error fetching orders" });
  }
};

// ✅ Admin: update order status
const updateStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;
    await orderModel.findByIdAndUpdate(orderId, { status });
    res.json({ success: true, message: "Status Updated" });
  } catch (error) {
    console.error("updateStatus error:", error);
    res.status(500).json({ success: false, message: "Error updating status" });
  }
};

export { placeOrder, verifyOrder, userOrders, listOrders, updateStatus };

