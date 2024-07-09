import mongoose from "mongoose";

const tredSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  parentId: {
    type: String,
  },
  children: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tred",
    },
  ],
});

const Tred = mongoose.models.Tred || mongoose.model("Tred", tredSchema);

export default Tred;
