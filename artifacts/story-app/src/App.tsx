import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useAuth } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, Redirect, useLocation, Router as WouterRouter } from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/queryClient";
import { Layout } from "@/components/layout";

import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Library from "@/pages/library";
import StoryViewer from "@/pages/story-viewer";
import Subscribe from "@/pages/subscribe";
import Account from "@/pages/account";
import CheckoutSuccess from "@/pages/checkout-success";
import StoryShare from "@/pages/story-share";
import GiftCardSuccess from "@/pages/gift-card-success";
import GiftCardRedeem from "@/pages/gift-card-redeem";
import GiftCards from "@/pages/gift-cards";
import NotFound from "@/pages/not-found";
import StudentLogin from "@/pages/student-login";
import ClassroomHome from "@/pages/classroom-home";
import ClassroomSetup from "@/pages/classroom-setup";
import { StudentAuthProvider } from "@/lib/studentAuth";

// ── Clerk config ──────────────────────────────────────────────────────────────
// REQUIRED — copy verbatim. Resolves key from hostname for custom-domain support.
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// REQUIRED — empty in dev (intentional), auto-set in prod. Do NOT gate on NODE_ENV.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#f5a224",
    colorForeground: "#1c2a3a",
    colorMutedForeground: "#526070",
    colorDanger: "#dc2626",
    colorBackground: "#fdfbf7",
    colorInput: "#e8e1d4",
    colorInputForeground: "#1c2a3a",
    colorNeutral: "#e8e1d4",
    fontFamily: "Nunito, sans-serif",
    borderRadius: "1rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-lg",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "font-serif text-[#1c2a3a]",
    headerSubtitle: "text-[#526070]",
    socialButtonsBlockButtonText: "text-[#1c2a3a] font-semibold",
    formFieldLabel: "text-[#1c2a3a] font-semibold text-sm",
    footerActionLink: "text-[#f5a224] font-bold hover:text-[#d4880f]",
    footerActionText: "text-[#526070]",
    dividerText: "text-[#526070]",
    identityPreviewEditButton: "text-[#f5a224]",
    formFieldSuccessText: "text-green-600",
    alertText: "text-[#1c2a3a]",
    logoBox: "flex justify-center",
    logoImage: "h-10 w-auto",
    socialButtonsBlockButton: "border border-[#e8e1d4] hover:bg-[#fdfbf7]",
    formButtonPrimary: "bg-[#f5a224] hover:bg-[#d4880f] text-white font-bold",
    formFieldInput: "bg-[#fdfbf7] border-[#e8e1d4] text-[#1c2a3a]",
    footerAction: "bg-[#fdfbf7]",
    dividerLine: "bg-[#e8e1d4]",
    alert: "bg-[#fff8ee]",
    otpCodeFieldInput: "border-[#e8e1d4]",
    formFieldRow: "",
    main: "",
  },
};

// ── Pages ─────────────────────────────────────────────────────────────────────
function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 gap-6">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
      <a
        href={`${basePath}/student-login`}
        className="flex items-center gap-2 px-6 py-3 rounded-full bg-muted hover:bg-muted/80 text-foreground font-semibold text-sm transition-colors"
      >
        🏫 Student? Log in with your class code
      </a>
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}

/** Public home: Landing for logged-out users, redirect to /create for logged-in. */
function HomeRedirect() {
  const { isLoaded, isSignedIn } = useAuth();

  // While Clerk is still initialising, render the landing page (unauthenticated view).
  // Once loaded, signed-in users are silently redirected to /create.
  if (!isLoaded || !isSignedIn) {
    return (
      <Layout>
        <Landing />
      </Layout>
    );
  }

  return <Redirect to="/create" />;
}

function ProtectedRoute({ component: Page }: { component: React.ComponentType }) {
  return (
    <>
      <Show when="signed-in">
        <Layout>
          <Page />
        </Layout>
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

// ── Cache invalidation when user changes ──────────────────────────────────────
function ClerkQueryCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    return addListener(({ user }) => {
      const id = user?.id ?? null;
      if (prevId.current !== undefined && prevId.current !== id) qc.clear();
      prevId.current = id;
    });
  }, [addListener, qc]);

  return null;
}

// ── Router ────────────────────────────────────────────────────────────────────
function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      afterSignInUrl={`${basePath}/create`}
      afterSignUpUrl={`${basePath}/create`}
      localization={{
        signIn: { start: { title: "Welcome back to Sion Legacy Originals", subtitle: "Sign in to your account" } },
        signUp: { start: { title: "Start your Sion Legacy Originals journey", subtitle: "Create your free account" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            {/* REQUIRED — /*? is the only wouter syntax matching Clerk OAuth sub-paths */}
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/create" component={() => <ProtectedRoute component={Home} />} />
            <Route path="/stories" component={() => <ProtectedRoute component={Library} />} />
            <Route path="/share/:id" component={StoryShare} />
            <Route
              path="/gift-card/success"
              component={() => (
                <Layout>
                  <GiftCardSuccess />
                </Layout>
              )}
            />
            <Route path="/gift-card/redeem" component={() => <ProtectedRoute component={GiftCardRedeem} />} />
            <Route path="/gift-cards" component={() => <ProtectedRoute component={GiftCards} />} />
            <Route path="/stories/:id" component={() => <ProtectedRoute component={StoryViewer} />} />
            <Route path="/subscribe" component={() => <ProtectedRoute component={Subscribe} />} />
            <Route path="/account" component={() => <ProtectedRoute component={Account} />} />
            <Route path="/student-login" component={StudentLogin} />
            <Route path="/classroom" component={ClassroomHome} />
            <Route path="/classroom-setup" component={() => <ProtectedRoute component={ClassroomSetup} />} />
            <Route
              path="/checkout/success"
              component={() => (
                <Layout>
                  <CheckoutSuccess />
                </Layout>
              )}
            />
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

/** Matches /share/:id without Clerk — truly public, no auth required. */
function ShareRoute() {
  const path = window.location.pathname.replace(basePath, "") || "/";
  const match = path.match(/^\/share\/(\d+)/);
  if (!match) return null;
  return <StoryShare />;
}

function App() {
  const path = window.location.pathname.replace(basePath, "") || "/";
  const isShareRoute = /^\/share\/\d+/.test(path);

  if (isShareRoute) {
    // Render the share page completely outside Clerk so no auth gate can fire.
    return (
      <WouterRouter base={basePath}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <ShareRoute />
          </TooltipProvider>
        </QueryClientProvider>
      </WouterRouter>
    );
  }

  return (
    <WouterRouter base={basePath}>
      <StudentAuthProvider>
        <ClerkProviderWithRoutes />
      </StudentAuthProvider>
    </WouterRouter>
  );
}

export default App;
