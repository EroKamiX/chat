const mongoose = require("mongoose");

const ConversationSchema = new mongoose.Schema(
  {
    members: {
      type: Array,
      ref: 'User' 
    },
    status: {
      type: Boolean,
      default: true,
    },
    
  },
  { timestamps: true }
);

module.exports = mongoose.model("Conversation", ConversationSchema);
