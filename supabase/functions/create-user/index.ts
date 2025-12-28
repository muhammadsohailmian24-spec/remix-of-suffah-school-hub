import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email?: string; // Optional for students who use ID-based login
  password: string;
  fullName: string;
  phone?: string;
  role: "student" | "teacher" | "parent";
  roleSpecificData?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify the calling user is an admin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user: callingUser }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !callingUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if calling user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callingUser.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: "Only admins can create users" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: CreateUserRequest = await req.json();
    const { email, password, fullName, phone, role, roleSpecificData } = body;

    if (!password || !fullName || !role) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For students, use student ID-based email format
    let userEmail = email;
    let studentId = roleSpecificData?.student_id;
    
    if (role === "student") {
      // Generate student ID if not provided
      if (!studentId) {
        studentId = `STU${new Date().getFullYear()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      }
      // Create email from student ID (studentid@suffah.local)
      userEmail = `${studentId.toLowerCase()}@suffah.local`;
    } else if (!email) {
      return new Response(JSON.stringify({ error: "Email is required for non-student users" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create the user using admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: userEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = newUser.user.id;

    // Update profile with phone if provided
    if (phone) {
      await supabaseAdmin
        .from("profiles")
        .update({ phone })
        .eq("user_id", userId);
    }

    // Add user role
    const { error: roleInsertError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role });

    if (roleInsertError) {
      console.error("Error adding role:", roleInsertError);
    }

    // Create role-specific record
    if (role === "student") {
      const { error: studentError } = await supabaseAdmin
        .from("students")
        .insert({
          user_id: userId,
          student_id: studentId, // Use the studentId we generated/received earlier
          class_id: roleSpecificData?.class_id || null,
          status: "active",
        });

      if (studentError) {
        console.error("Error creating student record:", studentError);
        return new Response(JSON.stringify({ error: "Failed to create student record" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (role === "teacher") {
      const employeeId = roleSpecificData?.employee_id || `EMP${new Date().getFullYear()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      const { error: teacherError } = await supabaseAdmin
        .from("teachers")
        .insert({
          user_id: userId,
          employee_id: employeeId,
          department_id: roleSpecificData?.department_id || null,
          qualification: roleSpecificData?.qualification || null,
          specialization: roleSpecificData?.specialization || null,
          status: "active",
        });

      if (teacherError) {
        console.error("Error creating teacher record:", teacherError);
        return new Response(JSON.stringify({ error: "Failed to create teacher record" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (role === "parent") {
      const { error: parentError } = await supabaseAdmin
        .from("parents")
        .insert({
          user_id: userId,
          occupation: roleSpecificData?.occupation || null,
          relationship: roleSpecificData?.relationship || "parent",
        });

      if (parentError) {
        console.error("Error creating parent record:", parentError);
        return new Response(JSON.stringify({ error: "Failed to create parent record" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      user: { id: userId, email: newUser.user.email },
      student_id: role === "student" ? studentId : undefined
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
