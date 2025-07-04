import React, { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "./hooks/use-toast";
import { useAuth } from "./contexts/AuthContext";
import { useMutation } from "@tanstack/react-query";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Separator } from "./components/ui/separator";
import { Eye, EyeOff } from "lucide-react";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./components/ui/form";

import { loginSchema } from './lib/validation';

const loginFormSchema = loginSchema;

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const AuthPage: React.FC = () => {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const { login } = useAuth();

  // Login form setup
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "johndoe",
      password: "password123",
    },
  });

  // Register form setup
  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (data: z.infer<typeof loginSchema>) => {
      console.log("Login mutation triggered with data:", data);
      try {
        await login(data.username, data.password);
        console.log("Login successful");
      } catch (error) {
        console.error("Login error in mutation:", error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log("Login mutation onSuccess triggered");
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      // Navigation will be handled by ProtectedRoute after login
    },
    onError: (error: any) => {
      console.error("Login mutation error:", error);
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again",
        variant: "destructive",
      });
    }
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (data: z.infer<typeof registerSchema>) => {
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: data.name.toLowerCase().replace(/\s+/g, ''),
            email: data.email,
            firstName: data.name.split(' ')[0] || data.name,
            lastName: data.name.split(' ').slice(1).join(' ') || '',
            password: data.password,
          }),
        });

        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(responseData.message || 'Registration failed');
        }

        return { ...responseData, formData: data };
      } catch (error) {
        console.error('Registration error:', error);
        throw error;
      }
    },
    onSuccess: async (data) => {
      try {
        // Auto-login the user after successful registration
        const username = data.formData.name.toLowerCase().replace(/\s+/g, '');
        const password = data.formData.password;

        // Call the login function to authenticate the user
        await login(username, password);

        // Set the onboarding flag
        localStorage.setItem('needsOnboarding', 'true');

        toast({
          title: "Welcome to SmartCart!",
          description: "Let's get your account set up",
        });

        // Navigation will be handled by ProtectedRoute after login
      } catch (loginError) {
        console.error('Auto-login failed:', loginError);
        // Fallback to manual login if auto-login fails
        toast({
          title: "Registration successful",
          description: "Please log in with your new account",
        });
        setActiveTab("login");
      }
      registerForm.reset();
    },
    onError: (error: any) => {
      console.error("Registration mutation error:", error);
      toast({
        title: "Registration failed",
        description: error.message || "Please check your information and try again",
        variant: "destructive",
      });
    }
  });

  // Form submission handlers
  const onLoginSubmit = (data: z.infer<typeof loginSchema>) => {
    console.log("Login form submitted with data:", data);
    console.log("Login mutation pending status:", loginMutation.isPending);
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: z.infer<typeof registerSchema>) => {
    registerMutation.mutate(data);
  };

  // Social login handler
  const handleSocialLogin = (provider: string) => {
    // In a real app, you would redirect to the OAuth provider
    toast({
      title: `${provider} login`,
      description: `Redirecting to ${provider} for authentication...`,
    });

    // Simulate successful login after a delay
    setTimeout(() => {
      toast({
        title: "Login successful",
        description: `You've been authenticated with ${provider}`,
      });
      // Navigation will be handled by ProtectedRoute after login
    }, 1500);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <div className="rounded-full bg-primary p-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary-foreground"
              >
                <path d="M5 7h14" />
                <path d="M5 12h14" />
                <path d="M5 17h14" />
                <path d="M4 22V2h16v20H4z" />
              </svg>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">SmartCart</CardTitle>
          <CardDescription>
            Sign in to your account or create a new one
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            {/* Login Form */}
            <TabsContent value="login" className="pt-4">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="johndoe" 
                            type="text"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              placeholder="********" 
                              type={showPassword ? "text" : "password"}
                              {...field} 
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-6 rounded-lg shadow-md transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] border-2 border-primary hover:border-primary/80"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </Form>

              <div className="mt-4 text-center text-sm">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    const email = window.prompt("Enter your email address to reset your password:");
                    if (email && email.trim()) {
                      fetch('/api/auth/forgot-password', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ email: email.trim() }),
                      })
                      .then(response => response.json())
                      .then(data => {
                        toast({
                          title: "Password Reset",
                          description: data.message || "Password reset instructions sent to your email",
                        });
                      })
                      .catch(error => {
                        console.error('Forgot password error:', error);
                        toast({
                          title: "Error",
                          description: "Failed to send reset email. Please try again.",
                          variant: "destructive",
                        });
                      });
                    }
                  }}
                  className="text-primary hover:text-primary/80 hover:underline bg-transparent border border-primary/20 hover:border-primary/40 px-4 py-2 cursor-pointer font-medium transition-all duration-200 rounded-md hover:bg-primary/10 shadow-sm hover:shadow-md"
                >
                  Forgot your password?
                </Button>
              </div>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  type="button"
                  className="gap-2"
                  onClick={() => handleSocialLogin("Google")}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="#EA4335"
                    className="feather feather-google"
                  >
                    <path d="M23.6 12.2735C23.6 11.4635 23.5364 10.6405 23.4 9.8405H12V14.4675H18.4727C18.2364 15.9595 17.3909 17.2325 16.0909 18.0805V21.0915H20.0091C22.2909 19.0045 23.6 15.9275 23.6 12.2735Z" />
                    <path d="M12 24C15.24 24 17.9564 22.9255 20.0091 21.0915L16.0909 18.0805C15.0045 18.8035 13.6091 19.227 12 19.227C8.87455 19.227 6.22909 17.1275 5.28727 14.28H1.23637V17.391C3.24545 21.443 7.30909 24 12 24Z" fill="#34A853" />
                    <path d="M5.28727 14.28C5.04545 13.557 4.90909 12.786 4.90909 12C4.90909 11.214 5.04545 10.443 5.28727 9.72V6.609H1.23637C0.436363 8.247 0 10.0695 0 12C0 13.9305 0.436363 15.753 1.23637 17.391L5.28727 14.28Z" fill="#FBBC05" />
                    <path d="M12 4.77273C13.7618 4.77273 15.3436 5.37818 16.5873 6.56727L20.0291 3.12545C17.9509 1.18909 15.2345 0 12 0C7.30909 0 3.24545 2.55682 1.23637 6.609L5.28727 9.72C6.22909 6.87273 8.87455 4.77273 12 4.77273Z" fill="#EA4335" />
                  </svg>
                  Google
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  className="gap-2"
                  onClick={() => handleSocialLogin("Apple")}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 384 512"
                    fill="currentColor"
                  >
                    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
                  </svg>
                  Apple
                </Button>
              </div>
            </TabsContent>

            {/* Register Form */}
            <TabsContent value="register" className="pt-4">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="you@example.com" 
                            type="email"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              placeholder="********" 
                              type={showPassword ? "text" : "password"}
                              {...field} 
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="********" 
                            type={showPassword ? "text" : "password"}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-6 rounded-lg shadow-md transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] border-2 border-primary hover:border-primary/80"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </Form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  type="button"
                  className="gap-2"
                  onClick={() => handleSocialLogin("Google")}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="#EA4335"
                    className="feather feather-google"
                  >
                    <path d="M23.6 12.2735C23.6 11.4635 23.5364 10.6405 23.4 9.8405H12V14.4675H18.4727C18.2364 15.9595 17.3909 17.2325 16.0909 18.0805V21.0915H20.0091C22.2909 19.0045 23.6 15.9275 23.6 12.2735Z" />
                    <path d="M12 24C15.24 24 17.9564 22.9255 20.0091 21.0915L16.0909 18.0805C15.0045 18.8035 13.6091 19.227 12 19.227C8.87455 19.227 6.22909 17.1275 5.28727 14.28H1.23637V17.391C3.24545 21.443 7.30909 24 12 24Z" fill="#34A853" />
                    <path d="M5.28727 14.28C5.04545 13.557 4.90909 12.786 4.90909 12C4.90909 11.214 5.04545 10.443 5.28727 9.72V6.609H1.23637C0.436363 8.247 0 10.0695 0 12C0 13.9305 0.436363 15.753 1.23637 17.391L5.28727 14.28Z" fill="#FBBC05" />
                    <path d="M12 4.77273C13.7618 4.77273 15.3436 5.37818 16.5873 6.56727L20.0291 3.12545C17.9509 1.18909 15.2345 0 12 0C7.30909 0 3.24545 2.55682 1.23637 6.609L5.28727 9.72C6.22909 6.87273 8.87455 4.77273 12 4.77273Z" fill="#EA4335" />
                  </svg>
                  Google
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  className="gap-2"
                  onClick={() => handleSocialLogin("Apple")}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 384 512"
                    fill="currentColor"
                  >
                    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
                  </svg>
                  Apple
                </Button>
              </div>

              <div className="mt-4 text-center text-sm">
                <p className="text-muted-foreground">
                  By creating an account, you agree to our{" "}
                  <a href="#" className="text-primary hover:underline">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="#" className="text-primary hover:underline">
                    Privacy Policy
                  </a>
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            {activeTab === "login" ? (
              <>
                Don't have an account?{" "}
                <Button variant="link" className="p-0" onClick={() => setActiveTab("register")}>
                  Sign up
                </Button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Button variant="link" className="p-0" onClick={() => setActiveTab("login")}>
                  Sign in
                </Button>
              </>
            )}
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AuthPage;