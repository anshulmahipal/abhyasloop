"use client";

import { useFormState } from "react-dom";
import {
  submitContactMessage,
  type ContactFormState,
} from "@/app/actions/contact";
import { SubmitButton } from "./SubmitButton";

const initialState: ContactFormState = {
  success: false,
  message: "",
};

export default function ContactPage() {
  const [state, formAction] = useFormState(submitContactMessage, initialState);

  if (state?.success) {
    return (
      <main className="min-h-screen bg-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold text-gray-900">Contact Us</h1>
          <div className="mt-10 rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <p className="text-lg font-semibold text-emerald-800">
              Thank you for reaching out!
            </p>
            <p className="mt-2 text-emerald-700">{state.message}</p>
            <p className="mt-4 text-sm text-emerald-600">
              We&apos;ll get back to you soon.
            </p>
          </div>
          <div className="mt-6">
            <h2 className="text-xl font-semibold text-gray-900">Get in Touch</h2>
            <div className="mt-4 space-y-3 text-gray-600">
              <p>
                <span className="font-medium text-gray-900">Email:</span>{" "}
                <a
                  href="mailto:support@tyariwale.com"
                  className="text-emerald-600 hover:text-emerald-700"
                >
                  support@tyariwale.com
                </a>
              </p>
              <p>
                <span className="font-medium text-gray-900">Location:</span> New
                Delhi, India
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-gray-900">
          Contact Us
        </h1>
        <p className="mt-2 text-gray-600">
          Have a question? We&apos;d love to hear from you.
        </p>

        <div className="mt-10 grid gap-10 sm:grid-cols-2">
          {/* Left: Get in Touch */}
          <div>
            <h2 className="text-xl font-semibold text-emerald-600">
              Get in Touch
            </h2>
            <div className="mt-4 space-y-3 text-gray-600">
              <p>
                <span className="font-medium text-gray-900">Email:</span>{" "}
                <a
                  href="mailto:support@tyariwale.com"
                  className="text-emerald-600 hover:text-emerald-700"
                >
                  support@tyariwale.com
                </a>
              </p>
              <p>
                <span className="font-medium text-gray-900">Location:</span> New
                Delhi, India
              </p>
            </div>
          </div>

          {/* Right: Form */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-6">
            <form action={formAction} className="space-y-4">
              <div>
                <label
                  htmlFor="contact-name"
                  className="block text-sm font-medium text-gray-900"
                >
                  Name
                </label>
                <input
                  id="contact-name"
                  name="name"
                  type="text"
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label
                  htmlFor="contact-email"
                  className="block text-sm font-medium text-gray-900"
                >
                  Email
                </label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label
                  htmlFor="contact-message"
                  className="block text-sm font-medium text-gray-900"
                >
                  Message
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  rows={4}
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Your message"
                />
              </div>
              {state?.message && !state?.success && (
                <p className="text-sm text-red-600">{state.message}</p>
              )}
              <SubmitButton />
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
