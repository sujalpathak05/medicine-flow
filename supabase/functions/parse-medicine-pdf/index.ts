import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { pdfText, branchId } = await req.json();
    if (!pdfText || !branchId) {
      return new Response(JSON.stringify({ error: "pdfText and branchId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract token and verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use AI to parse the PDF text into structured medicine data
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
  Determine category from name: TAB/TABLET=tablet, CAP/CAPSULE=capsule, SYRUP=syrup, INJ/INJECTION=injection, CREAM/OINTMENT/GEL=ointment, DROP=drops, INHALER=inhaler, else other (SHAMPOO/LOTION/SERUM/SOAP/FACEWASH/OIL/POWDER=other)
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

    const aiData = await aiResponse.json();
    let medicines = [];
    
    try {
      const content = aiData.choices[0].message.content;
      // Try to parse JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        medicines = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: "Failed to parse AI response", details: String(e) }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate categories
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

    // Insert in batches of 50
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
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
