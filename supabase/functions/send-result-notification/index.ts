import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Twilio configuration
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

interface ResultNotificationRequest {
  examId: string;
  classId: string;
  examName: string;
  subjectName: string;
}

async function sendWhatsApp(to: string, message: string): Promise<boolean> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.log("Twilio not configured, skipping WhatsApp");
    return false;
  }

  try {
    let formattedTo = to;
    if (to.startsWith("03")) {
      formattedTo = "+92" + to.substring(1);
    } else if (!to.startsWith("+")) {
      formattedTo = "+" + to;
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
        From: `whatsapp:${TWILIO_PHONE_NUMBER}`,
        To: `whatsapp:${formattedTo}`,
        Body: message,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`WhatsApp failed to ${formattedTo}:`, error);
      return false;
    }

    console.log(`WhatsApp sent to ${formattedTo}`);
    return true;
  } catch (error) {
    console.error(`WhatsApp error to ${to}:`, error);
    return false;
  }
}

async function sendSMS(to: string, message: string): Promise<boolean> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.log("Twilio not configured, skipping SMS");
    return false;
  }

  try {
    let formattedTo = to;
    if (to.startsWith("03")) {
      formattedTo = "+92" + to.substring(1);
    } else if (!to.startsWith("+")) {
      formattedTo = "+" + to;
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
        From: TWILIO_PHONE_NUMBER,
        To: formattedTo,
        Body: message,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`SMS failed to ${formattedTo}:`, error);
      return false;
    }

    console.log(`SMS sent to ${formattedTo}`);
    return true;
  } catch (error) {
    console.error(`SMS error to ${to}:`, error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authorization check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin or teacher
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "teacher"])
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Only admins and teachers can send result notifications" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { examId, classId, examName, subjectName }: ResultNotificationRequest = await req.json();

    console.log(`Processing result notification for exam ${examId}, class ${classId}`);

    // Get students in the class
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("id, user_id, father_phone")
      .eq("class_id", classId);

    if (studentsError || !students?.length) {
      return new Response(
        JSON.stringify({ message: "No students found in class" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const studentIds = students.map(s => s.id);
    const studentUserIds = students.map(s => s.user_id);

    // Get student profiles
    const { data: studentProfiles } = await supabase
      .from("profiles")
      .select("user_id, email, full_name, phone, whatsapp_notifications_enabled, sms_notifications_enabled")
      .in("user_id", studentUserIds);

    // Get parent info
    const { data: studentParents } = await supabase
      .from("student_parents")
      .select("student_id, parent_id")
      .in("student_id", studentIds);

    const parentIds = [...new Set(studentParents?.map(sp => sp.parent_id) || [])];

    let parentProfiles: any[] = [];
    if (parentIds.length > 0) {
      const { data: parents } = await supabase
        .from("parents")
        .select("id, user_id")
        .in("id", parentIds);

      if (parents?.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, email, phone, full_name, whatsapp_notifications_enabled, sms_notifications_enabled")
          .in("user_id", parents.map(p => p.user_id));
        
        parentProfiles = profiles || [];
      }
    }

    // Collect all emails
    const studentEmails = studentProfiles?.map(p => p.email).filter(Boolean) || [];
    const parentEmails = parentProfiles?.map(p => p.email).filter(Boolean) || [];
    const allEmails = [...new Set([...studentEmails, ...parentEmails])];

    let emailsSent = 0;
    let smsSent = 0;
    let whatsappSent = 0;
    let inAppNotifications = 0;

    // Send email notification
    if (allEmails.length > 0) {
      try {
        await resend.emails.send({
          from: "The Suffah Public School & College <onboarding@resend.dev>",
          to: allEmails as string[],
          subject: `📊 Exam Results Published: ${examName} - ${subjectName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; border-radius: 12px; color: white; text-align: center;">
                <h1 style="margin: 0;">📊 Exam Results Published</h1>
              </div>
              <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 12px 12px;">
                <h2 style="color: #1e293b; margin-bottom: 10px;">${examName}</h2>
                <p style="color: #64748b; margin-bottom: 20px;"><strong>Subject:</strong> ${subjectName}</p>
                <p style="color: #64748b; line-height: 1.6;">The exam results have been published and are now available for viewing.</p>
                <div style="margin-top: 30px; padding: 20px; background: #fff; border-radius: 8px; border-left: 4px solid #22c55e;">
                  <p style="margin: 0; color: #64748b;">Log in to the school portal to view detailed results, grades, and teacher remarks.</p>
                </div>
                <div style="margin-top: 20px; text-align: center;">
                  <p style="color: #16a34a; font-weight: bold;">🎓 Keep up the great work!</p>
                </div>
                <p style="margin-top: 30px; color: #94a3b8; font-size: 14px;">Best regards,<br><strong>The Suffah Public School & College</strong></p>
              </div>
            </div>
          `,
        });
        emailsSent = allEmails.length;
        console.log(`Sent ${emailsSent} emails`);
      } catch (emailError) {
        console.error("Email error:", emailError);
      }
    }

    // Send WhatsApp to parents
    const whatsappMessage = `*The Suffah Public School & College*\n\n📊 *Exam Results Published*\n\n*Exam:* ${examName}\n*Subject:* ${subjectName}\n\nThe exam results are now available. Log in to the school portal to view detailed results and grades.\n\n🎓 _Best of luck!_`;

    for (const parent of parentProfiles.filter(p => p.whatsapp_notifications_enabled && p.phone)) {
      const sent = await sendWhatsApp(parent.phone, whatsappMessage);
      if (sent) whatsappSent++;
    }

    // Send SMS to parents who prefer SMS
    const smsMessage = `📊 Results Published: ${examName} - ${subjectName}. Log in to view grades. - The Suffah School`;
    
    for (const parent of parentProfiles.filter(p => p.sms_notifications_enabled && p.phone && !p.whatsapp_notifications_enabled)) {
      const sent = await sendSMS(parent.phone, smsMessage);
      if (sent) smsSent++;
    }

    // Create in-app notifications for students
    const notifications = studentUserIds.map(userId => ({
      user_id: userId,
      title: `📊 Results Published: ${examName}`,
      message: `${subjectName} exam results are now available. Check your grades!`,
      type: "result",
      link: "/student/results",
    }));

    const { error: notifError } = await supabase
      .from("notifications")
      .insert(notifications);

    if (!notifError) {
      inAppNotifications = notifications.length;
    }

    console.log(`Notifications: ${emailsSent} emails, ${smsSent} SMS, ${whatsappSent} WhatsApp, ${inAppNotifications} in-app`);

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        smsSent,
        whatsappSent,
        inAppNotifications,
        message: `Sent ${emailsSent} emails, ${smsSent} SMS, ${whatsappSent} WhatsApp, ${inAppNotifications} in-app notifications`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-result-notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
