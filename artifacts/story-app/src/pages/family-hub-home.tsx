/**
 * Family Hub home — the child-facing reading hub.
 *
 * On every mount this page verifies (server-side) that:
 *  1. The student JWT belongs to a Family Hub class, and
 *  2. The owning parent still has an active entitlement.
 *
 * If either check fails the child is signed out and redirected to the
 * Family Hub login page so they cannot continue accessing paid content.
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import ClassroomHome from "@/pages/classroom-home";
import { useStudentAuth } from "@/lib/studentAuth";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function FamilyHubHome() {
  const [, navigate] = useLocation();
  const { student, signOutStudent } = useStudentAuth();
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!student?.token) {
      navigate("/family-hub/login");
      return;
    }

    fetch(`${basePath}/api/family-hub/verify-child`, {
      headers: { Authorization: `Bearer ${student.token}` },
    })
      .then(async (r) => {
        if (!r.ok) {
          // Entitlement lapsed or wrong session type — sign out and redirect
          signOutStudent();
          navigate("/family-hub/login");
        } else {
          setVerified(true);
        }
      })
      .catch(() => {
        // Network / server error — fail closed. Sign out and redirect so
        // a cached student session cannot render paid content offline.
        signOutStudent();
        navigate("/family-hub/login");
      })
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!verified) return null;

  return <ClassroomHome mode="family" />;
}
