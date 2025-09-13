import orderModel from "../models/orderModel.js";
import userModel from '../models/userModel.js';
import Stripe from "stripe";
import jwt from "jsonwebtoken"; 

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const placeOrder = async (req, res) => {
  const frontend_url = "http://localhost:5174";
  try {
    const authHeader = req.headers.authorization || "";
    const headerToken = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : req.headers.token;
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
      return res.status(400).json({ success: false, message: "Missing userId or invalid token" });
    }
    
    const items = req.body.items;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "No items provided" });
    }
    
    const itemsTotal = items.reduce((sum, it) => {
      const price = Number(it.price) || 0;
      const qty = Number(it.quantity) || 0;
      return sum + price * qty;
    }, 0);
    
    const deliveryFee = 30;
    const totalAmount = itemsTotal + deliveryFee;
    
    const newOrder = new orderModel({
      userId,
      items,
      amount: totalAmount,
      address: req.body.address
    });
    
    await newOrder.save();
    await userModel.findByIdAndUpdate(userId, { cartData: {} });
    
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
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: "payment",
      success_url: `${frontend_url}/verify?success=true&orderId=${newOrder._id}`,
      cancel_url: `${frontend_url}/verify?success=false&orderId=${newOrder._id}`,
    });
    
    console.log("Stripe session created:", session.url);
    return res.json({ success: true, session_url: session.url, orderId: newOrder._id });
  } catch (error) {
    console.error("placeOrder error:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

const verifyOrder = async(req,res) =>{
  const {orderId,success} = req.body;
  try {
    if (success=="true") {
      await orderModel.findByIdAndUpdate(orderId,{payment:true});
      res.json({success:true,message:"Paid"})
    }
    else{
      await orderModel.findByIdAndDelete(orderId);
      res.json({success:false,message:"Not Paid"})
    }
  } catch (error) {
    console.log(error);
    res.json({success:false,message:"Error"})
  }
}

// Fixed userOrders function to work with authMiddleware
const userOrders = async (req, res) => {
  try {
    console.log("=== userOrders Debug Info ===");
    console.log("req.body:", req.body);
    console.log("req.user (from middleware):", req.user);
    
    // Get userId from middleware (authMiddleware sets req.user.id)
    const userId = req.user?.id;
    
    console.log("userId from middleware:", userId);
    console.log("userId type:", typeof userId);
    
    if (!userId) {
      console.log("No userId found from middleware");
      return res.status(400).json({ success: false, message: "User not authenticated" });
    }
    
    // Find orders for the user
    const orders = await orderModel.find({ userId });
    console.log("Orders found:", orders.length);
    
    res.json({ success: true, data: orders });
    
  } catch (error) {
    console.log("=== userOrders ERROR ===");
    console.log("Error:", error.message);
    
    res.status(500).json({ success: false, message: "Error fetching orders" });
  }
}

//Listing orders for admin panel
const listOrders = async (req,res) =>{
  try {
    const orders = await orderModel.find({});
    res.json({success:true,data:orders})
  } catch (error) {
    console.log(error);
    res.json({success:false,message:"Error"})
  }
}

//api for updating order status
const updateStatus = async (req,res) => {
  try {
    await orderModel.findByIdAndUpdate(req.body.orderId,{status:req.body.status})
    res.json({success:true,message:"Status Updated"})
  } catch (error) {
    console.log(error);
    res.json({success:false,message:"Error"})    
  }
}

export { placeOrder, verifyOrder, userOrders, listOrders, updateStatus };