import mongoose from "mongoose";

export const connectDB = async() => {
    await mongoose.connect('mongodb+srv://Devendra:MUMMYandPAPA1@cluster0.ft6hctn.mongodb.net/food-delivery').then(()=>console.log("DB Connected"));

}