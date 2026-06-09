import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Fixed dev-mode verification code
const DEV_CODE = "123456";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action, phone, code } = body;

    if (!phone || !/^\d{11}$/.test(phone)) {
      return new Response(
        JSON.stringify({ error: "请输入正确的11位手机号" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === SEND CODE ===
    if (action === "send") {
      const otp = DEV_CODE;
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      const { error } = await supabaseAdmin
        .from("phone_verifications")
        .insert({ phone, code: otp, expires_at: expiresAt });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          devCode: otp,
          message: "验证码已发送（开发模式固定验证码：" + otp + "）",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === VERIFY CODE ===
    if (action === "verify") {
      if (!code) {
        return new Response(
          JSON.stringify({ error: "请输入验证码" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check OTP from DB (accepts both generated and dev code)
      const { data: records, error: fetchError } = await supabaseAdmin
        .from("phone_verifications")
        .select("*")
        .eq("phone", phone)
        .eq("code", code)
        .eq("used", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1);

      // Also accept the fixed dev code regardless of DB
      const isDevCode = code === DEV_CODE;
      const validRecord = records && records.length > 0;

      if (!validRecord && !isDevCode) {
        return new Response(
          JSON.stringify({ error: "验证码无效或已过期" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark as used
      if (validRecord) {
        await supabaseAdmin
          .from("phone_verifications")
          .update({ used: true })
          .eq("id", records[0].id);
      }

      // Find employee by phone
      const { data: employee } = await supabaseAdmin
        .from("employees")
        .select("*")
        .eq("phone", phone)
        .maybeSingle();

      // Determine the auth email for this phone
      const authEmail = `${phone}@litaer.local`;
      const password = `Litaer!${phone}#2024`;

      // Find or create auth user
      let userId: string | null = null;
      const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = userList?.users?.find((u) => u.email === authEmail);

      if (existingUser) {
        userId = existingUser.id;
      } else {
        const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: authEmail,
          password,
          email_confirm: true,
        });

        if (createError) {
          return new Response(
            JSON.stringify({ error: "创建用户失败：" + createError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        userId = newUserData.user.id;
      }

      // Ensure employee record exists and is linked to auth user
      if (employee) {
        // Employee exists: make sure user_id is linked
        if (!employee.user_id) {
          await supabaseAdmin
            .from("employees")
            .update({ user_id: userId })
            .eq("id", employee.id);
        }
      } else {
        // No employee record: auto-create one
        const { error: empError } = await supabaseAdmin
          .from("employees")
          .insert({
            user_id: userId,
            name: phone,
            phone,
            project_region: "",
            group_name: "",
            role: "employee",
          });

        if (empError) {
          console.error("Failed to auto-create employee:", empError.message);
        }
      }

      // Now sign in with the known credentials to get a valid session
      const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);

      let session = null;

      const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
        email: authEmail,
        password,
      });

      if (signInError || !signInData.session) {
        // If deterministic password failed, try updating the user's password
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          { password }
        );

        if (updateError) {
          return new Response(
            JSON.stringify({ error: "登录失败，请联系管理员" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Retry sign in
        const { data: retryData, error: retryError } = await supabaseClient.auth.signInWithPassword({
          email: authEmail,
          password,
        });

        if (retryError || !retryData.session) {
          return new Response(
            JSON.stringify({ error: "登录失败，请联系管理员" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        session = retryData.session;
      } else {
        session = signInData.session;
      }

      // Fetch updated employee
      const { data: updatedEmployee } = await supabaseAdmin
        .from("employees")
        .select("*")
        .eq("phone", phone)
        .maybeSingle();

      return new Response(
        JSON.stringify({
          success: true,
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          employee: updatedEmployee,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "无效的操作，请使用 send 或 verify" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "服务器内部错误" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
