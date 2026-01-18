import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { GraduationCap, ArrowLeft, Bell, Mail, MessageSquare, Smartphone, Loader2, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const NotificationPreferences = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [phone, setPhone] = useState<string | null>(null);

  useEffect(() => {
    const loadPreferences = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("sms_notifications_enabled, whatsapp_notifications_enabled, push_notifications_enabled, phone")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (profile) {
        setSmsEnabled(profile.sms_notifications_enabled ?? false);
        setWhatsappEnabled(profile.whatsapp_notifications_enabled ?? false);
        setPushEnabled(profile.push_notifications_enabled ?? true);
        setPhone(profile.phone);
      }
      
      setLoading(false);
    };

    loadPreferences();
  }, [navigate]);

  const handleSave = async () => {
    setSaving(true);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ 
        sms_notifications_enabled: smsEnabled,
        whatsapp_notifications_enabled: whatsappEnabled,
        push_notifications_enabled: pushEnabled,
      })
      .eq("user_id", session.user.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Preferences saved",
        description: "Your notification preferences have been updated.",
      });
    }
    
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg hero-gradient flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-heading text-lg font-bold">The Suffah</h1>
                <p className="text-xs text-muted-foreground">Management System</p>
              </div>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-2xl">
        <Button 
          variant="ghost" 
          className="mb-6 gap-2"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold flex items-center gap-3">
            <Bell className="w-8 h-8 text-primary" />
            Notification Preferences
          </h1>
          <p className="text-muted-foreground mt-2">
            Choose how you want to receive notifications about your children's activities.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Notification Channels</CardTitle>
            <CardDescription>
              Enable or disable different notification methods
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Push Notifications */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-accent/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <Label htmlFor="push-notifications" className="text-base font-medium">
                    Push Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Instant alerts in your browser
                  </p>
                </div>
              </div>
              <Switch
                id="push-notifications"
                checked={pushEnabled}
                onCheckedChange={setPushEnabled}
              />
            </div>

            {/* Email Notifications */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-accent/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <Label htmlFor="email-notifications" className="text-base font-medium">
                    Email Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive updates via email (always enabled)
                  </p>
                </div>
              </div>
              <Switch
                id="email-notifications"
                checked={emailEnabled}
                disabled
              />
            </div>

            {/* WhatsApp Notifications */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-accent/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <Label htmlFor="whatsapp-notifications" className="text-base font-medium">
                    WhatsApp Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Get important updates on WhatsApp
                  </p>
                  {!phone && whatsappEnabled && (
                    <p className="text-sm text-orange-500 mt-1">
                      Please add a phone number to receive WhatsApp messages
                    </p>
                  )}
                </div>
              </div>
              <Switch
                id="whatsapp-notifications"
                checked={whatsappEnabled}
                onCheckedChange={setWhatsappEnabled}
              />
            </div>

            {/* SMS Notifications */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-accent/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <Label htmlFor="sms-notifications" className="text-base font-medium">
                    SMS Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Text messages for urgent alerts
                  </p>
                  {!phone && smsEnabled && (
                    <p className="text-sm text-orange-500 mt-1">
                      Please add a phone number to receive SMS
                    </p>
                  )}
                </div>
              </div>
              <Switch
                id="sms-notifications"
                checked={smsEnabled}
                onCheckedChange={setSmsEnabled}
              />
            </div>

            {/* Notification Types Info */}
            <div className="pt-4 border-t border-border mt-6">
              <h3 className="font-medium mb-3">You'll be notified about:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  Attendance alerts when your child is marked absent
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  Fee payment reminders and receipts
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Exam results and grades published
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  New assignments and announcements
                </li>
              </ul>
            </div>

            <Button 
              onClick={handleSave} 
              className="w-full mt-4"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Preferences"
              )}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default NotificationPreferences;
