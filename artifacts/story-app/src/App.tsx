import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
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
import NotFound from "@/pages/not-found";

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
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
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
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/create" />
      </Show>
      <Show when="signed-out">
        <Layout>
          <Landing />
        </Layout>
      </Show>
    </>
  );
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
        signIn: { start: { title: "Welcome back to StoryBloom", subtitle: "Sign in to your account" } },
        signUp: { start: { title: "Start your StoryBloom journey", subtitle: "Create your free account" } },
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
            <Route path="/stories/:id" component={() => <ProtectedRoute component={StoryViewer} />} />
            <Route path="/subscribe" component={() => <ProtectedRoute component={Subscribe} />} />
            <Route path="/account" component={() => <ProtectedRoute component={Account} />} />
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

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
