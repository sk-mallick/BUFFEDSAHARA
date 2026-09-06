import { Suspense, lazy, useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LangProvider } from "./lib/i18n";
import { AuthProvider } from "./lib/auth";
import Guard from "./components/auth/Guards";
import NavBar from "./sections/NavBar";
import Footer from "./sections/Footer";
import Home from "./pages/Home";
import PageSkeleton from "./ui/PageSkeleton";
import ChatbotButton from "./components/chat/ChatbotButton";
import ChatWindow from "./components/chat/ChatWindow";
import { useChat } from "./hooks/useChat";

const HowItWorksPage = lazy(() => import("./pages/HowItWorksPage"));
const ForVictimsPage = lazy(() => import("./pages/ForVictimsPage"));
const ForOfficialsPage = lazy(() => import("./pages/ForOfficialsPage"));
const ResourcesPage = lazy(() => import("./pages/ResourcesPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const UnauthorizedPage = lazy(() => import("./pages/UnauthorizedPage"));
const CaseworkerPage = lazy(() => import("./pages/CaseworkerPage"));
const BeneficiaryPage = lazy(() => import("./pages/BeneficiaryPage"));
const TalkPage = lazy(() => import("./pages/TalkPage"));

// Roles allowed on each protected route. These are navigation guards only —
// the backend independently enforces the same boundaries from the token.
const ADMIN_ROLES = ["national_admin", "state_admin", "district_officer"];
const STAFF_ROLES = ["national_admin", "state_admin", "district_officer", "caseworker"];

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname, hash]);
  return null;
}

function ChatHost() {
  // One stable demo user per browser, so chat history stays coherent
  // across page loads until real authentication exists.
  const [userId] = useState(() => {
    try {
      let id = localStorage.getItem("sahara_user_id");
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem("sahara_user_id", id);
      }
      return id;
    } catch {
      return "demo-guest";
    }
  });
  const [open, setOpen] = useState(false);
  const chat = useChat(userId);

  return (
    <>
      <AnimatePresence>
        {open ? (
          <ChatWindow
            key="chat-window"
            {...chat}
            onClose={() => setOpen(false)}
          />
        ) : (
          <ChatbotButton key="chat-button" onOpen={() => setOpen(true)} />
        )}
      </AnimatePresence>
    </>
  );
}

function PublicLayout() {
  const location = useLocation();
  const reduce = useReducedMotion();

  return (
    <>
      <ChatHost />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-small focus:font-medium focus:text-ink-900 focus:shadow-3"
      >
        Skip to main content
      </a>
      <NavBar />
      {/* Route transition: a ~300ms calm fade — no bounce, no slide-churn. */}
      <AnimatePresence mode="wait">
        <motion.main
          id="main"
          tabIndex={-1}
          key={location.pathname}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.45, 0, 0.25, 1] }}
          className="outline-none"
        >
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </motion.main>
      </AnimatePresence>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <LangProvider>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ScrollToTop />
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/for-victims" element={<ForVictimsPage />} />
              <Route path="/for-officials" element={<ForOfficialsPage />} />
              <Route path="/resources" element={<ResourcesPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              {/* Auth surface */}
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/command"
                element={
                  <Guard roles={ADMIN_ROLES}>
                    <AdminDashboardPage />
                  </Guard>
                }
              />
              <Route
                path="/caseworker"
                element={
                  <Guard roles={STAFF_ROLES}>
                    <CaseworkerPage />
                  </Guard>
                }
              />
              <Route
                path="/beneficiary"
                element={
                  <Guard roles={["beneficiary"]}>
                    <BeneficiaryPage />
                  </Guard>
                }
              />
              <Route
                path="/talk"
                element={
                  <Guard roles={["beneficiary"]}>
                    <TalkPage />
                  </Guard>
                }
              />
              <Route
                path="/unauthorized"
                element={
                  <Guard>
                    <UnauthorizedPage />
                  </Guard>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LangProvider>
  );
}