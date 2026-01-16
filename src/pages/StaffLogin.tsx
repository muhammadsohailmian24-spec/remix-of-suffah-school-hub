import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, type Easing } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Lock, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const easeInOut: Easing = [0.42, 0, 0.58, 1];

const floatingAnimation = {
  animate: {
    y: [0, -20, 0],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: easeInOut,
    },
  },
};

const floatingAnimationDelayed = {
  animate: {
    y: [0, 20, 0],
    transition: {
      duration: 8,
      repeat: Infinity,
      ease: easeInOut,
    },
  },
};

const pulseGlow = {
  animate: {
    scale: [1, 1.1, 1],
    opacity: [0.3, 0.5, 0.3],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: easeInOut,
    },
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: easeInOut,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: easeInOut,
    },
  },
};

const StaffLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromLogout = params.get('logout') === 'true';
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate("/dashboard");
      }
    });

    const checkUser = async () => {
      if (fromLogout) {
        window.history.replaceState({}, '', '/staff-login');
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

  const handleStaffSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberMe');
        sessionStorage.setItem('sessionOnly', 'true');
      }
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Animated Background Orbs - Mobile/Tablet */}
      <div className="lg:hidden absolute inset-0 hero-gradient">
        <div className="absolute inset-0 pattern-dots opacity-10" />
        <motion.div
          {...floatingAnimation}
          className="absolute top-10 left-10 w-32 h-32 bg-secondary/30 rounded-full blur-2xl"
        />
        <motion.div
          {...floatingAnimationDelayed}
          className="absolute top-1/4 right-5 w-48 h-48 bg-primary-foreground/20 rounded-full blur-3xl"
        />
        <motion.div
          {...pulseGlow}
          className="absolute bottom-20 left-1/4 w-64 h-64 bg-secondary/20 rounded-full blur-3xl"
        />
        <motion.div
          {...floatingAnimation}
          className="absolute bottom-10 right-10 w-40 h-40 bg-primary-foreground/15 rounded-full blur-2xl"
        />
      </div>

      {/* Left Panel - Branding (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/2 hero-gradient p-12 flex-col justify-between relative">
        <div className="absolute inset-0 pattern-dots opacity-10" />
        
        {/* Animated Desktop Orbs */}
        <motion.div
          {...floatingAnimation}
          className="absolute top-20 right-20 w-48 h-48 bg-secondary/20 rounded-full blur-3xl"
        />
        <motion.div
          {...floatingAnimationDelayed}
          className="absolute bottom-32 left-20 w-64 h-64 bg-primary-foreground/10 rounded-full blur-3xl"
        />
        <motion.div
          {...pulseGlow}
          className="absolute top-1/2 right-1/4 w-32 h-32 bg-secondary/30 rounded-full blur-2xl"
        />

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10"
        >
          <Link to="/" className="inline-flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="space-y-6 relative z-10"
        >
          <motion.img
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
            src="/images/school-logo.png" 
            alt="The Suffah Public School & College" 
            className="w-20 h-20 rounded-full object-cover shadow-lg border-2 border-primary-foreground/20"
          />
          <motion.h1
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="font-heading text-4xl font-bold text-primary-foreground"
          >
            Staff Portal
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-primary-foreground/80 text-lg max-w-md"
          >
            Access administrative tools, manage students, and oversee 
            school operations from your dedicated portal.
          </motion.p>
        </motion.div>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="text-primary-foreground/60 text-sm relative z-10"
        >
          © {new Date().getFullYear()} The Suffah. Excellence in Education.
        </motion.p>
      </div>

      {/* Right Panel - Sign In Form */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile Header with animations */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:hidden text-center mb-8"
          >
            <Link to="/" className="inline-flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground transition-colors mb-6">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.6, type: "spring", bounce: 0.5, delay: 0.2 }}
              className="flex flex-col items-center gap-3"
            >
              <img 
                src="/images/school-logo.png" 
                alt="The Suffah Public School & College" 
                className="w-16 h-16 rounded-full object-cover shadow-xl border-2 border-primary-foreground/30"
              />
              <div>
                <h1 className="font-heading text-xl font-bold text-primary-foreground">The Suffah</h1>
                <p className="text-sm text-primary-foreground/70">Staff Portal</p>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <Card className="border-0 shadow-2xl backdrop-blur-sm bg-card/95">
              <CardHeader>
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <motion.div variants={itemVariants}>
                    <CardTitle className="font-heading text-2xl">Staff Login</CardTitle>
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <CardDescription>Sign in with your staff email and password</CardDescription>
                  </motion.div>
                </motion.div>
              </CardHeader>
              <CardContent>
                <motion.form
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  onSubmit={handleStaffSignIn}
                  className="space-y-4"
                >
                  <motion.div variants={itemVariants} className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="you@example.com"
                        className="pl-10 transition-all duration-300 focus:shadow-md focus:shadow-primary/20"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </motion.div>
                  <motion.div variants={itemVariants} className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10 transition-all duration-300 focus:shadow-md focus:shadow-primary/20"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </motion.div>
                  <motion.div variants={itemVariants} className="flex items-center space-x-2">
                    <Checkbox 
                      id="staff-remember" 
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                    />
                    <Label htmlFor="staff-remember" className="text-sm font-normal cursor-pointer">
                      Remember me
                    </Label>
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <Button
                      type="submit"
                      className="w-full hero-gradient text-primary-foreground relative overflow-hidden group"
                      disabled={isLoading}
                    >
                      <span className="relative z-10">
                        {isLoading ? "Signing in..." : "Sign In"}
                      </span>
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        initial={{ x: "-100%" }}
                        whileHover={{ x: "100%" }}
                        transition={{ duration: 0.6 }}
                      />
                    </Button>
                  </motion.div>
                </motion.form>
                
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="mt-6 pt-6 border-t text-center space-y-3"
                >
                  <p className="text-sm text-muted-foreground">
                    This login is for teachers and administrators only.
                  </p>
                  <Link to="/auth" className="text-sm text-primary hover:underline inline-block transition-transform hover:scale-105">
                    ← Student / Parent Login
                  </Link>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default StaffLogin;
