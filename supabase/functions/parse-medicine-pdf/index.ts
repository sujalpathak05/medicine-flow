import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    let body: any;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { pdfText, branchId } = body;
    if (!pdfText || !branchId) {
      return new Response(JSON.stringify({ error: "pdfText and branchId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Processing PDF text, length:", pdfText.length, "branchId:", branchId);

    // Use AI to parse the PDF text
    const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a medicine data extractor. Extract medicine names from the provided text.
Return a JSON array of objects with these fields:
- name: medicine name (string, uppercase)
- category: one of "tablet", "capsule", "syrup", "injection", "ointment", "drops", "inhaler", "other"
  Determine category from name: TAB/TABLET=tablet, CAP/CAPSULE=capsule, SYRUP=syrup, INJ/INJECTION=injection, CREAM/OINTMENT/GEL=ointment, DROP=drops, INHALER=inhaler, else other
- batch_number: generate as "PDF-YYYYNNNN" where YYYY=2026 and NNNN is sequential 4 digit number
- quantity: extract from stock column if available, default 100. Use positive numbers only.
- price: default 0

IMPORTANT: Return ONLY a valid JSON array, no markdown, no explanation.`
          },
          {
            role: "user",
            content: `Extract medicines from this PDF text:\n\n${pdfText.substring(0, 8000)}`
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI processing failed", details: errText }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let aiData: any;
    try {
      const rawText = await aiResponse.text();
      console.log("AI raw response length:", rawText.length);
      aiData = JSON.parse(rawText);
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", e);
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let medicines = [];
    try {
      const content = aiData.choices?.[0]?.message?.content;
      if (!content) {
        console.error("No content in AI response:", JSON.stringify(aiData).substring(0, 500));
        return new Response(JSON.stringify({ error: "No content from AI" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        medicines = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse medicines from AI content:", e);
      return new Response(JSON.stringify({ error: "Failed to parse AI response content" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validCategories = ["tablet", "capsule", "syrup", "injection", "ointment", "drops", "inhaler", "other"];
    
    const dbRecords = medicines.map((m: any, i: number) => ({
      name: String(m.name || "Unknown").toUpperCase().trim(),
      category: validCategories.includes(m.category) ? m.category : "other",
      batch_number: m.batch_number || `PDF-2026${String(i + 1).padStart(4, "0")}`,
      expiry_date: "2027-12-31",
      price: Math.max(0, Number(m.price) || 0),
      quantity: Math.max(0, Number(m.quantity) || 100),
      min_quantity: 10,
      branch_id: branchId,
    }));

    if (dbRecords.length === 0) {
      return new Response(JSON.stringify({ error: "No medicines found in PDF" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Inserting", dbRecords.length, "medicines");

    let inserted = 0;
    for (let i = 0; i < dbRecords.length; i += 50) {
      const batch = dbRecords.slice(i, i + 50);
      const { error } = await supabase.from("medicines").insert(batch);
      if (error) {
        console.error("Insert error:", error);
      } else {
        inserted += batch.length;
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      total: dbRecords.length,
      inserted,
      medicines: dbRecords.map((m: any) => ({ name: m.name, category: m.category }))
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Unhandled error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
