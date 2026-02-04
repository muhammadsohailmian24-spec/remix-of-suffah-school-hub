import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, MapPin, Clock, ArrowRight, Building2 } from "lucide-react";
import { format } from "date-fns";

interface Career {
  id: string;
  title: string;
  department: string | null;
  description: string;
  location: string | null;
  employment_type: string | null;
  created_at: string;
}

const CareersSection = () => {
  const [careers, setCareers] = useState<Career[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCareers = async () => {
      const { data, error } = await supabase
        .from("careers")
        .select("id, title, department, description, location, employment_type, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(4);

      if (!error && data) {
        setCareers(data);
      }
      setLoading(false);
    };

    fetchCareers();
  }, []);

  if (loading) {
    return (
      <section id="careers" className="py-16">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        </div>
      </section>
    );
  }

  if (careers.length === 0) {
    return null;
  }

  return (
    <section id="careers" className="py-16">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold-500/10 text-gold-600 text-sm font-medium mb-4">
            <Briefcase className="w-4 h-4" />
            Join Our Team
          </div>
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">Career Opportunities</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Be part of our mission to provide quality education. Explore open positions below.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {careers.map((career, i) => (
            <Card
              key={career.id}
              className="group hover:shadow-lg transition-all hover:border-primary/50 animate-slide-up"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Briefcase className="w-5 h-5 text-primary" />
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {career.employment_type || "Full-time"}
                  </Badge>
                </div>
                
                <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                  {career.title}
                </h3>
                
                <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
                  {career.description}
                </p>
                
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  {career.department && (
                    <div className="flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      {career.department}
                    </div>
                  )}
                  {career.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {career.location}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {format(new Date(career.created_at), "MMM d, yyyy")}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link to="/careers">
            <Button variant="outline" className="gap-2">
              View All Positions <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CareersSection;
