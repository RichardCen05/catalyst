"use client";

import { create } from "zustand";
import type { ChatAnswer } from "@/lib/types";

export interface CopilotMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  answer?: ChatAnswer;
  /** Set when the request itself failed. The text then names the failure
   *  instead of standing in for an answer the engine never produced. */
  failed?: boolean;
}

interface CopilotSession {
  messages: CopilotMessage[];
  input: string;
  /** Route the reader expanded from, so collapsing returns them there. */
  returnPath: string | null;
  append: (message: CopilotMessage) => void;
  setInput: (input: string) => void;
  setReturnPath: (returnPath: string | null) => void;
  reset: () => void;
}

/**
 * The conversation lives outside the persisted store on purpose.
 *
 * Expanding the panel unmounts it and mounts the `/copilot` copy, so the
 * messages cannot be component state or the transition loses them. They are
 * also not worth writing to localStorage: an answer carries its full citation
 * list, and a restored conversation would quote recordings from a snapshot the
 * app may no longer be serving.
 */
export const useCopilotSession = create<CopilotSession>()((set) => ({
  messages: [],
  input: "",
  returnPath: null,
  append: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setInput: (input) => set({ input }),
  setReturnPath: (returnPath) => set({ returnPath }),
  reset: () => set({ messages: [], input: "", returnPath: null }),
}));
