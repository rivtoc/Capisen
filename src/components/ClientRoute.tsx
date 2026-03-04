import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const ClientRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, userType, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return <Navigate to="/portail" replace />;
  if (userType === "member") return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};

export default ClientRoute;
