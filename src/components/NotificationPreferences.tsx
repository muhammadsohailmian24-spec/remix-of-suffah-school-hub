import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bell, MessageCircle, Mail, Smartphone, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NotificationPreferences {
  sms_notifications_enabled: boolean;
  whatsapp_notifications_enabled: boolean;
  push_notifications_enabled: boolean;
}

export const NotificationPreferences = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    sms_notifications_enabled: false,
    whatsapp_notifications_enabled: false,
    push_notifications_enabled: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("sms_notifications_enabled, whatsapp_notifications_enabled, push_notifications_enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile) {
        setPreferences({
          sms_notifications_enabled: profile.sms_notifications_enabled ?? false,
          whatsapp_notifications_enabled: profile.whatsapp_notifications_enabled ?? false,
          push_notifications_enabled: profile.push_notifications_enabled ?? true,
        });
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          sms_notifications_enabled: preferences.sms_notifications_enabled,
          whatsapp_notifications_enabled: preferences.whatsapp_notifications_enabled,
          push_notifications_enabled: preferences.push_notifications_enabled,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Preferences saved",
        description: "Your notification preferences have been updated.",
      });
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast({
        title: "Error",
        description: "Failed to save notification preferences.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Choose how you want to receive notifications about attendance, fees, results, and announcements.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Push Notifications */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <Label htmlFor="push" className="text-base font-medium">Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive instant alerts in your browser
              </p>
            </div>
          </div>
          <Switch
            id="push"
            checked={preferences.push_notifications_enabled}
            onCheckedChange={() => handleToggle("push_notifications_enabled")}
          />
        </div>

        {/* WhatsApp Notifications */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
              <MessageCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <Label htmlFor="whatsapp" className="text-base font-medium">WhatsApp Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Get important updates on WhatsApp
              </p>
            </div>
          </div>
          <Switch
            id="whatsapp"
            checked={preferences.whatsapp_notifications_enabled}
            onCheckedChange={() => handleToggle("whatsapp_notifications_enabled")}
          />
        </div>

        {/* SMS Notifications */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <Smartphone className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <Label htmlFor="sms" className="text-base font-medium">SMS Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive text messages for urgent alerts
              </p>
            </div>
          </div>
          <Switch
            id="sms"
            checked={preferences.sms_notifications_enabled}
            onCheckedChange={() => handleToggle("sms_notifications_enabled")}
          />
        </div>

        {/* Email Notice */}
        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 border border-dashed">
          <div className="p-2 rounded-full bg-muted">
            <Mail className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">Email Notifications</p>
            <p className="text-xs text-muted-foreground">
              Email notifications are always enabled for important updates.
            </p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Preferences"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default NotificationPreferences;
