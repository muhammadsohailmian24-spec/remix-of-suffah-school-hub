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

interface AbsentStudent {
  studentId: string;
  studentName: string;
  studentEmail: string;
  parentName: string;
  parentEmail: string | null;
  parentPhone: string | null;
  className: string;
  date: string;
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
    
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: `whatsapp:${TWILIO_PHONE_NUMBER}`,
          To: `whatsapp:${formattedTo}`,
          Body: message,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Twilio WhatsApp error:", error);
      return false;
    }

    console.log(`WhatsApp sent to ${formattedTo}`);
    return true;
  } catch (error) {
    console.error("Error sending WhatsApp:", error);
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
    
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: TWILIO_PHONE_NUMBER,
          To: formattedTo,
          Body: message,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Twilio SMS error:", error);
      return false;
    }

    console.log(`SMS sent to ${formattedTo}`);
    return true;
  } catch (error) {
    console.error("Error sending SMS:", error);
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { date } = await req.json();
    const targetDate = date || new Date().toISOString().split("T")[0];

    console.log(`Fetching absent students for date: ${targetDate}`);

    // Get all absent students for the date
    const { data: absentRecords, error: attendanceError } = await supabase
      .from("attendance")
      .select("student_id, class_id, date")
      .eq("date", targetDate)
      .eq("status", "absent");

    if (attendanceError) {
      throw new Error(`Error fetching attendance: ${attendanceError.message}`);
    }

    if (!absentRecords || absentRecords.length === 0) {
      return new Response(
        JSON.stringify({ message: "No absent students found", emailsSent: 0, whatsappSent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${absentRecords.length} absent students`);

    // Get student details
    const studentIds = absentRecords.map(r => r.student_id);
    const { data: students } = await supabase
      .from("students")
      .select("id, student_id, user_id")
      .in("id", studentIds);

    // Get user profiles
    const userIds = students?.map(s => s.user_id) || [];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, phone")
      .in("user_id", userIds);

    // Get class details
    const classIds = absentRecords.filter(r => r.class_id).map(r => r.class_id);
    const { data: classes } = await supabase
      .from("classes")
      .select("id, name, section")
      .in("id", classIds);

    // Get parent relationships
    const { data: studentParents } = await supabase
      .from("student_parents")
      .select("student_id, parent_id")
      .in("student_id", studentIds);

    // Get parent details
    const parentIds = studentParents?.map(sp => sp.parent_id) || [];
    const { data: parents } = await supabase
      .from("parents")
      .select("id, user_id")
      .in("id", parentIds);

    const parentUserIds = parents?.map(p => p.user_id) || [];
    const { data: parentProfiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, phone, sms_notifications_enabled, whatsapp_notifications_enabled")
      .in("user_id", parentUserIds);

    let emailsSent = 0;
    let whatsappSent = 0;

    // Process each absent student
    for (const record of absentRecords) {
      const student = students?.find(s => s.id === record.student_id);
      if (!student) continue;

      const studentProfile = profiles?.find(p => p.user_id === student.user_id);
      const classInfo = classes?.find(c => c.id === record.class_id);
      const className = classInfo ? `${classInfo.name}${classInfo.section ? ` - ${classInfo.section}` : ""}` : "N/A";

      // Find parent for this student
      const studentParent = studentParents?.find(sp => sp.student_id === student.id);
      const parent = studentParent ? parents?.find(p => p.id === studentParent.parent_id) : null;
      const parentProfile = parent ? parentProfiles?.find(p => p.user_id === parent.user_id) : null;

      const studentName = studentProfile?.full_name || "Student";
      const formattedDate = new Date(targetDate).toLocaleDateString("en-PK", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // Send email to parent
      if (parentProfile?.email) {
        try {
          await resend.emails.send({
            from: "The Suffah Public School & College <onboarding@resend.dev>",
            to: [parentProfile.email],
            subject: `🚨 Absence Notification - ${studentName}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">🚨 Absence Alert</h1>
                  <p style="color: rgba(255,255,255,0.9); margin-top: 8px;">The Suffah Public School & College</p>
                </div>
                <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                  <p style="font-size: 16px;">Dear ${parentProfile.full_name},</p>
                  <p style="font-size: 16px;">This is to inform you that your child <strong>${studentName}</strong> (ID: ${student.student_id}) was marked <strong style="color: #dc2626;">absent</strong> today.</p>
                  
                  <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
                    <p style="margin: 5px 0;"><strong>Student:</strong> ${studentName}</p>
                    <p style="margin: 5px 0;"><strong>Student ID:</strong> ${student.student_id}</p>
                    <p style="margin: 5px 0;"><strong>Class:</strong> ${className}</p>
                    <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
                  </div>
                  
                  <p style="font-size: 14px; color: #666;">If your child was absent due to illness or any valid reason, please inform the school administration as soon as possible.</p>
                  
                  <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                  
                  <p style="font-size: 12px; color: #999; text-align: center;">
                    The Suffah Public School & College<br>
                    Madyan Swat, Pakistan<br>
                    Phone: +92 000 000 0000
                  </p>
                </div>
              </div>
            `,
          });
          emailsSent++;
          console.log(`Email sent to ${parentProfile.email} for student ${studentName}`);
        } catch (error) {
          console.error(`Error sending email to ${parentProfile.email}:`, error);
        }
      }

      // Send WhatsApp to parent (preferred over SMS if enabled)
      if (parentProfile?.phone && parentProfile?.whatsapp_notifications_enabled) {
        const whatsappMessage = `*🚨 The Suffah Public School & College*\n\n*Absence Alert*\n\nDear ${parentProfile.full_name},\n\nYour child *${studentName}* (ID: ${student.student_id}) was marked *ABSENT* on ${formattedDate}.\n\n📚 *Class:* ${className}\n\nIf this absence is due to a valid reason, please inform the school administration.\n\n_Regards,\nSchool Administration_`;

        const sent = await sendWhatsApp(parentProfile.phone, whatsappMessage);
        if (sent) whatsappSent++;
      } 
      // Fallback to SMS if WhatsApp not enabled but SMS is enabled
      else if (parentProfile?.phone && parentProfile?.sms_notifications_enabled) {
        const smsMessage = `🚨 Absence Alert: ${studentName} (${student.student_id}) was absent on ${formattedDate}. Class: ${className}. Please contact school if needed. - The Suffah School`;
        const sent = await sendSMS(parentProfile.phone, smsMessage);
        if (sent) whatsappSent++; // Counting both as mobile notifications
      }
    }

    console.log(`Notifications sent - Emails: ${emailsSent}, WhatsApp: ${whatsappSent}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Notifications sent successfully`,
        emailsSent,
        whatsappSent,
        totalAbsent: absentRecords.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-attendance-notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
