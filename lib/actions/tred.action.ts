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

export async function fetchTredById(tredId: string) {
  connectToDB();

  try {
    const tred = await Tred.findById(tredId)
      .populate({
        path: "author",
        model: User,
        select: "_id id name image",
      }) // Populate the author field with _id and username
      .populate({
        path: "children", // Populate the children field
        populate: [
          {
            path: "author", // Populate the author field within children
            model: User,
            select: "_id id name parentId image", // Select only _id and username fields of the author
          },
          {
            path: "children", // Populate the children field within children
            model: Tred, // The model of the nested children (assuming it's the same "Thread" model)
            populate: {
              path: "author", // Populate the author field within nested children
              model: User,
              select: "_id id name parentId image", // Select only _id and username fields of the author
            },
          },
        ],
      })
      .exec();

    return tred;
  } catch (err) {
    console.error("Error while fetching tred:", err);
    throw new Error("Unable to fetch tred");
  }
}

export async function addCommentToTred(
  tredId: string,
  commentText: string,
  userId: string,
  path: string
) {
  connectToDB();

  try {
    // Find the original thread by its ID
    const originalTred = await Tred.findById(tredId);

    if (!originalTred) {
      throw new Error("Thread not found");
    }

    // Create the new comment thread
    const commentTred = new Tred({
      text: commentText,
      author: userId,
      parentId: tredId, // Set the parentId to the original thread's ID
    });

    // Save the comment thread to the database
    const savedCommentTred = await commentTred.save();

    // Add the comment thread's ID to the original thread's children array
    originalTred.children.push(savedCommentTred._id);

    // Save the updated original thread to the database
    await originalTred.save();

    revalidatePath(path);
  } catch (err) {
    console.error("Error while adding comment:", err);
    throw new Error("Unable to add comment");
  }
}

async function fetchAllChildTreds(tredId: string): Promise<any[]> {
  const childTreds = await Tred.find({ parentId: tredId });

  const descendantTreds = [];
  for (const childTred of childTreds) {
    const descendants = await fetchAllChildTreds(childTred._id);
    descendantTreds.push(childTred, ...descendants);
  }

  return descendantTreds;
}

export async function deleteTred(id: string, path: string): Promise<void> {
  try {
    connectToDB();

    // Find the thread to be deleted (the main thread)
    const mainTred = await Tred.findById(id).populate("author");

    if (!mainTred) {
      throw new Error("Thread not found");
    }

    // Fetch all child threads and their descendants recursively
    const descendantTreds = await fetchAllChildTreds(id);

    // Get all descendant thread IDs including the main thread ID and child thread IDs
    const descendantTredIds = [
      id,
      ...descendantTreds.map((thread) => thread._id),
    ];

    // Recursively delete child threads and their descendants
    await Tred.deleteMany({ _id: { $in: descendantTredIds } });
    revalidatePath(path);
  } catch (error: any) {
    throw new Error(`Failed to delete thread: ${error.message}`);
  }
}
