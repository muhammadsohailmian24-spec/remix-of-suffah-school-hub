import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle, Upload, Camera } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Admissions = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    applicant_name: "",
    date_of_birth: "",
    gender: "",
    applicant_phone: "",
    father_name: "",
    father_phone: "",
    father_cnic: "",
    address: "",
    applying_for_class: "",
    previous_school: "",
    previous_class: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Photo must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile) return null;
    
    const fileExt = photoFile.name.split(".").pop();
    const fileName = `admission-${Date.now()}.${fileExt}`;
    const filePath = `admissions/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("student-photos")
      .upload(filePath, photoFile);

    if (uploadError) {
      console.error("Photo upload error:", uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("student-photos")
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.applicant_name || !formData.father_name || !formData.father_phone || 
        !formData.father_cnic || !formData.address || !formData.date_of_birth || 
        !formData.applying_for_class) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields marked with *",
        variant: "destructive",
      });
      return;
    }

    // CNIC validation (13 digits)
    const cnicClean = formData.father_cnic.replace(/-/g, "");
    if (!/^\d{13}$/.test(cnicClean)) {
      toast({
        title: "Invalid CNIC",
        description: "Father's CNIC must be 13 digits (e.g., 12345-1234567-1)",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload photo if provided
      const photoUrl = await uploadPhoto();

      const { error } = await supabase
        .from("admissions")
        .insert({
          applicant_name: formData.applicant_name,
          applicant_email: `pending-${Date.now()}@suffah.local`, // Placeholder email
          applicant_phone: formData.applicant_phone || formData.father_phone,
          date_of_birth: formData.date_of_birth,
          gender: formData.gender || "male",
          parent_name: formData.father_name,
          parent_phone: formData.father_phone,
          parent_email: `${cnicClean}@suffah.local`, // CNIC-based placeholder
          address: formData.address,
          applying_for_class: parseInt(formData.applying_for_class),
          previous_school: formData.previous_school || null,
          previous_class: formData.previous_class || null,
          photo_url: photoUrl,
          documents: { father_cnic: cnicClean },
        });

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
              <Button onClick={() => {
                setSubmitted(false);
                setPhotoPreview(null);
                setPhotoFile(null);
                setFormData({
                  applicant_name: "",
                  date_of_birth: "",
                  gender: "",
                  applicant_phone: "",
                  father_name: "",
                  father_phone: "",
                  father_cnic: "",
                  address: "",
                  applying_for_class: "",
                  previous_school: "",
                  previous_class: "",
                });
              }} className="hero-gradient text-primary-foreground">
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
              <img 
                src="/images/school-logo.png" 
                alt="The Suffah Public School & College" 
                className="w-10 h-10 rounded-full object-cover shadow-md"
              />
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
                {/* Student Photo */}
                <div>
                  <h3 className="font-semibold text-lg mb-4 pb-2 border-b">Student Photo</h3>
                  <div className="flex items-center gap-6">
                    <div 
                      className="w-32 h-40 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                          <span className="text-xs text-muted-foreground text-center px-2">Click to upload photo</span>
                        </>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    <div className="text-sm text-muted-foreground">
                      <p>Upload a passport-size photo</p>
                      <p>Max size: 5MB</p>
                      <p>Formats: JPG, PNG</p>
                    </div>
                  </div>
                </div>

                {/* Student Information */}
                <div>
                  <h3 className="font-semibold text-lg mb-4 pb-2 border-b">Student Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="applicant_name">Student Full Name *</Label>
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
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="applicant_phone">Student Phone (Optional)</Label>
                      <Input
                        id="applicant_phone"
                        placeholder="+92 300 1234567"
                        value={formData.applicant_phone}
                        onChange={(e) => handleChange("applicant_phone", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Father/Guardian Information */}
                <div>
                  <h3 className="font-semibold text-lg mb-4 pb-2 border-b">Father/Guardian Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="father_name">Father's Name *</Label>
                      <Input
                        id="father_name"
                        placeholder="Father's full name"
                        value={formData.father_name}
                        onChange={(e) => handleChange("father_name", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="father_phone">Father's Phone *</Label>
                      <Input
                        id="father_phone"
                        placeholder="+92 300 1234567"
                        value={formData.father_phone}
                        onChange={(e) => handleChange("father_phone", e.target.value)}
                        required
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="father_cnic">Father's CNIC *</Label>
                      <Input
                        id="father_cnic"
                        placeholder="12345-1234567-1"
                        value={formData.father_cnic}
                        onChange={(e) => handleChange("father_cnic", e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        This will be used as the parent login username after admission approval
                      </p>
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
                      <p className="font-medium">Required Documents (Bring at the time of admission)</p>
                      <p className="text-sm text-muted-foreground">
                        Birth certificate, Previous school records, Passport-size photos (2), and Father's CNIC copy.
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