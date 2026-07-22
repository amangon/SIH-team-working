import mongoose from 'mongoose';

export const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error("mongodb+srv://ramkumargon1_db_user:oDFnTsk1eQJs3u3R@sih.mflphn6.mongodb.net/");
  }

  await mongoose.connect(uri);
  console.log(`✓ MongoDB connected: ${mongoose.connection.host}`);
};
