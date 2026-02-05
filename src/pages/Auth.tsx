import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence, type Easing } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { GraduationCap, Lock, ArrowLeft, IdCard, Users, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const easeOutExpo: Easing = [0.16, 1, 0.3, 1];
const easeInOutQuart: Easing = [0.76, 0, 0.24, 1];

// Loading Skeleton Component
const LoginSkeleton = () => (
  <div className="min-h-screen flex relative overflow-hidden">
    <div className="lg:hidden absolute inset-0 hero-gradient" />
    <div className="hidden lg:flex lg:w-1/2 hero-gradient p-12 flex-col justify-between relative">
      <Skeleton className="h-6 w-32 bg-primary-foreground/20" />
      <div className="space-y-6">
        <Skeleton className="w-20 h-20 rounded-full bg-primary-foreground/20" />
        <Skeleton className="h-12 w-64 bg-primary-foreground/20" />
        <Skeleton className="h-20 w-80 bg-primary-foreground/20" />
      </div>
      <Skeleton className="h-4 w-48 bg-primary-foreground/20" />
    </div>
    <div className="flex-1 flex items-center justify-center p-6 relative z-10">
      <div className="w-full max-w-md">
        <div className="lg:hidden text-center mb-8 flex flex-col items-center gap-3">
          <Skeleton className="w-16 h-16 rounded-full" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Card className="border-0 shadow-2xl">
          <CardHeader>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-11 w-full" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-11 w-full" />
            </div>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-11 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
);

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [pageLoading, setPageLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [studentRememberMe, setStudentRememberMe] = useState(false);
  const [parentCnic, setParentCnic] = useState("");
  const [parentPassword, setParentPassword] = useState("");
  const [parentRememberMe, setParentRememberMe] = useState(false);
  const [activeTab, setActiveTab] = useState("student");

  useEffect(() => {
    // Simulate initial load
    const timer = setTimeout(() => setPageLoading(false), 800);

    const params = new URLSearchParams(window.location.search);
    const fromLogout = params.get('logout') === 'true';
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate("/dashboard");
      }
    });

    const checkUser = async () => {
      if (fromLogout) {
        window.history.replaceState({}, '', '/auth');
        return;
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkUser();

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [navigate]);

  const handleStudentSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const studentEmail = `${studentId.toLowerCase().trim()}@suffah.local`;
      
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
        duration: 3000,
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
      const cleanCnic = parentCnic.replace(/-/g, "").trim();
      const parentEmail = `${cleanCnic}@suffah.local`;
      
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
        duration: 3000,
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

  if (pageLoading) {
    return <LoginSkeleton />;
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex relative overflow-hidden"
    >
      {/* Animated Background Orbs - Mobile/Tablet */}
      <div className="lg:hidden absolute inset-0 hero-gradient">
        <div className="absolute inset-0 pattern-dots opacity-10" />
        
        {/* Floating orb 1 - Top right */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: 0.4, 
            scale: 1,
            y: [0, -30, 0],
            x: [0, 15, 0],
          }}
          transition={{ 
            opacity: { duration: 0.8, delay: 0.2 },
            scale: { duration: 0.8, delay: 0.2 },
            y: { duration: 8, repeat: Infinity, ease: "easeInOut" },
            x: { duration: 6, repeat: Infinity, ease: "easeInOut" },
          }}
          className="absolute top-10 right-10 w-40 h-40 bg-secondary/40 rounded-full blur-2xl"
        />
        
        {/* Floating orb 2 - Left */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: 0.3, 
            scale: 1,
            y: [0, 40, 0],
            rotate: [0, 10, 0],
          }}
          transition={{ 
            opacity: { duration: 0.8, delay: 0.4 },
            scale: { duration: 0.8, delay: 0.4 },
            y: { duration: 10, repeat: Infinity, ease: "easeInOut" },
            rotate: { duration: 12, repeat: Infinity, ease: "easeInOut" },
          }}
          className="absolute top-1/3 left-5 w-56 h-56 bg-primary-foreground/25 rounded-full blur-3xl"
        />
        
        {/* Pulsing orb - Bottom */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ 
            opacity: [0.2, 0.5, 0.2], 
            scale: [1, 1.2, 1],
          }}
          transition={{ 
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute bottom-32 right-1/4 w-72 h-72 bg-secondary/30 rounded-full blur-3xl"
        />
        
        {/* Small sparkle orb */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: [0.3, 0.7, 0.3],
            scale: [1, 1.1, 1],
            y: [0, -20, 0],
          }}
          transition={{ 
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute bottom-20 left-10 w-32 h-32 bg-primary-foreground/20 rounded-full blur-xl"
        />
      </div>

      {/* Left Panel - Branding (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/2 hero-gradient p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 pattern-dots opacity-10" />
        
        {/* Desktop floating orbs */}
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ 
            opacity: 0.3, 
            x: 0,
            y: [0, -40, 0],
          }}
          transition={{ 
            opacity: { duration: 1, delay: 0.3 },
            x: { duration: 1, delay: 0.3, ease: easeOutExpo },
            y: { duration: 8, repeat: Infinity, ease: "easeInOut" },
          }}
          className="absolute top-20 right-20 w-56 h-56 bg-secondary/25 rounded-full blur-3xl"
        />
        
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ 
            opacity: 0.2, 
            y: [0, 50, 0],
          }}
          transition={{ 
            opacity: { duration: 1, delay: 0.5 },
            y: { duration: 10, repeat: Infinity, ease: "easeInOut" },
          }}
          className="absolute bottom-32 left-20 w-72 h-72 bg-primary-foreground/15 rounded-full blur-3xl"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: [0.3, 0.6, 0.3], 
            scale: [1, 1.15, 1],
          }}
          transition={{ 
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.7,
          }}
          className="absolute top-1/2 right-1/3 w-40 h-40 bg-secondary/35 rounded-full blur-2xl"
        />

        {/* Back to home link */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: easeOutExpo }}
          className="relative z-10"
        >
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground transition-all duration-300 hover:gap-3"
          >
            <motion.div
              whileHover={{ x: -3 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <ArrowLeft className="w-4 h-4" />
            </motion.div>
            Back to Home
          </Link>
        </motion.div>
        
        {/* Branding content */}
        <div className="space-y-6 relative z-10">
          <motion.div
            initial={{ scale: 0, rotate: -180, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ 
              duration: 0.8, 
              delay: 0.3,
              type: "spring", 
              bounce: 0.4 
            }}
            className="relative"
          >
            <motion.div
              animate={{ 
                boxShadow: [
                  "0 0 20px rgba(255,215,0,0.3)",
                  "0 0 40px rgba(255,215,0,0.5)",
                  "0 0 20px rgba(255,215,0,0.3)",
                ]
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className="w-24 h-24 rounded-full"
            >
              <img 
                src="/images/school-logo.png" 
                alt="The Suffah Public School & College" 
                className="w-24 h-24 rounded-full object-cover shadow-lg border-2 border-primary-foreground/20"
              />
            </motion.div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.8, type: "spring" }}
              className="absolute -top-1 -right-1"
            >
              <Sparkles className="w-6 h-6 text-secondary" />
            </motion.div>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5, ease: easeOutExpo }}
            className="font-heading text-4xl font-bold text-primary-foreground"
          >
            <motion.span
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              The Suffah
            </motion.span>
            <br />
            <motion.span
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="text-secondary"
            >
              Public School & College
            </motion.span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="text-primary-foreground/80 text-lg max-w-md"
          >
            Access your personalized portal for academic excellence. Track your 
            progress, attendance, and connect with your educational community.
          </motion.p>
        </div>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.2 }}
          className="text-primary-foreground/60 text-sm relative z-10"
        >
          © {new Date().getFullYear()} The Suffah. Excellence in Education.
        </motion.p>
      </div>

      {/* Right Panel - Sign In Form */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile Header */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: easeOutExpo }}
            className="lg:hidden text-center mb-8"
          >
            <motion.div
              whileHover={{ x: -5 }}
              className="inline-block mb-6"
            >
              <Link 
                to="/" 
                className="inline-flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Link>
            </motion.div>
            
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, delay: 0.2, type: "spring", bounce: 0.5 }}
              className="flex flex-col items-center gap-3"
            >
              <motion.div
                animate={{ 
                  boxShadow: [
                    "0 0 15px rgba(255,215,0,0.2)",
                    "0 0 30px rgba(255,215,0,0.4)",
                    "0 0 15px rgba(255,215,0,0.2)",
                  ]
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className="rounded-full"
              >
                <img 
                  src="/images/school-logo.png" 
                  alt="The Suffah Public School & College" 
                  className="w-20 h-20 rounded-full object-cover shadow-xl border-2 border-primary-foreground/30"
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <h1 className="font-heading text-xl font-bold text-primary-foreground">The Suffah</h1>
                <p className="text-sm text-primary-foreground/70">Public School & College</p>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Login Card */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ 
              duration: 0.8, 
              delay: 0.3,
              ease: easeOutExpo 
            }}
          >
            <Card className="border-0 shadow-2xl backdrop-blur-sm bg-card/95 overflow-hidden">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.5, ease: easeOutExpo }}
                className="h-1 bg-gradient-to-r from-primary via-secondary to-primary origin-left"
              />
              
              <CardHeader>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                >
                  <CardTitle className="font-heading text-2xl">Welcome Back</CardTitle>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                >
                  <CardDescription>Sign in to access your portal</CardDescription>
                </motion.div>
              </CardHeader>
              
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                      <TabsTrigger 
                        value="student" 
                        className="gap-2 transition-all duration-300 data-[state=active]:shadow-md"
                      >
                        <GraduationCap className="w-4 h-4" />
                        Student
                      </TabsTrigger>
                      <TabsTrigger 
                        value="parent" 
                        className="gap-2 transition-all duration-300 data-[state=active]:shadow-md"
                      >
                        <Users className="w-4 h-4" />
                        Parent
                      </TabsTrigger>
                    </TabsList>
                  </motion.div>
                  
                  <AnimatePresence mode="wait">
                    {/* Student Login Tab */}
                    <TabsContent value="student" key="student">
                      <motion.form
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3 }}
                        onSubmit={handleStudentSignIn}
                        className="space-y-4"
                      >
                        <motion.div 
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                          className="space-y-2"
                        >
                          <Label htmlFor="student-id">Student ID</Label>
                          <div className="relative group">
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              className="absolute left-3 top-1/2 -translate-y-1/2"
                            >
                              <IdCard className="w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                            </motion.div>
                            <Input
                              id="student-id"
                              type="text"
                              placeholder="e.g., STU001"
                              className="pl-10 transition-all duration-300 focus:shadow-lg focus:shadow-primary/20 focus:scale-[1.02]"
                              value={studentId}
                              onChange={(e) => setStudentId(e.target.value)}
                              required
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">Enter the ID provided by your school</p>
                        </motion.div>
                        
                        <motion.div 
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="space-y-2"
                        >
                          <Label htmlFor="student-password">Password</Label>
                          <div className="relative group">
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              className="absolute left-3 top-1/2 -translate-y-1/2"
                            >
                              <Lock className="w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                            </motion.div>
                            <Input
                              id="student-password"
                              type="password"
                              placeholder="••••••••"
                              className="pl-10 transition-all duration-300 focus:shadow-lg focus:shadow-primary/20 focus:scale-[1.02]"
                              value={studentPassword}
                              onChange={(e) => setStudentPassword(e.target.value)}
                              required
                            />
                          </div>
                        </motion.div>
                        
                        <motion.div 
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox 
                            id="student-remember" 
                            checked={studentRememberMe}
                            onCheckedChange={(checked) => setStudentRememberMe(checked === true)}
                          />
                          <Label htmlFor="student-remember" className="text-sm font-normal cursor-pointer">
                            Remember me
                          </Label>
                        </motion.div>
                        
                        <motion.div
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                        >
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Button
                              type="submit"
                              className="w-full hero-gradient text-primary-foreground relative overflow-hidden"
                              disabled={isLoading}
                            >
                              <span className="relative z-10">
                                {isLoading ? "Signing in..." : "Sign In as Student"}
                              </span>
                              <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                animate={{ x: ["-100%", "100%"] }}
                                transition={{ 
                                  duration: 2, 
                                  repeat: Infinity,
                                  ease: "linear",
                                  repeatDelay: 1
                                }}
                              />
                            </Button>
                          </motion.div>
                        </motion.div>
                      </motion.form>
                    </TabsContent>
                    
                    {/* Parent Login Tab */}
                    <TabsContent value="parent" key="parent">
                      <motion.form
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        onSubmit={handleParentSignIn}
                        className="space-y-4"
                      >
                        <motion.div 
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                          className="space-y-2"
                        >
                          <Label htmlFor="parent-cnic">Father's CNIC</Label>
                          <div className="relative group">
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              className="absolute left-3 top-1/2 -translate-y-1/2"
                            >
                              <IdCard className="w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                            </motion.div>
                            <Input
                              id="parent-cnic"
                              type="text"
                              placeholder="12345-1234567-1"
                              className="pl-10 transition-all duration-300 focus:shadow-lg focus:shadow-primary/20 focus:scale-[1.02]"
                              value={parentCnic}
                              onChange={(e) => setParentCnic(e.target.value)}
                              required
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">Enter your CNIC number (with or without dashes)</p>
                        </motion.div>
                        
                        <motion.div 
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="space-y-2"
                        >
                          <Label htmlFor="parent-password">Password</Label>
                          <div className="relative group">
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              className="absolute left-3 top-1/2 -translate-y-1/2"
                            >
                              <Lock className="w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                            </motion.div>
                            <Input
                              id="parent-password"
                              type="password"
                              placeholder="••••••••"
                              className="pl-10 transition-all duration-300 focus:shadow-lg focus:shadow-primary/20 focus:scale-[1.02]"
                              value={parentPassword}
                              onChange={(e) => setParentPassword(e.target.value)}
                              required
                            />
                          </div>
                        </motion.div>
                        
                        <motion.div 
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox 
                            id="parent-remember" 
                            checked={parentRememberMe}
                            onCheckedChange={(checked) => setParentRememberMe(checked === true)}
                          />
                          <Label htmlFor="parent-remember" className="text-sm font-normal cursor-pointer">
                            Remember me
                          </Label>
                        </motion.div>
                        
                        <motion.div
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                        >
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Button
                              type="submit"
                              className="w-full hero-gradient text-primary-foreground relative overflow-hidden"
                              disabled={isLoading}
                            >
                              <span className="relative z-10">
                                {isLoading ? "Signing in..." : "Sign In as Parent"}
                              </span>
                              <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                animate={{ x: ["-100%", "100%"] }}
                                transition={{ 
                                  duration: 2, 
                                  repeat: Infinity,
                                  ease: "linear",
                                  repeatDelay: 1
                                }}
                              />
                            </Button>
                          </motion.div>
                        </motion.div>
                      </motion.form>
                    </TabsContent>
                  </AnimatePresence>
                </Tabs>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                  className="mt-6 pt-6 border-t space-y-3"
                >
                  <p className="text-sm text-muted-foreground text-center">
                    Don't have an account? Contact your school administrator to get your login credentials.
                  </p>
                  <div className="text-center">
                    <motion.div
                      whileHover={{ scale: 1.05, x: 5 }}
                      className="inline-block"
                    >
                      <Link to="/staff-login" className="text-sm text-primary hover:underline">
                        Staff / Admin Login →
                      </Link>
                    </motion.div>
                  </div>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default Auth;
