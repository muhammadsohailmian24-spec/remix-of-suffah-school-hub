import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Twilio WhatsApp configuration
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_WHATSAPP_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

interface NotificationPayload {
  userIds: string[];
  title: string;
  body: string;
  icon?: string;
  url?: string;
  type: "attendance" | "fee" | "result" | "assignment" | "announcement";
  sendWhatsApp?: boolean;
  sendPush?: boolean;
}

async function sendWhatsAppMessage(to: string, message: string): Promise<boolean> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
    console.log("Twilio not configured, skipping WhatsApp");
    return false;
  }

  try {
    // Format phone number
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
        From: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,
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

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; icon?: string; url?: string }
): Promise<boolean> {
  // Note: Web Push requires VAPID keys which need to be configured
  // For now, we'll log and return false as VAPID setup is needed
  console.log(`Web push would be sent to endpoint: ${subscription.endpoint}`);
  console.log(`Payload: ${JSON.stringify(payload)}`);
  
  // TODO: Implement web-push with VAPID keys
  // This requires npm:web-push and VAPID key pairs
  return false;
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

    // Authentication check - require admin or teacher role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized - Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin or teacher
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "teacher"])
      .maybeSingle();

    if (!roleData) {
      console.error("User does not have admin or teacher role:", user.id);
      return new Response(
        JSON.stringify({ error: "Forbidden - Only admins and teachers can send push notifications" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Authenticated user ${user.id} with role ${roleData.role} sending push notifications`);

    const payload: NotificationPayload = await req.json();
    const { userIds, title, body, icon, url, type, sendWhatsApp = true, sendPush = true } = payload;

    // Validate input
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid request - userIds array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: "Invalid request - title and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing notifications for ${userIds.length} users, type: ${type}`);

    let whatsAppSent = 0;
    let pushSent = 0;
    let inAppCreated = 0;

    for (const userId of userIds) {
      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone, whatsapp_notifications_enabled, push_notifications_enabled, full_name")
        .eq("user_id", userId)
        .maybeSingle();

      if (!profile) {
        console.log(`No profile found for user ${userId}`);
        continue;
      }

      // Send WhatsApp notification
      if (sendWhatsApp && profile.whatsapp_notifications_enabled && profile.phone) {
        const whatsappMessage = `*The Suffah Public School & College*\n\n📢 *${title}*\n\n${body}\n\n_Visit the school portal for more details._`;
        const sent = await sendWhatsAppMessage(profile.phone, whatsappMessage);
        if (sent) whatsAppSent++;
      }

      // Send push notification
      if (sendPush && profile.push_notifications_enabled) {
        const { data: subscriptions } = await supabase
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth")
          .eq("user_id", userId);

        if (subscriptions) {
          for (const sub of subscriptions) {
            const sent = await sendWebPush(sub, { title, body, icon, url });
            if (sent) pushSent++;
          }
        }
      }

      // Create in-app notification
      const notificationLink = type === "attendance" ? "/student/attendance" :
                               type === "fee" ? "/student/fees" :
                               type === "result" ? "/student/results" :
                               type === "assignment" ? "/student/assignments" :
                               "/";

      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          title: title,
          message: body,
          type: type,
          link: url || notificationLink,
        });

      if (!notifError) {
        inAppCreated++;
      } else {
        console.error(`Error creating notification for ${userId}:`, notifError);
      }
    }

    console.log(`Notifications sent - WhatsApp: ${whatsAppSent}, Push: ${pushSent}, In-app: ${inAppCreated}`);

    return new Response(
      JSON.stringify({
        success: true,
        whatsAppSent,
        pushSent,
        inAppCreated,
        message: `Sent ${whatsAppSent} WhatsApp, ${pushSent} push, and ${inAppCreated} in-app notifications`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-push-notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
