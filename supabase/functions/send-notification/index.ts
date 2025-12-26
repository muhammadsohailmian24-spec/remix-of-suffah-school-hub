import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "new_assignment" | "results_published" | "assignment_graded";
  classId?: string;
  studentId?: string; // For individual student notifications
  title: string;
  details: string;
  examName?: string;
  subjectName?: string;
}

async function sendSMS(to: string, message: string): Promise<boolean> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.log("Twilio not configured, skipping SMS");
    return false;
  }

  try {
    // Format phone number for Pakistan
    let formattedPhone = to;
    if (to.startsWith("03")) {
      formattedPhone = "+92" + to.substring(1);
    } else if (!to.startsWith("+")) {
      formattedPhone = "+" + to;
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: formattedPhone,
        From: TWILIO_PHONE_NUMBER,
        Body: message,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`SMS failed to ${formattedPhone}:`, error);
      return false;
    }

    console.log(`SMS sent to ${formattedPhone}`);
    return true;
  } catch (error) {
    console.error(`SMS error to ${to}:`, error);
    return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type, classId, studentId, title, details, examName, subjectName }: NotificationRequest = await req.json();

    console.log(`Processing ${type} notification`, { classId, studentId });

    // Handle individual student notification (assignment_graded)
    if (type === "assignment_graded" && studentId) {
      console.log(`Processing assignment_graded for student ${studentId}`);
      
      // Get the student info
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id, user_id")
        .eq("id", studentId)
        .maybeSingle();
      
      if (studentError || !student) {
        console.error("Error fetching student:", studentError);
        return new Response(
          JSON.stringify({ message: "Student not found", error: studentError?.message }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Get student profile
      const { data: studentProfile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("user_id", student.user_id)
        .maybeSingle();

      // Get parent info for this student
      const { data: studentParents } = await supabase
        .from("student_parents")
        .select("parent_id")
        .eq("student_id", studentId);

      let parentEmails: string[] = [];
      let parentPhones: { phone: string; name: string }[] = [];

      if (studentParents && studentParents.length > 0) {
        const parentIds = studentParents.map((sp: any) => sp.parent_id);
        
        const { data: parents } = await supabase
          .from("parents")
          .select("id, user_id")
          .in("id", parentIds);
        
        if (parents && parents.length > 0) {
          const parentUserIds = parents.map((p: any) => p.user_id);
          
          const { data: parentProfiles } = await supabase
            .from("profiles")
            .select("email, phone, full_name, sms_notifications_enabled")
            .in("user_id", parentUserIds);
          
          if (parentProfiles) {
            parentEmails = parentProfiles.map((p: any) => p.email).filter(Boolean);
            parentPhones = parentProfiles
              .filter((p: any) => p.sms_notifications_enabled && p.phone)
              .map((p: any) => ({ phone: p.phone, name: p.full_name }));
          }
        }
      }

      const studentEmail = studentProfile?.email;
      const studentName = studentProfile?.full_name || "Student";
      const allEmails = [...new Set([studentEmail, ...parentEmails].filter(Boolean))];

      const subject = `📝 Assignment Graded: ${title}`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; border-radius: 12px; color: white; text-align: center;">
            <h1 style="margin: 0;">📝 Assignment Graded</h1>
          </div>
          <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 12px 12px;">
            <h2 style="color: #1e293b; margin-bottom: 10px;">${title}</h2>
            <p style="color: #64748b; line-height: 1.6;">${details}</p>
            <div style="margin-top: 30px; padding: 20px; background: #fff; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; color: #64748b;">Log in to the school portal to view detailed feedback and marks.</p>
            </div>
            <p style="margin-top: 30px; color: #94a3b8; font-size: 14px;">Best regards,<br><strong>The Suffah Public School & College</strong></p>
          </div>
        </div>
      `;

      let emailsSent = 0;
      let smsSent = 0;

      // Send emails
      if (allEmails.length > 0) {
        try {
          await resend.emails.send({
            from: "The Suffah School <onboarding@resend.dev>",
            to: allEmails as string[],
            subject: subject,
            html: htmlContent,
          });
          emailsSent = allEmails.length;
          console.log(`Emails sent to ${emailsSent} recipients`);
        } catch (emailError) {
          console.error("Email error:", emailError);
        }
      }

      // Send SMS to parents who opted in
      for (const parent of parentPhones) {
        const smsMessage = `📝 Assignment "${title}" for ${studentName} has been graded. ${details} Log in to view feedback. - The Suffah School`;
        const sent = await sendSMS(parent.phone, smsMessage);
        if (sent) smsSent++;
      }

      // Create in-app notification for student
      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id: student.user_id,
          title: subject,
          message: details,
          type: "assignment",
          link: "/student/assignments",
        });

      if (notifError) {
        console.error("Error creating notification:", notifError);
      } else {
        console.log("Created in-app notification for student");
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          emailsSent,
          smsSent,
          inAppNotifications: 1,
          message: `Sent ${emailsSent} emails, ${smsSent} SMS, and 1 in-app notification`
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Handle class-wide notifications (new_assignment, results_published)
    if (!classId) {
      console.log("No classId provided for class-wide notification");
      return new Response(
        JSON.stringify({ message: "classId is required for this notification type" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Processing ${type} notification for class ${classId}`);

    // Get students in the class
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("id, user_id")
      .eq("class_id", classId);

    if (studentsError) {
      console.error("Error fetching students:", studentsError);
      throw studentsError;
    }

    const studentUserIds = students?.map((s: any) => s.user_id) || [];
    const studentIds = students?.map((s: any) => s.id) || [];
    
    if (studentUserIds.length === 0) {
      console.log("No students found in class");
      return new Response(
        JSON.stringify({ message: "No students to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get student profiles for emails
    const { data: profiles } = await supabase
      .from("profiles")
      .select("email, full_name, user_id")
      .in("user_id", studentUserIds);

    // Get parent info
    const { data: studentParents } = await supabase
      .from("student_parents")
      .select("parent_id, student_id")
      .in("student_id", studentIds);

    let parentEmails: string[] = [];
    let parentPhones: { phone: string; name: string; studentName: string }[] = [];

    if (studentParents && studentParents.length > 0) {
      const parentIds = [...new Set(studentParents.map((sp: any) => sp.parent_id))];
      
      const { data: parents } = await supabase
        .from("parents")
        .select("id, user_id")
        .in("id", parentIds);
      
      if (parents && parents.length > 0) {
        const parentUserIds = parents.map((p: any) => p.user_id);
        
        const { data: parentProfiles } = await supabase
          .from("profiles")
          .select("email, phone, full_name, sms_notifications_enabled, user_id")
          .in("user_id", parentUserIds);
        
        if (parentProfiles) {
          parentEmails = parentProfiles.map((p: any) => p.email);
          
          // Build parent phone list with student names
          for (const parentProfile of parentProfiles) {
            if (parentProfile.sms_notifications_enabled && parentProfile.phone) {
              // Find which students this parent is linked to
              const parent = parents.find((p: any) => p.user_id === parentProfile.user_id);
              if (parent) {
                const linkedStudentIds = studentParents
                  .filter((sp: any) => sp.parent_id === parent.id)
                  .map((sp: any) => sp.student_id);
                
                const linkedStudentUserIds = students
                  ?.filter((s: any) => linkedStudentIds.includes(s.id))
                  .map((s: any) => s.user_id) || [];
                
                const studentNames = profiles
                  ?.filter((p: any) => linkedStudentUserIds.includes(p.user_id))
                  .map((p: any) => p.full_name)
                  .join(", ") || "your child";
                
                parentPhones.push({
                  phone: parentProfile.phone,
                  name: parentProfile.full_name,
                  studentName: studentNames,
                });
              }
            }
          }
        }
      }
    }

    const studentEmails = profiles?.map((p: any) => p.email) || [];
    const allEmails = [...new Set([...studentEmails, ...parentEmails])];

    const subject = type === "new_assignment" 
      ? `📚 New Assignment: ${title}`
      : `📊 Results Published: ${title}`;

    const htmlContent = type === "new_assignment"
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 30px; border-radius: 12px; color: white; text-align: center;">
            <h1 style="margin: 0;">📚 New Assignment Posted</h1>
          </div>
          <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 12px 12px;">
            <h2 style="color: #1e293b; margin-bottom: 20px;">${title}</h2>
            <p style="color: #64748b; line-height: 1.6;">${details}</p>
            <div style="margin-top: 30px; padding: 20px; background: #fff; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <p style="margin: 0; color: #64748b;">Please log in to the school portal to view the assignment details and submit your work on time.</p>
            </div>
            <p style="margin-top: 30px; color: #94a3b8; font-size: 14px;">Best regards,<br><strong>The Suffah Public School & College</strong></p>
          </div>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; border-radius: 12px; color: white; text-align: center;">
            <h1 style="margin: 0;">📊 Exam Results Published</h1>
          </div>
          <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 12px 12px;">
            <h2 style="color: #1e293b; margin-bottom: 10px;">${examName || title}</h2>
            ${subjectName ? `<p style="color: #64748b; margin-bottom: 20px;"><strong>Subject:</strong> ${subjectName}</p>` : ''}
            <p style="color: #64748b; line-height: 1.6;">${details}</p>
            <div style="margin-top: 30px; padding: 20px; background: #fff; border-radius: 8px; border-left: 4px solid #22c55e;">
              <p style="margin: 0; color: #64748b;">Log in to the school portal to view detailed results, grades, and teacher remarks.</p>
            </div>
            <div style="margin-top: 20px; text-align: center;">
              <p style="color: #16a34a; font-weight: bold;">🎓 Keep up the great work!</p>
            </div>
            <p style="margin-top: 30px; color: #94a3b8; font-size: 14px;">Best regards,<br><strong>The Suffah Public School & College</strong></p>
          </div>
        </div>
      `;

    let emailsSent = 0;
    let smsSent = 0;

    // Send emails
    if (allEmails.length > 0) {
      try {
        await resend.emails.send({
          from: "The Suffah School <onboarding@resend.dev>",
          to: allEmails,
          subject: subject,
          html: htmlContent,
        });
        emailsSent = allEmails.length;
        console.log(`Emails sent to ${emailsSent} recipients`);
      } catch (emailError) {
        console.error("Email error:", emailError);
      }
    }

    // Send SMS to parents who opted in
    for (const parent of parentPhones) {
      let smsMessage = "";
      
      if (type === "new_assignment") {
        smsMessage = `📚 New Assignment: "${title}" has been posted for ${parent.studentName}. Log in to view details. - The Suffah School`;
      } else {
        smsMessage = `📊 Results Published: "${examName || title}" results for ${parent.studentName} are now available. Log in to view grades. - The Suffah School`;
      }
      
      const sent = await sendSMS(parent.phone, smsMessage);
      if (sent) smsSent++;
    }

    // Create in-app notifications for students
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
    } else {
      console.log(`Created ${notifications.length} in-app notifications`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent,
        smsSent,
        inAppNotifications: studentUserIds.length,
        message: `Sent ${emailsSent} emails, ${smsSent} SMS, and ${studentUserIds.length} in-app notifications`
      }),
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
