import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, Users, BookOpen, Award, ArrowRight, CheckCircle } from "lucide-react";
import Gallery from "@/components/Gallery";

const Index = () => {
  const features = [
    { icon: Users, title: "Role-Based Access", desc: "Dedicated portals for admins, teachers, students & parents" },
    { icon: BookOpen, title: "Academic Management", desc: "Classes, subjects, assignments & study materials" },
    { icon: Award, title: "Results & Grades", desc: "Comprehensive exam and result management system" },
    { icon: GraduationCap, title: "Admissions", desc: "Online admission applications with tracking" },
  ];

  const stats = [
    { value: "500+", label: "Students" },
    { value: "50+", label: "Teachers" },
    { value: "20+", label: "Classes" },
    { value: "15+", label: "Years of Excellence" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/images/school-logo.jpg" 
              alt="The Suffah Public School & College" 
              className="w-12 h-12 rounded-full object-cover shadow-md"
            />
            <div>
              <h1 className="font-heading text-lg font-bold text-foreground">The Suffah</h1>
              <p className="text-xs text-muted-foreground">Public School & College</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="nav-link">
              Features
            </a>
            <a href="#gallery" className="nav-link">
              Gallery
            </a>
            <a href="#about" className="nav-link">
              About
            </a>
            <Link to="/admissions" className="nav-link">
              Admissions
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button size="sm" className="hero-gradient text-primary-foreground hover:opacity-90">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 pattern-dots opacity-50" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gold-400/10 rounded-full blur-3xl" />

        <div className="container mx-auto px-6 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-accent-foreground text-sm font-medium mb-6 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Now accepting admissions for 2026-27
            </div>

            <h1 className="font-heading text-4xl md:text-6xl font-bold text-foreground mb-6 animate-slide-up">
              Empowering Minds, <span className="text-gradient">Shaping Futures</span>
            </h1>

            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto animate-slide-up stagger-1">
              The Suffah Public School & College Management System - A comprehensive platform for students, teachers,
              parents, and administrators.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up stagger-2">
              <Link to="/auth?mode=signup">
                <Button size="lg" className="hero-gradient text-primary-foreground gap-2 px-8 btn-glow">
                  Start Your Journey <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/admissions">
                <Button size="lg" variant="outline" className="gap-2">
                  Apply for Admission
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-accent/30">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center animate-scale-in" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="font-heading text-4xl md:text-5xl font-bold text-gradient-gold mb-2">{stat.value}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">Everything You Need</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A complete school management solution designed for modern educational institutions
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="stat-card group cursor-pointer animate-slide-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <Gallery />

      {/* About Section */}
      <section id="about" className="py-20 hero-gradient text-primary-foreground">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-heading text-3xl md:text-4xl font-bold mb-6">About The Suffah</h2>
              <p className="text-primary-foreground/80 mb-6">
                Named after the historic Suffah - the learning platform at the Prophet's Mosque - we are committed to
                providing quality education that nurtures both academic excellence and moral character.
              </p>
              <ul className="space-y-3">
                {["Quality Education", "Experienced Faculty", "Modern Facilities", "Holistic Development"].map(
                  (item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-gold-400" />
                      <span>{item}</span>
                    </li>
                  ),
                )}
              </ul>
            </div>
            <div className="relative">
              <div className="w-full h-80 rounded-2xl bg-primary-foreground/10 backdrop-blur flex items-center justify-center p-6">
                <img 
                  src="/images/school-logo.jpg" 
                  alt="The Suffah Public School & College" 
                  className="max-w-full max-h-full object-contain rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-foreground text-background">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img 
                src="/images/school-logo.jpg" 
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

export default Index;
