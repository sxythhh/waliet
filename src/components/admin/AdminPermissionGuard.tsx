import { ReactNode } from "react";
import { ShieldX, ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAdminPermissions, type AdminResource, type AdminAction } from "@/hooks/useAdminPermissions";

interface AdminPermissionGuardProps {
  resource: AdminResource;
  action?: AdminAction;
  children: ReactNode;
}

function AccessDenied() {
  const navigate = useNavigate();

  return (
    <div className="w-full h-full p-4 md:p-6 pt-16 md:pt-6">
      <div className="max-w-lg mx-auto flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500/20 to-rose-500/20 flex items-center justify-center mb-6">
          <ShieldX className="h-10 w-10 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold font-inter tracking-[-0.5px] text-white mb-2">
          Access Denied
        </h1>
        <p className="text-sm text-white/40 font-inter tracking-[-0.5px] mb-8 max-w-sm">
          You don't have permission to view this page. Contact your administrator if you believe this is an error.
        </p>
        <Button
          variant="outline"
          onClick={() => navigate("/admin")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Overview
        </Button>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="w-full h-full flex items-center justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export function AdminPermissionGuard({
  resource,
  action = "view",
  children,
}: AdminPermissionGuardProps) {
  const { hasPermission, loading } = useAdminPermissions();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!hasPermission(resource, action)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
