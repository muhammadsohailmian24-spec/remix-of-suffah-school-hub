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
    const { email, fullName, phone, role, roleSpecificData } = body;
    
    // Default password is 123456 for students and parents
    const password = body.password || "123456";

    if (!fullName || !role) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For students, use student ID-based email format
    // For parents, use CNIC-based email format
    let userEmail = email;
    let studentId = roleSpecificData?.student_id;
    const adminProvidedId = !!studentId; // Track if admin provided the ID
    let fatherCnic = roleSpecificData?.father_cnic;
    
    if (role === "student") {
      // Only generate student ID if admin didn't provide one
      if (!studentId) {
        studentId = `STU${new Date().getFullYear()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      }
      
      // Create email from student ID (studentid@suffah.local)
      userEmail = `${studentId.toLowerCase()}@suffah.local`;
      
      // Check if student ID already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const emailExists = existingUsers?.users?.some(u => u.email === userEmail);
      
      if (emailExists) {
        // If admin provided the ID and it exists, return error - don't auto-generate
        if (adminProvidedId) {
          return new Response(JSON.stringify({ 
            error: `Student ID "${studentId}" is already in use. Please enter a different ID.` 
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        // Only auto-generate if admin didn't provide an ID
        let attempts = 0;
        while (attempts < 10) {
          studentId = `STU${new Date().getFullYear()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
          userEmail = `${studentId.toLowerCase()}@suffah.local`;
          
          const exists = existingUsers?.users?.some(u => u.email === userEmail);
          if (!exists) break;
          attempts++;
        }
        
        if (attempts >= 10) {
          return new Response(JSON.stringify({ error: "Could not generate unique student ID. Please try again." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } else if (role === "parent") {
      // For parents, use CNIC as the login identifier
      if (!fatherCnic) {
        return new Response(JSON.stringify({ error: "Father's CNIC is required for parent accounts" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Clean CNIC and use as email format
      const cleanCnic = fatherCnic.replace(/-/g, "");
      userEmail = `${cleanCnic}@suffah.local`;
      
      // Check if parent with this CNIC already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingParent = existingUsers?.users?.find(u => u.email === userEmail);
      
      if (existingParent) {
        return new Response(JSON.stringify({ 
          error: "A parent account with this CNIC already exists. Please use a different CNIC or edit the existing parent." 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (!email) {
      return new Response(JSON.stringify({ error: "Email is required for staff users" }), {
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
      // Provide more helpful error messages
      if (createError.message.includes("already been registered")) {
        return new Response(JSON.stringify({ 
          error: role === "student" 
            ? `Student ID "${studentId}" is already in use. Please use a different ID.`
            : "A user with this email/CNIC already exists."
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = newUser.user.id;

    // Create or update profile - ensure profile exists with all data
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        user_id: userId,
        email: userEmail || "",
        full_name: fullName,
        phone: phone || null,
      }, { onConflict: "user_id" });

    if (profileError) {
      console.error("Error creating/updating profile:", profileError);
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
          student_id: studentId, // Use the admin-provided or generated studentId
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
      const cleanCnic = roleSpecificData?.father_cnic?.replace(/-/g, "") || null;
      const { error: parentError } = await supabaseAdmin
        .from("parents")
        .insert({
          user_id: userId,
          occupation: roleSpecificData?.occupation || null,
          relationship: roleSpecificData?.relationship || "father",
          father_cnic: cleanCnic,
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
