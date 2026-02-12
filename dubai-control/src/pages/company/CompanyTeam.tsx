// dubai-control/src/pages/company/CompanyTeam.tsx

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Plus, Mail, Phone, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useUserRole, canAccessBilling } from "@/hooks/useUserRole";

interface TeamMember {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: "active" | "inactive";
}

export default function CompanyTeam() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const user = useUserRole();
  const canAccess = canAccessBilling(user.role); // Owner/Manager only

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Mock data
  const [teamMembers] = useState<TeamMember[]>([
    {
      id: 1,
      name: "Ahmed Hassan",
      email: "ahmed@cleanproof.example",
      phone: "+971 50 123 4567",
      role: "Cleaner",
      status: "active",
    },
    {
      id: 2,
      name: "Fatima Ali",
      email: "fatima@cleanproof.example",
      phone: "+971 55 987 6543",
      role: "Cleaner",
      status: "active",
    },
    {
      id: 3,
      name: "Mohammed Khan",
      email: "mohammed@cleanproof.example",
      phone: "+971 50 555 1234",
      role: "Cleaner",
      status: "inactive",
    },
  ]);

  // Redirect non-authorized users
  useEffect(() => {
    if (!canAccess) {
      toast({
        variant: "destructive",
        title: "Access restricted",
        description: "Team management is restricted to administrators",
      });
      navigate("/settings", { replace: true });
    }
  }, [canAccess, navigate, toast]);

  const handleAddMember = () => {
    toast({
      title: "Coming soon",
      description: "Team member management is being integrated with the backend",
    });
    setShowAddModal(false);
  };

  if (!canAccess) {
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl p-8">
      {/* Back Link - Mobile Only */}
      <Link
        to="/company/profile"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground md:hidden"
      >
        <ArrowLeft className="h-4 w-4" />
        Company
      </Link>

      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Team & Cleaners
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your team members and cleaner staff
            </p>
          </div>
        </div>

        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add member
        </Button>
      </div>

      {/* Team Members List */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Team Members</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {teamMembers.length} {teamMembers.length === 1 ? "member" : "members"}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {teamMembers.map((member) => (
                <tr key={member.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div className="font-medium text-foreground">{member.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        {member.email}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        {member.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {member.status === "active" ? (
                      <div className="flex items-center gap-2 text-sm font-medium text-status-completed">
                        <CheckCircle2 className="h-4 w-4" />
                        Active
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm font-medium text-status-flagged">
                        <XCircle className="h-4 w-4" />
                        Inactive
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <p className="font-medium">💡 Team management</p>
        <p className="mt-1">
          This is a preview of your team. Full team member management (add, edit, deactivate)
          will be available once backend integration is complete.
        </p>
      </div>

      {/* Add Modal (Coming Soon) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-foreground">Add Team Member</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Team member management is being integrated with the backend.
            </p>

            <div className="mt-6 flex gap-3">
              <Button onClick={handleAddMember} className="flex-1">
                Got it
              </Button>
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
