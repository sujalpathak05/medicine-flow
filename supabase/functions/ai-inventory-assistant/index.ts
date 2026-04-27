import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are an AI Inventory Assistant for Medi Inventory - a Medicine Inventory Management System used by Indian pharmacies.

You have access to real-time inventory data provided in the context. Use this data to answer questions accurately.

Your capabilities:
1. **Stock Prediction**: Analyze sales trends and predict which medicines need reordering. Calculate reorder points based on sales velocity.
2. **Smart Reorder Alerts**: Identify medicines below minimum stock and suggest order quantities based on average daily sales.
3. **Expiry Management**: Flag medicines expiring soon, suggest discounts for near-expiry items, and recommend return-to-supplier for items expiring within 30 days.
4. **Sales Analysis**: Identify fast/slow moving items, profitable products, and sales trends.
5. **General Inventory Queries**: Answer any question about stock levels, pricing, branches, etc.

IMPORTANT RULES:
- Always respond in Hindi (Hinglish is OK) since users are Indian pharmacy operators
- Use ₹ for currency
- Be specific with numbers and medicine names
- Give actionable recommendations
- Format responses clearly with bullet points and sections
- When predicting stock needs, consider expiry dates too
- If data is insufficient for prediction, say so honestly

CURRENT INVENTORY CONTEXT:
${context}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m: any) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Sorry, response generate नहीं हो सका।";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
