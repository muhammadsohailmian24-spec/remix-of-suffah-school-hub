import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, Info, Calendar } from "lucide-react";
import { format } from "date-fns";

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  created_at: string;
}

const AnnouncementsSection = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("id, title, content, priority, created_at")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(5);

      if (!error && data) {
        setAnnouncements(data);
      }
      setLoading(false);
    };

    fetchAnnouncements();
  }, []);

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case "high":
        return {
          badge: "bg-destructive/10 text-destructive border-destructive/20",
          icon: <AlertTriangle className="w-4 h-4" />,
        };
      case "normal":
        return {
          badge: "bg-primary/10 text-primary border-primary/20",
          icon: <Bell className="w-4 h-4" />,
        };
      default:
        return {
          badge: "bg-muted text-muted-foreground border-muted",
          icon: <Info className="w-4 h-4" />,
        };
    }
  };

  if (loading) {
    return (
      <section id="announcements" className="py-16 bg-accent/30">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        </div>
      </section>
    );
  }

  if (announcements.length === 0) {
    return null;
  }

  return (
    <section id="announcements" className="py-16 bg-accent/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Bell className="w-4 h-4" />
            Latest Updates
          </div>
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">Announcements</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Stay updated with the latest news and important announcements
          </p>
        </div>

        <div className="grid gap-4 max-w-3xl mx-auto">
          {announcements.map((announcement, i) => {
            const styles = getPriorityStyles(announcement.priority);
            return (
              <Card
                key={announcement.id}
                className="overflow-hidden hover:shadow-lg transition-shadow animate-slide-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${styles.badge}`}>
                      {styles.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{announcement.title}</h3>
                        <Badge variant="outline" className={styles.badge}>
                          {announcement.priority}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground line-clamp-2 mb-3">
                        {announcement.content}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(announcement.created_at), "MMM d, yyyy")}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default AnnouncementsSection;
