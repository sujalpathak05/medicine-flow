import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller is admin
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) throw new Error(authError?.message || "Invalid token");

    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from("profiles")
      .select("pharmacy_id")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (callerProfileError || !callerProfile?.pharmacy_id) {
      throw new Error("Caller pharmacy not found");
    }

    const { data: roleCheck } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .eq("pharmacy_id", callerProfile.pharmacy_id)
      .maybeSingle();

    if (!roleCheck) throw new Error("Admin access required");

    const { action, ...params } = await req.json();

    // Helper: call GoTrue Admin API directly
    const gotrueAdmin = async (method: string, path: string, body?: Record<string, unknown>) => {
      const res = await fetch(`${supabaseUrl}/auth/v1/admin${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || data.message || data.error || JSON.stringify(data));
      return data;
    };

    const assertSamePharmacyUser = async (userId: string) => {
      const { data: targetProfile, error: targetError } = await supabaseAdmin
        .from("profiles")
        .select("pharmacy_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (targetError || targetProfile?.pharmacy_id !== callerProfile.pharmacy_id) {
        throw new Error("User does not belong to your pharmacy");
      }
    };

    if (action === "create_user") {
      const { email, password, full_name, role } = params;
      const allowedRoles = ["admin", "user", "staff", "cashier"];
      const safeRole = allowedRoles.includes(String(role)) ? String(role) : "user";

      const newUser = await gotrueAdmin("POST", "/users", {
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });

      const { data: newProfile } = await supabaseAdmin
        .from("profiles")
        .select("pharmacy_id")
        .eq("user_id", newUser.id)
        .maybeSingle();

      const { error: profileUpdateError } = await supabaseAdmin
        .from("profiles")
        .update({
          full_name,
          email,
          pharmacy_id: callerProfile.pharmacy_id,
        })
        .eq("user_id", newUser.id);
      if (profileUpdateError) throw profileUpdateError;

      const { error: roleUpdateError } = await supabaseAdmin
        .from("user_roles")
        .update({
          role: safeRole,
          pharmacy_id: callerProfile.pharmacy_id,
        })
        .eq("user_id", newUser.id);
      if (roleUpdateError) throw roleUpdateError;

      if (newProfile?.pharmacy_id && newProfile.pharmacy_id !== callerProfile.pharmacy_id) {
        const { error: oldPharmacyDeleteError } = await supabaseAdmin
          .from("pharmacies")
          .delete()
          .eq("id", newProfile.pharmacy_id)
          .eq("owner_id", newUser.id);
        if (oldPharmacyDeleteError) throw oldPharmacyDeleteError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          user: { id: newUser.id, email },
          message: `User created. Login: ${email} / ${password}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "reset_password") {
      const { user_id, new_password } = params;
      await assertSamePharmacyUser(String(user_id));
      await gotrueAdmin("PUT", `/users/${user_id}`, { password: new_password });
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete_user") {
      const { user_id } = params;
      if (user_id === caller.id) throw new Error("You cannot delete your own account");
      await assertSamePharmacyUser(String(user_id));
      await gotrueAdmin("DELETE", `/users/${user_id}`);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Unknown action");
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
