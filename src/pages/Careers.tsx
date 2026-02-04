import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, MapPin, Clock, Building2, ArrowLeft, FileText } from "lucide-react";
import { format } from "date-fns";

interface Career {
  id: string;
  title: string;
  department: string | null;
  description: string;
  requirements: string | null;
  location: string | null;
  employment_type: string | null;
  created_at: string;
}

const Careers = () => {
  const [careers, setCareers] = useState<Career[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCareer, setSelectedCareer] = useState<Career | null>(null);

  useEffect(() => {
    const fetchCareers = async () => {
      const { data, error } = await supabase
        .from("careers")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setCareers(data);
      }
      setLoading(false);
    };

    fetchCareers();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 hero-gradient border-b border-primary/20 shadow-lg">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/images/school-logo.png" 
              alt="The Suffah Public School & College"
              className="w-12 h-12 rounded-full object-cover shadow-md"
            />
            <div>
              <h1 className="font-heading text-lg font-bold text-primary-foreground">The Suffah</h1>
              <p className="text-xs text-primary-foreground/70">Public School & College</p>
            </div>
          </div>
          <Link to="/">
            <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10 gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Button>
          </Link>
        </div>
      </nav>

      {/* Header */}
      <section className="py-16 hero-gradient text-primary-foreground">
        <div className="container mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 text-sm font-medium mb-6">
            <Briefcase className="w-4 h-4" />
            Career Opportunities
          </div>
          <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">Join Our Team</h1>
          <p className="text-primary-foreground/80 max-w-2xl mx-auto">
            We're looking for passionate educators and professionals to join our mission of providing quality education.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            </div>
          ) : careers.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Open Positions</h3>
              <p className="text-muted-foreground">Check back later for new opportunities.</p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Career List */}
              <div className="lg:col-span-1 space-y-4">
                <h2 className="font-semibold text-lg mb-4">
                  {careers.length} Open Position{careers.length !== 1 ? "s" : ""}
                </h2>
                {careers.map((career) => (
                  <Card
                    key={career.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedCareer?.id === career.id ? "border-primary ring-1 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedCareer(career)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-medium">{career.title}</h3>
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {career.employment_type || "Full-time"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {career.department && (
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {career.department}
                          </div>
                        )}
                        {career.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {career.location}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Career Details */}
              <div className="lg:col-span-2">
                {selectedCareer ? (
                  <Card>
                    <CardContent className="p-8">
                      <div className="flex items-start justify-between gap-4 mb-6">
                        <div>
                          <h2 className="font-heading text-2xl font-bold mb-2">{selectedCareer.title}</h2>
                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                            {selectedCareer.department && (
                              <div className="flex items-center gap-1">
                                <Building2 className="w-4 h-4" />
                                {selectedCareer.department}
                              </div>
                            )}
                            {selectedCareer.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {selectedCareer.location}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              Posted {format(new Date(selectedCareer.created_at), "MMMM d, yyyy")}
                            </div>
                          </div>
                        </div>
                        <Badge>{selectedCareer.employment_type || "Full-time"}</Badge>
                      </div>

                      <div className="space-y-6">
                        <div>
                          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                            <FileText className="w-5 h-5" /> Job Description
                          </h3>
                          <p className="text-muted-foreground whitespace-pre-wrap">
                            {selectedCareer.description}
                          </p>
                        </div>

                        {selectedCareer.requirements && (
                          <div>
                            <h3 className="font-semibold text-lg mb-3">Requirements</h3>
                            <p className="text-muted-foreground whitespace-pre-wrap">
                              {selectedCareer.requirements}
                            </p>
                          </div>
                        )}

                        <div className="pt-4 border-t">
                          <p className="text-sm text-muted-foreground mb-4">
                            Interested in this position? Contact us at the school office or email your CV to{" "}
                            <a href="mailto:careers@suffah.edu.pk" className="text-primary hover:underline">
                              careers@suffah.edu.pk
                            </a>
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                      <h3 className="font-semibold text-lg mb-2">Select a Position</h3>
                      <p className="text-muted-foreground">
                        Click on a position from the list to view details.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-foreground text-background">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img 
                src="/images/school-logo.png" 
                alt="The Suffah Public School & College"
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <h3 className="font-heading font-bold">The Suffah Public School & College</h3>
                <p className="text-sm text-muted">Excellence in Education</p>
              </div>
            </div>
            <p className="text-sm text-muted">© {new Date().getFullYear()} The Suffah. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Careers;
