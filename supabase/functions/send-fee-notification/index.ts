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

interface FeeNotificationRequest {
  type: "fee_assigned" | "payment_reminder" | "payment_received" | "overdue";
  studentFeeId?: string;
  studentId?: string;
  feeDetails?: {
    feeName: string;
    amount: number;
    dueDate: string;
    balance?: number;
  };
  paymentDetails?: {
    amount: number;
    receiptNumber: string;
    paymentMethod: string;
  };
}

async function sendSMS(to: string, message: string): Promise<boolean> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.log("Twilio not configured, skipping SMS");
    return false;
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: TWILIO_PHONE_NUMBER,
        Body: message,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`SMS failed to ${to}:`, error);
      return false;
    }

    console.log(`SMS sent to ${to}`);
    return true;
  } catch (error) {
    console.error(`SMS error to ${to}:`, error);
    return false;
  }
}

async function getParentContactInfo(supabase: any, studentId: string) {
  // Get parent info for this student
  const { data: studentParents } = await supabase
    .from("student_parents")
    .select("parent_id")
    .eq("student_id", studentId);

  if (!studentParents || studentParents.length === 0) {
    return { emails: [], phones: [] };
  }

  const parentIds = studentParents.map((sp: any) => sp.parent_id);

  const { data: parents } = await supabase
    .from("parents")
    .select("user_id")
    .in("id", parentIds);

  if (!parents || parents.length === 0) {
    return { emails: [], phones: [] };
  }

  const parentUserIds = parents.map((p: any) => p.user_id);

  const { data: parentProfiles } = await supabase
    .from("profiles")
    .select("email, phone, full_name, sms_notifications_enabled")
    .in("user_id", parentUserIds);

  if (!parentProfiles) {
    return { emails: [], phones: [] };
  }

  return {
    emails: parentProfiles.map((p: any) => p.email).filter(Boolean),
    phones: parentProfiles
      .filter((p: any) => p.sms_notifications_enabled && p.phone)
      .map((p: any) => ({ phone: p.phone, name: p.full_name })),
  };
}

async function getStudentInfo(supabase: any, studentId: string) {
  const { data: student } = await supabase
    .from("students")
    .select("id, student_id, user_id")
    .eq("id", studentId)
    .single();

  if (!student) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("user_id", student.user_id)
    .single();

  return {
    ...student,
    full_name: profile?.full_name || "Student",
    email: profile?.email,
  };
}

function formatCurrency(amount: number): string {
  return `₦${amount.toLocaleString()}`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestData: FeeNotificationRequest = await req.json();
    const { type, studentFeeId, studentId, feeDetails, paymentDetails } = requestData;

    console.log(`Processing ${type} fee notification`);

    // For payment reminders (cron job), fetch overdue fees
    if (type === "payment_reminder" || type === "overdue") {
      const today = new Date().toISOString().split("T")[0];
      
      const { data: overdueFees, error } = await supabase
        .from("student_fees")
        .select(`
          id,
          student_id,
          final_amount,
          due_date,
          status,
          fee_structure:fee_structures(name)
        `)
        .in("status", ["pending", "partial"])
        .lte("due_date", today);

      if (error) {
        console.error("Error fetching overdue fees:", error);
        throw error;
      }

      console.log(`Found ${overdueFees?.length || 0} overdue fee records`);

      let emailsSent = 0;
      let smsSent = 0;

      for (const fee of overdueFees || []) {
        const student = await getStudentInfo(supabase, fee.student_id);
        if (!student) continue;

        const parentContact = await getParentContactInfo(supabase, fee.student_id);
        
        // Calculate days overdue
        const dueDate = new Date(fee.due_date);
        const now = new Date();
        const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        const feeStructure = fee.fee_structure as unknown as { name: string } | null;
        const feeName = feeStructure?.name || "School Fee";
        const subject = `⚠️ Fee Payment Reminder: ${feeName}`;
        
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #dc2626;">⚠️ Fee Payment Reminder</h1>
            <p>Dear Parent/Guardian,</p>
            <p>This is a reminder that the following fee for <strong>${student.full_name}</strong> is overdue:</p>
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Fee Type:</strong> ${feeName}</p>
              <p><strong>Amount Due:</strong> ${formatCurrency(fee.final_amount)}</p>
              <p><strong>Due Date:</strong> ${new Date(fee.due_date).toLocaleDateString()}</p>
              <p style="color: #dc2626;"><strong>Days Overdue:</strong> ${daysOverdue} days</p>
            </div>
            <p>Please make the payment at your earliest convenience to avoid any inconvenience.</p>
            <p>Best regards,<br>School Administration</p>
          </div>
        `;

        // Send emails to parents
        if (parentContact.emails.length > 0) {
          try {
            await resend.emails.send({
              from: "School Fees <onboarding@resend.dev>",
              to: parentContact.emails,
              subject: subject,
              html: htmlContent,
            });
            emailsSent += parentContact.emails.length;
          } catch (emailError) {
            console.error("Email error:", emailError);
          }
        }

        // Send SMS to parents who opted in
        const smsMessage = `⚠️ Fee Reminder: ${feeName} of ${formatCurrency(fee.final_amount)} for ${student.full_name} is ${daysOverdue} days overdue. Please make payment soon.`;
        
        for (const parent of parentContact.phones) {
          const sent = await sendSMS(parent.phone, smsMessage);
          if (sent) smsSent++;
        }

        // Update status to overdue if not already
        if (fee.status !== "overdue" && daysOverdue > 0) {
          await supabase
            .from("student_fees")
            .update({ status: "overdue" })
            .eq("id", fee.id);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Sent ${emailsSent} reminder emails and ${smsSent} SMS`,
          overdueCount: overdueFees?.length || 0,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // For fee_assigned and payment_received notifications
    if (!studentId) {
      throw new Error("studentId is required for this notification type");
    }

    const student = await getStudentInfo(supabase, studentId);
    if (!student) {
      throw new Error("Student not found");
    }

    const parentContact = await getParentContactInfo(supabase, studentId);
    
    let subject = "";
    let htmlContent = "";
    let smsMessage = "";

    if (type === "fee_assigned" && feeDetails) {
      subject = `💰 New Fee Assigned: ${feeDetails.feeName}`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">💰 New Fee Assigned</h1>
          <p>Dear Parent/Guardian,</p>
          <p>A new fee has been assigned to <strong>${student.full_name}</strong>:</p>
          <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Fee Type:</strong> ${feeDetails.feeName}</p>
            <p><strong>Amount:</strong> ${formatCurrency(feeDetails.amount)}</p>
            <p><strong>Due Date:</strong> ${new Date(feeDetails.dueDate).toLocaleDateString()}</p>
          </div>
          <p>Please ensure timely payment to avoid any late fees.</p>
          <p>Best regards,<br>School Administration</p>
        </div>
      `;
      smsMessage = `💰 New Fee: ${feeDetails.feeName} of ${formatCurrency(feeDetails.amount)} assigned to ${student.full_name}. Due: ${new Date(feeDetails.dueDate).toLocaleDateString()}`;
    } else if (type === "payment_received" && paymentDetails) {
      subject = `✅ Payment Received - Receipt #${paymentDetails.receiptNumber}`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #16a34a;">✅ Payment Received</h1>
          <p>Dear Parent/Guardian,</p>
          <p>We have received a payment for <strong>${student.full_name}</strong>:</p>
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Amount Paid:</strong> ${formatCurrency(paymentDetails.amount)}</p>
            <p><strong>Receipt Number:</strong> ${paymentDetails.receiptNumber}</p>
            <p><strong>Payment Method:</strong> ${paymentDetails.paymentMethod}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <p>Thank you for your payment!</p>
          <p>Best regards,<br>School Administration</p>
        </div>
      `;
      smsMessage = `✅ Payment of ${formatCurrency(paymentDetails.amount)} received for ${student.full_name}. Receipt: ${paymentDetails.receiptNumber}. Thank you!`;
    }

    let emailsSent = 0;
    let smsSent = 0;

    // Send emails
    if (parentContact.emails.length > 0 && subject) {
      try {
        await resend.emails.send({
          from: "School Fees <onboarding@resend.dev>",
          to: parentContact.emails,
          subject: subject,
          html: htmlContent,
        });
        emailsSent = parentContact.emails.length;
        console.log(`Emails sent to ${emailsSent} recipients`);
      } catch (emailError) {
        console.error("Email error:", emailError);
      }
    }

    // Send SMS
    for (const parent of parentContact.phones) {
      const sent = await sendSMS(parent.phone, smsMessage);
      if (sent) smsSent++;
    }

    // Create in-app notification for student
    await supabase.from("notifications").insert({
      user_id: student.user_id,
      title: subject,
      message: type === "fee_assigned" 
        ? `${feeDetails?.feeName}: ${formatCurrency(feeDetails?.amount || 0)} due by ${new Date(feeDetails?.dueDate || "").toLocaleDateString()}`
        : `Payment of ${formatCurrency(paymentDetails?.amount || 0)} received. Receipt: ${paymentDetails?.receiptNumber}`,
      type: "fee",
      link: "/student/fees",
    });

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        smsSent,
        message: `Sent ${emailsSent} emails and ${smsSent} SMS notifications`,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-fee-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);