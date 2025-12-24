import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "new_assignment" | "results_published";
  classId: string;
  title: string;
  details: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type, classId, title, details }: NotificationRequest = await req.json();

    console.log(`Processing ${type} notification for class ${classId}`);

    // Get students in the class
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("user_id")
      .eq("class_id", classId);

    if (studentsError) {
      console.error("Error fetching students:", studentsError);
      throw studentsError;
    }

    const studentUserIds = students?.map((s: any) => s.user_id) || [];
    
    if (studentUserIds.length === 0) {
      console.log("No students found in class");
      return new Response(
        JSON.stringify({ message: "No students to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .in("user_id", studentUserIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    // Get parent emails
    const { data: studentParents } = await supabase
      .from("student_parents")
      .select("parent_id")
      .in("student_id", students?.map((s: any) => s.id) || []);

    let parentEmails: string[] = [];
    if (studentParents && studentParents.length > 0) {
      const parentIds = studentParents.map((sp: any) => sp.parent_id);
      const { data: parents } = await supabase
        .from("parents")
        .select("user_id")
        .in("id", parentIds);
      
      if (parents && parents.length > 0) {
        const parentUserIds = parents.map((p: any) => p.user_id);
        const { data: parentProfiles } = await supabase
          .from("profiles")
          .select("email")
          .in("user_id", parentUserIds);
        
        parentEmails = parentProfiles?.map((p: any) => p.email) || [];
      }
    }

    const studentEmails = profiles?.map((p: any) => p.email) || [];
    const allEmails = [...new Set([...studentEmails, ...parentEmails])];

    if (allEmails.length === 0) {
      console.log("No emails to send to");
      return new Response(
        JSON.stringify({ message: "No emails found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending emails to ${allEmails.length} recipients`);

    const subject = type === "new_assignment" 
      ? `New Assignment: ${title}`
      : `Results Published: ${title}`;

    const htmlContent = type === "new_assignment"
      ? `
        <h1>📚 New Assignment Posted</h1>
        <h2>${title}</h2>
        <p>${details}</p>
        <p>Please log in to the school portal to view the assignment details and submit your work.</p>
        <p>Best regards,<br>School Management System</p>
      `
      : `
        <h1>📊 Exam Results Published</h1>
        <h2>${title}</h2>
        <p>${details}</p>
        <p>Please log in to the school portal to view your results.</p>
        <p>Best regards,<br>School Management System</p>
      `;

    // Send emails
    const emailResponse = await resend.emails.send({
      from: "School Notifications <onboarding@resend.dev>",
      to: allEmails,
      subject: subject,
      html: htmlContent,
    });

    console.log("Email sent:", emailResponse);

    // Create in-app notifications
    const notifications = studentUserIds.map((userId: string) => ({
      user_id: userId,
      title: subject,
      message: details,
      type: type === "new_assignment" ? "assignment" : "result",
      link: type === "new_assignment" ? "/student/assignments" : "/student/results",
    }));

    const { error: notifError } = await supabase
      .from("notifications")
      .insert(notifications);

    if (notifError) {
      console.error("Error creating notifications:", notifError);
    }

    return new Response(
      JSON.stringify({ success: true, emailsSent: allEmails.length }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
