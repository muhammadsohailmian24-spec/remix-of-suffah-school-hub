import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { GraduationCap, Lock, ArrowLeft, IdCard, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  // Student login
  const [studentId, setStudentId] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [studentRememberMe, setStudentRememberMe] = useState(false);
  // Parent login
  const [parentCnic, setParentCnic] = useState("");
  const [parentPassword, setParentPassword] = useState("");
  const [parentRememberMe, setParentRememberMe] = useState(false);
  useEffect(() => {
    // Check if user came from logout - don't auto-redirect in that case
    const params = new URLSearchParams(window.location.search);
    const fromLogout = params.get('logout') === 'true';
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Only redirect on explicit sign in event, not on existing session
      if (event === 'SIGNED_IN' && session) {
        navigate("/dashboard");
      }
    });

    const checkUser = async () => {
      // Skip auto-redirect if coming from logout
      if (fromLogout) {
        // Clear the logout param from URL
        window.history.replaceState({}, '', '/auth');
        return;
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkUser();

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleStudentSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const studentEmail = `${studentId.toLowerCase().trim()}@suffah.local`;
      
      // Store remember me preference
      if (studentRememberMe) {
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberMe');
        sessionStorage.setItem('sessionOnly', 'true');
      }
      
      const { error } = await supabase.auth.signInWithPassword({
        email: studentEmail,
        password: studentPassword,
      });

      if (error) throw error;

      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: "Invalid Student ID or password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleParentSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Clean CNIC (remove dashes) and convert to email format
      const cleanCnic = parentCnic.replace(/-/g, "").trim();
      const parentEmail = `${cleanCnic}@suffah.local`;
      
      // Store remember me preference
      if (parentRememberMe) {
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberMe');
        sessionStorage.setItem('sessionOnly', 'true');
      }
      
      const { error } = await supabase.auth.signInWithPassword({
        email: parentEmail,
        password: parentPassword,
      });

      if (error) throw error;

      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: "Invalid CNIC or password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Mobile/Tablet Background Design */}
      <div className="lg:hidden absolute inset-0 hero-gradient">
        <div className="absolute inset-0 pattern-dots opacity-10" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary-foreground/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      </div>

      {/* Left Panel - Branding (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/2 hero-gradient p-12 flex-col justify-between relative">
        <div className="absolute inset-0 pattern-dots opacity-10" />
        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
        
        <div className="space-y-6 relative z-10">
          <img 
            src="/images/school-logo.png" 
            alt="The Suffah Public School & College" 
            className="w-20 h-20 rounded-full object-cover shadow-lg border-2 border-primary-foreground/20"
          />
          <h1 className="font-heading text-4xl font-bold text-primary-foreground">
            The Suffah<br />Public School & College
          </h1>
          <p className="text-primary-foreground/80 text-lg max-w-md">
            Access your personalized portal for academic excellence. Track your 
            progress, attendance, and connect with your educational community.
          </p>
        </div>
        
        <p className="text-primary-foreground/60 text-sm relative z-10">
          © {new Date().getFullYear()} The Suffah. Excellence in Education.
        </p>
      </div>

      {/* Right Panel - Sign In Form */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile Header with enhanced design */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground transition-colors mb-6">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
            <div className="flex flex-col items-center gap-3">
              <img 
                src="/images/school-logo.png" 
                alt="The Suffah Public School & College" 
                className="w-16 h-16 rounded-full object-cover shadow-xl border-2 border-primary-foreground/30"
              />
              <div>
                <h1 className="font-heading text-xl font-bold text-primary-foreground">The Suffah</h1>
                <p className="text-sm text-primary-foreground/70">Public School & College</p>
              </div>
            </div>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Welcome Back</CardTitle>
              <CardDescription>Sign in to access your portal</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="student" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="student" className="gap-2">
                    <GraduationCap className="w-4 h-4" />
                    Student
                  </TabsTrigger>
                  <TabsTrigger value="parent" className="gap-2">
                    <Users className="w-4 h-4" />
                    Parent
                  </TabsTrigger>
                </TabsList>
                
                {/* Student Login Tab */}
                <TabsContent value="student">
                  <form onSubmit={handleStudentSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="student-id">Student ID</Label>
                      <div className="relative">
                        <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="student-id"
                          type="text"
                          placeholder="e.g., STU001"
                          className="pl-10"
                          value={studentId}
                          onChange={(e) => setStudentId(e.target.value)}
                          required
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Enter the ID provided by your school</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="student-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="student-password"
                          type="password"
                          placeholder="••••••••"
                          className="pl-10"
                          value={studentPassword}
                          onChange={(e) => setStudentPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="student-remember" 
                        checked={studentRememberMe}
                        onCheckedChange={(checked) => setStudentRememberMe(checked === true)}
                      />
                      <Label htmlFor="student-remember" className="text-sm font-normal cursor-pointer">
                        Remember me
                      </Label>
                    </div>
                    <Button type="submit" className="w-full hero-gradient text-primary-foreground" disabled={isLoading}>
                      {isLoading ? "Signing in..." : "Sign In as Student"}
                    </Button>
                  </form>
                </TabsContent>
                
                {/* Parent Login Tab */}
                <TabsContent value="parent">
                  <form onSubmit={handleParentSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="parent-cnic">Father's CNIC</Label>
                      <div className="relative">
                        <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="parent-cnic"
                          type="text"
                          placeholder="12345-1234567-1"
                          className="pl-10"
                          value={parentCnic}
                          onChange={(e) => setParentCnic(e.target.value)}
                          required
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Enter your CNIC number (with or without dashes)</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parent-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="parent-password"
                          type="password"
                          placeholder="••••••••"
                          className="pl-10"
                          value={parentPassword}
                          onChange={(e) => setParentPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="parent-remember" 
                        checked={parentRememberMe}
                        onCheckedChange={(checked) => setParentRememberMe(checked === true)}
                      />
                      <Label htmlFor="parent-remember" className="text-sm font-normal cursor-pointer">
                        Remember me
                      </Label>
                    </div>
                    <Button type="submit" className="w-full hero-gradient text-primary-foreground" disabled={isLoading}>
                      {isLoading ? "Signing in..." : "Sign In as Parent"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
              
              <div className="mt-6 pt-6 border-t space-y-3">
                <p className="text-sm text-muted-foreground text-center">
                  Don't have an account? Contact your school administrator to get your login credentials.
                </p>
                <div className="text-center">
                  <Link to="/staff-login" className="text-sm text-primary hover:underline">
                    Staff / Admin Login →
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;