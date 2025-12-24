import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, ArrowLeft, CheckCircle, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Admissions = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    applicant_name: "",
    applicant_email: "",
    applicant_phone: "",
    date_of_birth: "",
    gender: "",
    parent_name: "",
    parent_phone: "",
    parent_email: "",
    address: "",
    applying_for_class: "",
    previous_school: "",
    previous_class: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("admissions" as any)
        .insert({
          ...formData,
          applying_for_class: parseInt(formData.applying_for_class),
        } as any);

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: "Application Submitted!",
        description: "We'll review your application and get back to you soon.",
      });
    } catch (error: any) {
      toast({
        title: "Submission failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-lg w-full text-center">
          <CardContent className="pt-10 pb-10">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <h2 className="font-heading text-2xl font-bold mb-2">Application Submitted!</h2>
            <p className="text-muted-foreground mb-6">
              Thank you for applying to The Suffah Public School & College. 
              We'll review your application and contact you within 5-7 business days.
            </p>
            <div className="flex gap-3 justify-center">
              <Link to="/">
                <Button variant="outline">Back to Home</Button>
              </Link>
              <Button onClick={() => setSubmitted(false)} className="hero-gradient text-primary-foreground">
                Submit Another
              </Button>
            </div>
          </CardContent>
        </Card>
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
                <p className="text-xs text-muted-foreground">Public School & College</p>
              </div>
            </Link>
          </div>
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="font-heading text-4xl font-bold mb-4">Apply for Admission</h1>
            <p className="text-muted-foreground text-lg">
              Join our community of learners at The Suffah Public School & College
            </p>
          </div>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Admission Application Form</CardTitle>
              <CardDescription>
                Please fill out all required fields accurately. Fields marked with * are mandatory.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Student Information */}
                <div>
                  <h3 className="font-semibold text-lg mb-4 pb-2 border-b">Student Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="applicant_name">Full Name *</Label>
                      <Input
                        id="applicant_name"
                        placeholder="Student's full name"
                        value={formData.applicant_name}
                        onChange={(e) => handleChange("applicant_name", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date_of_birth">Date of Birth *</Label>
                      <Input
                        id="date_of_birth"
                        type="date"
                        value={formData.date_of_birth}
                        onChange={(e) => handleChange("date_of_birth", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender *</Label>
                      <Select value={formData.gender} onValueChange={(value) => handleChange("gender", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="applying_for_class">Applying for Class *</Label>
                      <Select value={formData.applying_for_class} onValueChange={(value) => handleChange("applying_for_class", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent>
                          {[...Array(12)].map((_, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>
                              Class {i + 1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="applicant_email">Email *</Label>
                      <Input
                        id="applicant_email"
                        type="email"
                        placeholder="student@example.com"
                        value={formData.applicant_email}
                        onChange={(e) => handleChange("applicant_email", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="applicant_phone">Phone *</Label>
                      <Input
                        id="applicant_phone"
                        placeholder="+92 300 1234567"
                        value={formData.applicant_phone}
                        onChange={(e) => handleChange("applicant_phone", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Parent/Guardian Information */}
                <div>
                  <h3 className="font-semibold text-lg mb-4 pb-2 border-b">Parent/Guardian Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="parent_name">Parent/Guardian Name *</Label>
                      <Input
                        id="parent_name"
                        placeholder="Full name"
                        value={formData.parent_name}
                        onChange={(e) => handleChange("parent_name", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parent_phone">Parent Phone *</Label>
                      <Input
                        id="parent_phone"
                        placeholder="+92 300 1234567"
                        value={formData.parent_phone}
                        onChange={(e) => handleChange("parent_phone", e.target.value)}
                        required
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="parent_email">Parent Email</Label>
                      <Input
                        id="parent_email"
                        type="email"
                        placeholder="parent@example.com"
                        value={formData.parent_email}
                        onChange={(e) => handleChange("parent_email", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Address & Previous Education */}
                <div>
                  <h3 className="font-semibold text-lg mb-4 pb-2 border-b">Address & Previous Education</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="address">Full Address *</Label>
                      <Textarea
                        id="address"
                        placeholder="House/Street, City, Province"
                        value={formData.address}
                        onChange={(e) => handleChange("address", e.target.value)}
                        required
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="previous_school">Previous School</Label>
                        <Input
                          id="previous_school"
                          placeholder="Name of previous school"
                          value={formData.previous_school}
                          onChange={(e) => handleChange("previous_school", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="previous_class">Previous Class</Label>
                        <Input
                          id="previous_class"
                          placeholder="Last class attended"
                          value={formData.previous_class}
                          onChange={(e) => handleChange("previous_class", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Document Upload Info */}
                <div className="bg-accent/50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Upload className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Required Documents</p>
                      <p className="text-sm text-muted-foreground">
                        After submitting this form, you'll need to provide: Birth certificate, 
                        Previous school records, Passport-size photos (2), and Parent's CNIC copy.
                      </p>
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full hero-gradient text-primary-foreground h-12 text-lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit Application"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Admissions;
