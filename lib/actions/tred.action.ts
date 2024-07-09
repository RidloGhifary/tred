"use server";

import { revalidatePath } from "next/cache";

import { connectToDB } from "../mongoose";
import Tred from "../models/tred.model";
import User from "../models/user.model";

export async function fetchPosts(pageNumber = 1, pageSize = 20) {
  connectToDB();

  const skipAmount = (pageNumber - 1) * pageSize;

  const postsQuery = Tred.find({ parentId: { $in: [null, undefined] } })
    .sort({ createdAt: "desc" })
    .skip(skipAmount)
    .limit(pageSize)
    .populate({
      path: "author",
      model: User,
    })
    .populate({
      path: "children",
      populate: {
        path: "author",
        model: User,
        select: "_id name parentId image",
      },
    });

  const totalPostsCount = await Tred.countDocuments({
    parentId: { $in: [null, undefined] },
  });

  const posts = await postsQuery.exec();

  const isNext = totalPostsCount > skipAmount + posts.length;

  return { posts, isNext };
}

interface Params {
  text: string;
  author: string;
  path: string;
}

export async function createTred({ text, author, path }: Params) {
  try {
    connectToDB();

    const createTred = await Tred.create({
      text,
      author,
    });

    await User.findByIdAndUpdate(author, {
      $push: { treds: createTred._id },
    });

    revalidatePath(path);
  } catch (error: any) {
    throw new Error(`Failed to create tred: ${error.message}`);
  }
}
