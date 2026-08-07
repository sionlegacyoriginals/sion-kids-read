/**
 * /delete-account — public page required by Google Play Store.
 * Works for both signed-in and signed-out visitors.
 */
import { useAuth } from "@clerk/react";
import { Link } from "wouter";
import { Trash2, ShieldCheck, ArrowRight, Mail } from "lucide-react";
import { useReviewerAuth } from "@/lib/reviewerAuth";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function DeleteAccount() {
  const { isSignedIn } = useAuth();
  const { isReviewer } = useReviewerAuth();
  const loggedIn = isSignedIn || isReviewer;

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Simple top bar */}
      <header className="border-b border-border/50 px-4 py-4">
        <Link href="/" className="text-primary font-serif font-bold text-xl">
          Sion Kids Read
        </Link>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-16 space-y-8">
        {/* Hero */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">
              Delete Your Account
            </h1>
            <p className="text-muted-foreground mt-1">
              You can permanently delete your Sion Kids Read account and all
              associated data at any time.
            </p>
          </div>
        </div>

        {/* What gets deleted */}
        <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-4">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            What will be permanently deleted
          </h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {[
              "Your account and login credentials",
              "All stories you have created",
              "Your subscription (no further charges)",
              "Classroom and student data you set up",
              "Homeschool Hub children and family data",
              "Any uploaded photos or reference images",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground border-t border-border/40 pt-4">
            Print order history may be retained for legal / financial record-keeping
            purposes in anonymised form.
          </p>
        </div>

        {/* CTA */}
        {loggedIn ? (
          <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-3">
            <p className="font-semibold text-foreground">Ready to proceed?</p>
            <p className="text-sm text-muted-foreground">
              You can delete your account from your Account settings page. Scroll
              to the bottom and click <strong>"Delete my account"</strong>.
            </p>
            <Link href="/account">
              <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-all text-sm">
                Go to Account settings <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        ) : (
          <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-3">
            <p className="font-semibold text-foreground">How to delete your account</p>
            <ol className="space-y-2 text-sm text-muted-foreground list-none">
              {[
                "Sign in to your Sion Kids Read account",
                'Go to Account settings (tap your name in the top right)',
                'Scroll to "Danger Zone" at the bottom',
                'Click "Delete my account" and confirm',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <Link href="/sign-in">
              <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-all text-sm mt-2">
                Sign in <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        )}

        {/* Contact option */}
        <div className="flex items-start gap-3 p-4 bg-muted/40 rounded-xl text-sm text-muted-foreground">
          <Mail className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
          <p>
            Need help or want to request deletion by email?{" "}
            <a
              href="mailto:support@sionkidsread.com"
              className="text-primary font-semibold hover:underline"
            >
              Contact us at support@sionkidsread.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
