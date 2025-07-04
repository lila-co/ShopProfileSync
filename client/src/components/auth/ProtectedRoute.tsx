import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../../contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    console.log("ProtectedRoute effect triggered:", {
      user: !!user,
      isLoading,
      location,
    });

    if (!isLoading && !user) {
      console.log("No user, redirecting to auth");
      navigate("/auth");
      return;
    }

    if (user && !isLoading) {
      // Skip onboarding checks for admin routes - let admin pages handle their own access control
      const isAdminRoute =
        location.startsWith("/admin") || location.startsWith("/internal");

      if (!isAdminRoute) {
        // Check if user needs onboarding
        const needsOnboarding = localStorage.getItem("needsOnboarding");
        console.log("User authenticated, checking onboarding:", {
          needsOnboarding,
          location,
        });

        if (needsOnboarding === "true" && location !== "/onboarding") {
          console.log("User needs onboarding, redirecting to /onboarding");
          navigate("/onboarding");
          return;
        }

        // If user is on onboarding page but doesn't need it, redirect to dashboard
        if (location === "/onboarding" && needsOnboarding !== "true") {
          console.log(
            "User on onboarding but doesnt need it, redirecting to dashboard",
          );
          navigate("/dashboard");
          return;
        }
      }
    }
  }, [user, isLoading, navigate, location]);

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
