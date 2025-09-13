import userModel from "../models/userModel.js";

// add items to user cart
const addToCart = async (req, res) => {
  try {
    const userId = req.user.id; // ✅ take from auth middleware
    const { itemId } = req.body;

    let userData = await userModel.findById(userId);
    if (!userData) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    let cartData = userData.cartData || {}; // ✅ initialize empty object if undefined

    if (!cartData[itemId]) {
      cartData[itemId] = 1;
    } else {
      cartData[itemId] += 1;
    }

    await userModel.findByIdAndUpdate(userId, { cartData }, { new: true });

    res.json({ success: true, message: "Added To Cart", cartData });
  } catch (error) {
    console.error("addToCart error:", error.message);
    res.status(500).json({ success: false, message: "Error adding to cart" });
  }
};

// remove items from user cart
const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id; // ✅ from token
    const { itemId } = req.body;

    let userData = await userModel.findById(userId);
    if (!userData) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    let cartData = userData.cartData || {};

    if (cartData[itemId] > 0) {
      cartData[itemId] -= 1;
    }

    await userModel.findByIdAndUpdate(userId, { cartData }, { new: true });

    res.json({ success: true, message: "Removed From Cart", cartData });
  } catch (error) {
    console.error("removeFromCart error:", error.message);
    res.status(500).json({ success: false, message: "Error removing from cart" });
  }
};

// fetch user cart data
const getCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const userData = await userModel.findById(userId);
    if (!userData) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, cartData: userData.cartData || {} });
  } catch (error) {
    console.error("getCart error:", error.message);
    res.status(500).json({ success: false, message: "Error fetching cart" });
  }
};

export { addToCart, removeFromCart, getCart };
