import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_PRICING = { input: 0.1, output: 0.4 };
const MODEL_PRICING = {
  "google/gemini-3-flash-preview": { input: 0.1, output: 0.4 },
  "google/gemini-2.5-flash": { input: 0.3, output: 2.5 },
} as const;

const getPricing = (model: string) => {
  if (model in MODEL_PRICING) {
    return MODEL_PRICING[model as keyof typeof MODEL_PRICING];
  }

  if (model.includes("2.5-flash")) return MODEL_PRICING["google/gemini-2.5-flash"];
  if (model.includes("3-flash")) return MODEL_PRICING["google/gemini-3-flash-preview"];
  return DEFAULT_PRICING;
};

export const getServiceClient = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, serviceKey);
};

export async function getUserIdFromAuthHeader(authHeader?: string | null): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) return null;

  const anonClient = createClient(supabaseUrl, anonKey);
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await anonClient.auth.getUser(token);

  if (error) {
    console.error("Failed to resolve auth user for AI usage logging:", error);
    return null;
  }

  return data.user?.id ?? null;
}

export function extractAiUsage(args: {
  aiData: any;
  completionSource: string;
  model: string;
  promptSource: string;
}) {
  const { aiData, promptSource, completionSource, model } = args;
  const usage = aiData?.usage;

  const promptTokens = usage?.prompt_tokens ?? Math.ceil(promptSource.length / 4);
  const completionTokens = usage?.completion_tokens ?? Math.ceil(completionSource.length / 4);
  const totalTokens = usage?.total_tokens ?? promptTokens + completionTokens;
  const pricing = getPricing(model);
  const estimatedCostUsd =
    (promptTokens / 1_000_000) * pricing.input +
    (completionTokens / 1_000_000) * pricing.output;

  return {
    promptTokens,
    completionTokens,
    totalTokens,
    estimatedCostUsd,
  };
}

export async function logAiUsage(args: {
  aiData: any;
  completionSource: string;
  model: string;
  promptSource: string;
  sessionId?: string | null;
  userId?: string | null;
}) {
  const { userId, sessionId = null, model, aiData, promptSource, completionSource } = args;
  if (!userId) return;

  try {
    const usage = extractAiUsage({ aiData, model, promptSource, completionSource });
    const client = getServiceClient();

    // Insert usage log
    await client.from("ai_usage_logs").insert({
      user_id: userId,
      session_id: sessionId,
      prompt_tokens: usage.promptTokens,
      completion_tokens: usage.completionTokens,
      total_tokens: usage.totalTokens,
      estimated_cost_usd: usage.estimatedCostUsd,
      model,
    });

    // Increment tokens_used_this_month in user_plans
    const { data: planData } = await client
      .from("user_plans")
      .select("id, tokens_used_this_month")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (planData) {
      await client
        .from("user_plans")
        .update({
          tokens_used_this_month: (planData.tokens_used_this_month || 0) + usage.totalTokens,
        })
        .eq("id", planData.id);
    }
  } catch (error) {
    console.error("AI usage logging failed:", error);
  }
}
