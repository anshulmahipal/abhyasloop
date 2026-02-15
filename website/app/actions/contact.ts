"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export type ContactFormState = {
  success: boolean;
  message: string;
};

export async function submitContactMessage(
  _prevState: ContactFormState | null,
  formData: FormData
): Promise<ContactFormState> {
  const name = (formData.get("name") as string)?.trim() ?? "";
  const email = (formData.get("email") as string)?.trim() ?? "";
  const message = (formData.get("message") as string)?.trim() ?? "";

  if (!name) {
    return { success: false, message: "Please enter your name." };
  }
  if (!email) {
    return { success: false, message: "Please enter your email." };
  }
  if (!message) {
    return { success: false, message: "Please enter a message." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("contact_messages").insert({
      name,
      email,
      message,
    });

    if (error) {
      console.error("contact_messages insert error:", error);
      return { success: false, message: "Something went wrong. Please try again." };
    }

    revalidatePath("/contact");
    return { success: true, message: "Message sent!" };
  } catch (err) {
    console.error("submitContactMessage error:", err);
    return { success: false, message: "Something went wrong. Please try again." };
  }
}
