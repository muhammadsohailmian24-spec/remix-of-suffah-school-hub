import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Eye, FileText, Loader2 } from "lucide-react";
import { downloadProjectFeaturesPdf } from "@/utils/generateProjectFeaturesPdf";
import { toast } from "sonner";
import DocumentPreviewDialog from "@/components/DocumentPreviewDialog";
import { generateProjectFeaturesPdf } from "@/utils/generateProjectFeaturesPdf";

const ProjectFeatures = () => {
  const [downloading, setDownloading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadProjectFeaturesPdf();
      toast.success("Features PDF downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setDownloading(false);
    }
  };

  const features = [
    {
      category: "Public Pages",
      items: [
        "Landing Page with Hero Section & Statistics",
        "Online Admissions Portal with Photo Upload",
        "Staff Login Portal",
        "Student & Parent Login with Tabs"
      ]
    },
    {
      category: "Admin Dashboard",
      items: [
        "Analytics & Statistics with Charts",
        "Quick Actions Panel",
        "Global Student Search",
        "System Notifications"
      ]
    },
    {
      category: "Student Management",
      items: [
        "Student Registration & Profiles",
        "Student ID Cards with QR Codes",
        "Student Portal Access",
        "Roll Number Slips"
      ]
    },
    {
      category: "Teacher Management",
      items: [
        "Teacher Profiles & Departments",
        "Teacher ID Cards (Green Theme)",
        "Teacher Portal with Class Management",
        "Study Materials Upload"
      ]
    },
    {
      category: "Attendance System",
      items: [
        "QR Code Scanner",
        "Manual Attendance Entry",
        "Attendance Reports (PDF/Excel)",
        "Parent Absence Notifications"
      ]
    },
    {
      category: "Fee Management",
      items: [
        "Fee Structure Configuration",
        "Payment Recording & Receipts",
        "Fee Analytics Dashboard",
        "Pending Dues Tracking"
      ]
    },
    {
      category: "Exam & Results",
      items: [
        "Exam Scheduling",
        "Marks Entry System",
        "Award List Generation",
        "DMC & Certificate Generation"
      ]
    },
    {
      category: "Communication",
      items: [
        "Announcements System",
        "In-app Notifications",
        "Email/SMS Alerts",
        "Parent Portal Access"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 hero-gradient border-b border-primary/20 shadow-lg">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <img 
              src="/images/school-logo.png" 
              alt="The Suffah Public School & College"
              className="w-10 h-10 rounded-full object-cover shadow-md"
            />
            <div>
              <h1 className="font-heading text-lg font-bold text-primary-foreground">Project Features</h1>
              <p className="text-xs text-primary-foreground/70">Complete Documentation</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              className="gap-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="w-4 h-4" />
              Preview PDF
            </Button>
            <Button 
              className="gap-2 bg-gold-500 hover:bg-gold-600 text-foreground"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Download PDF
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-12 hero-gradient text-primary-foreground">
        <div className="container mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 text-sm font-medium mb-6">
            <FileText className="w-4 h-4" />
            Comprehensive Documentation
          </div>
          <h1 className="font-heading text-3xl md:text-5xl font-bold mb-4">
            School Management System Features
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto mb-8">
            A complete overview of all features available in The Suffah Public School & College 
            Management System. Download the PDF for a detailed documentation with wireframes.
          </p>
          <div className="flex justify-center gap-4">
            <Button 
              size="lg"
              variant="outline"
              className="gap-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="w-5 h-5" />
              Preview Document
            </Button>
            <Button 
              size="lg"
              className="gap-2 bg-gold-500 hover:bg-gold-600 text-foreground"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              Download Full PDF
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-center mb-12">
            Feature Categories
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="stat-card hover:shadow-lg transition-shadow"
              >
                <h3 className="font-semibold text-lg text-primary mb-4">
                  {feature.category}
                </h3>
                <ul className="space-y-2">
                  {feature.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-gold-500 mt-1.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PDF Contents */}
      <section className="py-16 bg-accent/30">
        <div className="container mx-auto px-6">
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-center mb-8">
            What's in the PDF?
          </h2>
          <div className="max-w-3xl mx-auto">
            <div className="bg-card rounded-xl p-8 shadow-lg">
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold">1</span>
                  </span>
                  <div>
                    <h4 className="font-semibold">Cover Page</h4>
                    <p className="text-sm text-muted-foreground">Professional cover with school branding and version info</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold">2</span>
                  </span>
                  <div>
                    <h4 className="font-semibold">Table of Contents</h4>
                    <p className="text-sm text-muted-foreground">Organized navigation with page numbers</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold">3</span>
                  </span>
                  <div>
                    <h4 className="font-semibold">Public Pages with Wireframes</h4>
                    <p className="text-sm text-muted-foreground">Visual wireframes of Landing, Admissions, and Login pages</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold">4</span>
                  </span>
                  <div>
                    <h4 className="font-semibold">12+ Feature Categories</h4>
                    <p className="text-sm text-muted-foreground">Detailed descriptions of all modules with highlights</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold">5</span>
                  </span>
                  <div>
                    <h4 className="font-semibold">Technology Stack</h4>
                    <p className="text-sm text-muted-foreground">Complete list of technologies and security features</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold">6</span>
                  </span>
                  <div>
                    <h4 className="font-semibold">Contact Information</h4>
                    <p className="text-sm text-muted-foreground">School details and registration numbers</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="font-heading text-2xl md:text-3xl font-bold mb-4">
            Ready to Download?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Get the complete features documentation in a professionally formatted PDF 
            with wireframes and detailed descriptions.
          </p>
          <Button 
            size="lg"
            className="gap-2 bg-primary hover:bg-primary/90"
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Download className="w-5 h-5" />
            )}
            Download Features PDF
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-foreground text-background">
        <div className="container mx-auto px-6 text-center">
          <p className="text-sm text-muted">
            © {new Date().getFullYear()} The Suffah Public School & College. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Preview Dialog */}
      <DocumentPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title="Project Features Documentation"
        generatePdf={generateProjectFeaturesPdf}
        filename="Suffah-School-Management-System-Features.pdf"
      />
    </div>
  );
};

export default ProjectFeatures;
