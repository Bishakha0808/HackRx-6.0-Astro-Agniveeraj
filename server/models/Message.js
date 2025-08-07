import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  content: String,
  sender: {
    type: String,
    enum: ['user', 'bot'],
    default: 'user',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Message", messageSchema);
