import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from '@/react-app/components/Layout';
import { ErrorBoundary } from '@/react-app/components/ErrorBoundary';
import { useAuthStore } from '@/react-app/stores/useAuthStore';
import { useSystemStore } from '@/react-app/stores/useSystemStore';

// Lazy load pages for code splitting
const HomePage = lazy(() => import('@/react-app/pages/Home'));
const LoginPage = lazy(() => import('@/react-app/pages/Login'));
const DashboardPage = lazy(() => import('@/react-app/pages/Dashboard'));
const QRCodePage = lazy(() => import('@/react-app/pages/QRCode'));
const ContactsPage = lazy(() => import('@/react-app/pages/Contacts'));
const TemplatesPage = lazy(() => import('@/react-app/pages/Templates'));
const TriggersPage = lazy(() => import('@/react-app/pages/Triggers'));
const FlowsPage = lazy(() => import('@/react-app/pages/Flows'));
const MessagesPage = lazy(() => import('@/react-app/pages/Messages'));
const SettingsPage = lazy(() => import('@/react-app/pages/Settings'));
const DebugPage = lazy(() => import('@/react-app/pages/Debug'));

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response?: { status?: number } };
          if (axiosError.response?.status && axiosError.response.status >= 400 && axiosError.response.status < 500) {
            return false;
          }
        }
        // Retry up to 3 times for network/server errors with exponential backoff
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff: 1s, 2s, 4s, max 30s
      staleTime: 5 * 60 * 1000, // 5 minutes default
    },
    mutations: {
      retry: (failureCount, error) => {
        // Don't retry mutations on 4xx errors
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response?: { status?: number } };
          if (axiosError.response?.status && axiosError.response.status >= 400 && axiosError.response.status < 500) {
            return false;
          }
        }
        // Retry once for network/server errors
        return failureCount < 1;
      },
      retryDelay: 1000,
    },
  },
});

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-gradient">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto" />
        <p className="mt-4 text-brand-muted">Carregando...</p>
      </div>
    </div>
  );
}

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// App Content Component (handles auth check and WebSocket)
function AppContent() {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const subscribeToWebSocket = useSystemStore((state) => state.subscribeToWebSocket);
  const unsubscribeFromWebSocket = useSystemStore((state) => state.unsubscribeFromWebSocket);

  useEffect(() => {
    // Check authentication on mount
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    // Subscribe to WebSocket events when authenticated
    if (isAuthenticated) {
      subscribeToWebSocket();
    }

    return () => {
      unsubscribeFromWebSocket();
    };
  }, [isAuthenticated, subscribeToWebSocket, unsubscribeFromWebSocket]);

  return (
    <Router>
      <ErrorBoundary level="critical">
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ErrorBoundary level="page">
                      <DashboardPage />
                    </ErrorBoundary>
                  </Layout>
                </ProtectedRoute>
              }
            />
          <Route
            path="/qr"
            element={
              <ProtectedRoute>
                <Layout>
                  <ErrorBoundary level="page">
                    <QRCodePage />
                  </ErrorBoundary>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/contacts"
            element={
              <ProtectedRoute>
                <Layout>
                  <ErrorBoundary level="page">
                    <ContactsPage />
                  </ErrorBoundary>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/templates"
            element={
              <ProtectedRoute>
                <Layout>
                  <ErrorBoundary level="page">
                    <TemplatesPage />
                  </ErrorBoundary>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/triggers"
            element={
              <ProtectedRoute>
                <Layout>
                  <ErrorBoundary level="page">
                    <TriggersPage />
                  </ErrorBoundary>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/flows"
            element={
              <ProtectedRoute>
                <Layout>
                  <ErrorBoundary level="page">
                    <FlowsPage />
                  </ErrorBoundary>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <Layout>
                  <ErrorBoundary level="page">
                    <MessagesPage />
                  </ErrorBoundary>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <ErrorBoundary level="page">
                    <SettingsPage />
                  </ErrorBoundary>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/debug"
            element={
              <ProtectedRoute>
                <Layout>
                  <ErrorBoundary level="page">
                    <DebugPage />
                  </ErrorBoundary>
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
    </Router>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
