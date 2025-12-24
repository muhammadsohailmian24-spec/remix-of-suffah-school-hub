import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

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
    studentFeeId?: string;
  };
}

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  studentName: string;
  studentId: string;
  feeName: string;
  feeType: string;
  amount: number;
  discount: number;
  finalAmount: number;
  paidAmount: number;
  paymentMethod: string;
  receiptNumber: string;
}

async function generateReceiptPdf(data: InvoiceData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const primaryColor = rgb(0.16, 0.38, 1);
  const darkColor = rgb(0.12, 0.12, 0.12);
  const grayColor = rgb(0.4, 0.4, 0.4);
  const greenColor = rgb(0.13, 0.55, 0.13);

  // Header background
  page.drawRectangle({
    x: 0,
    y: height - 80,
    width: width,
    height: 80,
    color: primaryColor,
  });

  // School name
  page.drawText("The Suffah Public School & College", {
    x: 40,
    y: height - 40,
    size: 18,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  page.drawText("Knowledge is Power - Since 2009 | Phone: +92 000 000 0000", {
    x: 40,
    y: height - 60,
    size: 10,
    font: helvetica,
    color: rgb(1, 1, 1),
  });

  // Receipt title
  page.drawText("PAYMENT RECEIPT", {
    x: width - 180,
    y: height - 120,
    size: 22,
    font: helveticaBold,
    color: darkColor,
  });

  // Receipt details box
  page.drawRectangle({
    x: width - 220,
    y: height - 200,
    width: 180,
    height: 70,
    color: rgb(0.96, 0.97, 0.98),
  });

  let yPos = height - 145;
  page.drawText("Receipt #:", { x: width - 210, y: yPos, size: 10, font: helvetica, color: grayColor });
  page.drawText(data.receiptNumber, { x: width - 100, y: yPos, size: 10, font: helveticaBold, color: darkColor });

  yPos -= 15;
  page.drawText("Date:", { x: width - 210, y: yPos, size: 10, font: helvetica, color: grayColor });
  page.drawText(data.invoiceDate, { x: width - 100, y: yPos, size: 10, font: helveticaBold, color: darkColor });

  yPos -= 15;
  page.drawText("Invoice #:", { x: width - 210, y: yPos, size: 10, font: helvetica, color: grayColor });
  page.drawText(data.invoiceNumber, { x: width - 100, y: yPos, size: 10, font: helveticaBold, color: darkColor });

  // Student info section
  page.drawText("RECEIVED FROM", { x: 40, y: height - 130, size: 12, font: helveticaBold, color: primaryColor });
  page.drawText(data.studentName, { x: 40, y: height - 150, size: 14, font: helveticaBold, color: darkColor });
  page.drawText(`Student ID: ${data.studentId}`, { x: 40, y: height - 168, size: 10, font: helvetica, color: grayColor });

  // PAID stamp
  page.drawRectangle({
    x: 40,
    y: height - 210,
    width: 60,
    height: 25,
    color: greenColor,
    borderColor: greenColor,
    borderWidth: 1,
  });
  page.drawText("PAID", { x: 55, y: height - 200, size: 12, font: helveticaBold, color: rgb(1, 1, 1) });

  // Fee details table header
  const tableTop = height - 260;
  page.drawRectangle({
    x: 40,
    y: tableTop - 5,
    width: width - 80,
    height: 30,
    color: primaryColor,
  });

  page.drawText("Description", { x: 50, y: tableTop + 5, size: 11, font: helveticaBold, color: rgb(1, 1, 1) });
  page.drawText("Type", { x: 250, y: tableTop + 5, size: 11, font: helveticaBold, color: rgb(1, 1, 1) });
  page.drawText("Amount", { x: 400, y: tableTop + 5, size: 11, font: helveticaBold, color: rgb(1, 1, 1) });

  // Table row
  const rowY = tableTop - 30;
  page.drawText(data.feeName, { x: 50, y: rowY, size: 10, font: helvetica, color: darkColor });
  page.drawText(data.feeType.charAt(0).toUpperCase() + data.feeType.slice(1), { x: 250, y: rowY, size: 10, font: helvetica, color: darkColor });
  page.drawText(`PKR ${data.amount.toLocaleString()}`, { x: 400, y: rowY, size: 10, font: helvetica, color: darkColor });

  // Totals section
  const totalsX = width - 220;
  let totalsY = tableTop - 80;

  page.drawRectangle({
    x: totalsX,
    y: totalsY - 80,
    width: 180,
    height: 100,
    color: rgb(0.96, 0.97, 0.98),
  });

  page.drawText("Subtotal:", { x: totalsX + 10, y: totalsY, size: 10, font: helvetica, color: grayColor });
  page.drawText(`PKR ${data.amount.toLocaleString()}`, { x: totalsX + 120, y: totalsY, size: 10, font: helvetica, color: darkColor });

  totalsY -= 18;
  page.drawText("Discount:", { x: totalsX + 10, y: totalsY, size: 10, font: helvetica, color: grayColor });
  page.drawText(`-PKR ${data.discount.toLocaleString()}`, { x: totalsX + 120, y: totalsY, size: 10, font: helvetica, color: greenColor });

  totalsY -= 18;
  page.drawText("Total Due:", { x: totalsX + 10, y: totalsY, size: 10, font: helvetica, color: grayColor });
  page.drawText(`PKR ${data.finalAmount.toLocaleString()}`, { x: totalsX + 120, y: totalsY, size: 10, font: helveticaBold, color: darkColor });

  // Line separator
  totalsY -= 15;
  page.drawLine({
    start: { x: totalsX + 10, y: totalsY },
    end: { x: totalsX + 170, y: totalsY },
    thickness: 1,
    color: primaryColor,
  });

  totalsY -= 18;
  page.drawText("Amount Paid:", { x: totalsX + 10, y: totalsY, size: 12, font: helveticaBold, color: primaryColor });
  page.drawText(`PKR ${data.paidAmount.toLocaleString()}`, { x: totalsX + 110, y: totalsY, size: 12, font: helveticaBold, color: greenColor });

  // Payment method
  page.drawText("PAYMENT DETAILS", { x: 40, y: tableTop - 100, size: 12, font: helveticaBold, color: primaryColor });
  page.drawText(`Payment Method: ${data.paymentMethod.charAt(0).toUpperCase() + data.paymentMethod.slice(1)}`, { 
    x: 40, y: tableTop - 120, size: 10, font: helvetica, color: darkColor 
  });
  page.drawText(`Transaction Date: ${data.invoiceDate}`, { 
    x: 40, y: tableTop - 138, size: 10, font: helvetica, color: darkColor 
  });

  // Balance
  const balance = data.finalAmount - data.paidAmount;
  if (balance > 0) {
    page.drawText(`Remaining Balance: PKR ${balance.toLocaleString()}`, { 
      x: 40, y: tableTop - 156, size: 10, font: helveticaBold, color: rgb(0.86, 0.2, 0.2) 
    });
  } else {
    page.drawText("Status: Fully Paid", { 
      x: 40, y: tableTop - 156, size: 10, font: helveticaBold, color: greenColor 
    });
  }

  // Footer
  page.drawLine({
    start: { x: 40, y: 80 },
    end: { x: width - 40, y: 80 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });

  page.drawText("Thank you for your payment!", { x: width / 2 - 60, y: 60, size: 10, font: helvetica, color: grayColor });
  page.drawText("For any queries, please contact the school administration.", { x: width / 2 - 120, y: 45, size: 9, font: helvetica, color: grayColor });

  return await pdfDoc.save();
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

async function getStudentFeeDetails(supabase: any, studentFeeId: string) {
  const { data } = await supabase
    .from("student_fees")
    .select(`
      id,
      amount,
      discount,
      final_amount,
      due_date,
      status,
      fee_structure:fee_structures(id, name, fee_type)
    `)
    .eq("id", studentFeeId)
    .single();

  return data;
}

async function getTotalPaidForFee(supabase: any, studentFeeId: string): Promise<number> {
  const { data } = await supabase
    .from("fee_payments")
    .select("amount")
    .eq("student_fee_id", studentFeeId);

  if (!data) return 0;
  return data.reduce((sum: number, p: any) => sum + p.amount, 0);
}

function formatCurrency(amount: number): string {
  return `PKR ${amount.toLocaleString()}`;
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
            <p>Best regards,<br>The Suffah Public School & College</p>
          </div>
        `;

        if (parentContact.emails.length > 0) {
          try {
            await resend.emails.send({
              from: "The Suffah Public School & College <onboarding@resend.dev>",
              to: parentContact.emails,
              subject: subject,
              html: htmlContent,
            });
            emailsSent += parentContact.emails.length;
          } catch (emailError) {
            console.error("Email error:", emailError);
          }
        }

        const smsMessage = `⚠️ Fee Reminder: ${feeName} of ${formatCurrency(fee.final_amount)} for ${student.full_name} is ${daysOverdue} days overdue. Please make payment soon.`;
        
        for (const parent of parentContact.phones) {
          const sent = await sendSMS(parent.phone, smsMessage);
          if (sent) smsSent++;
        }

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
    let pdfAttachment: Uint8Array | null = null;

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
          <p>Best regards,<br>The Suffah Public School & College</p>
        </div>
      `;
      smsMessage = `💰 New Fee: ${feeDetails.feeName} of ${formatCurrency(feeDetails.amount)} assigned to ${student.full_name}. Due: ${new Date(feeDetails.dueDate).toLocaleDateString()}`;
    } else if (type === "payment_received" && paymentDetails) {
      subject = `✅ Payment Received - Receipt #${paymentDetails.receiptNumber}`;
      
      // Fetch fee details for PDF generation
      let feeData = null;
      let totalPaid = paymentDetails.amount;
      
      if (paymentDetails.studentFeeId) {
        feeData = await getStudentFeeDetails(supabase, paymentDetails.studentFeeId);
        totalPaid = await getTotalPaidForFee(supabase, paymentDetails.studentFeeId);
      }

      const feeStructure = feeData?.fee_structure as { id: string; name: string; fee_type: string } | null;

      // Generate PDF receipt
      try {
        console.log("Generating PDF receipt...");
        pdfAttachment = await generateReceiptPdf({
          invoiceNumber: `INV-${(paymentDetails.studentFeeId || "").slice(0, 8).toUpperCase()}`,
          invoiceDate: new Date().toLocaleDateString(),
          studentName: student.full_name,
          studentId: student.student_id,
          feeName: feeStructure?.name || "School Fee",
          feeType: feeStructure?.fee_type || "tuition",
          amount: feeData?.amount || paymentDetails.amount,
          discount: feeData?.discount || 0,
          finalAmount: feeData?.final_amount || paymentDetails.amount,
          paidAmount: paymentDetails.amount,
          paymentMethod: paymentDetails.paymentMethod,
          receiptNumber: paymentDetails.receiptNumber,
        });
        console.log("PDF receipt generated successfully");
      } catch (pdfError) {
        console.error("Error generating PDF:", pdfError);
      }

      const balance = feeData ? feeData.final_amount - totalPaid : 0;
      
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #16a34a;">✅ Payment Received</h1>
          <p>Dear Parent/Guardian,</p>
          <p>We have received a payment for <strong>${student.full_name}</strong>:</p>
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Fee:</strong> ${feeStructure?.name || "School Fee"}</p>
            <p><strong>Amount Paid:</strong> ${formatCurrency(paymentDetails.amount)}</p>
            <p><strong>Receipt Number:</strong> ${paymentDetails.receiptNumber}</p>
            <p><strong>Payment Method:</strong> ${paymentDetails.paymentMethod}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            ${balance > 0 ? `<p style="color: #dc2626;"><strong>Remaining Balance:</strong> ${formatCurrency(balance)}</p>` : '<p style="color: #16a34a;"><strong>Status:</strong> Fully Paid</p>'}
          </div>
          <p>Please find your payment receipt attached to this email.</p>
          <p>Thank you for your payment!</p>
          <p>Best regards,<br>The Suffah Public School & College</p>
        </div>
      `;
      smsMessage = `✅ Payment of ${formatCurrency(paymentDetails.amount)} received for ${student.full_name}. Receipt: ${paymentDetails.receiptNumber}. Thank you!`;
    }

    let emailsSent = 0;
    let smsSent = 0;

    // Send emails with attachment for payment receipts
    if (parentContact.emails.length > 0 && subject) {
      try {
        const emailPayload: any = {
          from: "The Suffah Public School & College <onboarding@resend.dev>",
          to: parentContact.emails,
          subject: subject,
          html: htmlContent,
        };

        // Add PDF attachment for payment receipts
        if (pdfAttachment && type === "payment_received") {
          const base64Pdf = btoa(String.fromCharCode(...pdfAttachment));
          emailPayload.attachments = [
            {
              filename: `Receipt-${paymentDetails?.receiptNumber || "receipt"}.pdf`,
              content: base64Pdf,
            },
          ];
          console.log("PDF attachment added to email");
        }

        await resend.emails.send(emailPayload);
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
        pdfGenerated: !!pdfAttachment,
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
