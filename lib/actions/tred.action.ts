"use server";

import { revalidatePath } from "next/cache";

import { connectToDB } from "../mongoose";
import Tred from "../models/tred.model";
import User from "../models/user.model";

interface Params {
  text: string;
  author: string;
  path: string;
}

export async function createThread({ text, author, path }: Params) {
  try {
    connectToDB();

    const createdThread = await Tred.create({
      text,
      author,
    });

    await User.findByIdAndUpdate(author, {
      $push: { threads: createdThread._id },
    });

    revalidatePath(path);
  } catch (error: any) {
    throw new Error(`Failed to create thread: ${error.message}`);
  }
}
