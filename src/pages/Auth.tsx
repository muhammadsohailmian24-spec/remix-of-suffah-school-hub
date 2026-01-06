import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  // Parent login
  const [parentCnic, setParentCnic] = useState("");
  const [parentPassword, setParentPassword] = useState("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate("/dashboard");
      }
    });

    const checkUser = async () => {
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
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 hero-gradient p-12 flex-col justify-between">
        <div>
          <Link to="/" className="inline-flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
        
          <div className="space-y-6">
            <img 
              src="/images/school-logo.jpg" 
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
        
        <p className="text-primary-foreground/60 text-sm">
          © {new Date().getFullYear()} The Suffah. Excellence in Education.
        </p>
      </div>

      {/* Right Panel - Sign In Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <img 
              src="/images/school-logo.jpg" 
              alt="The Suffah Public School & College" 
              className="w-10 h-10 rounded-full object-cover shadow-md"
            />
            <div>
              <h1 className="font-heading text-lg font-bold">The Suffah</h1>
              <p className="text-xs text-muted-foreground">Public School & College</p>
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