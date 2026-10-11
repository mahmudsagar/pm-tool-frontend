import { lazy } from "react";
import { Navigate } from "react-router-dom";
import AppShell from "@/layouts/shell/AppShell";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import LazyPage from "./LazyPage";
import RouteError from "./RouteError";
import NotFound from "./NotFound";

// Each page is its own chunk so heavy editors (Lexical, Univer, Excalidraw)
// only download when a page that needs them is opened.
const HubPage = lazy(() => import("@/pages/hub/HubPage"));
const Data = lazy(() => import("@/pages/Data"));
const BoardPage = lazy(() => import("@/pages/board/BoardPage"));
const ScrumPage = lazy(() => import("@/pages/scrum/ScrumPage"));
const Chat = lazy(() => import("@/pages/chat/ChatPage"));
const Notifications = lazy(() => import("@/pages/inbox/InboxPage"));
const ContainerPage = lazy(() => import("@/pages/hub/ContainerPage"));
const RecentPage = lazy(() => import("@/pages/library/RecentPage"));
const StarredPage = lazy(() => import("@/pages/library/StarredPage"));
const TrashPage = lazy(() => import("@/pages/library/TrashPage"));
const Page = lazy(() => import("@/pages"));
const CommentPage = lazy(() => import("@/pages/CommentPage"));
const Settings = lazy(() => import("@/pages/settings/SettingsLayout"));
const ProfileSettings = lazy(() => import("@/pages/settings/ProfilePage"));
const WorkspaceSettings = lazy(() => import("@/pages/settings/WorkspacePage"));
const SpacesSettings = lazy(() => import("@/pages/settings/SpacesPage"));
const MembersSettings = lazy(() => import("@/pages/settings/MembersPage"));
const TeamsSettings = lazy(() => import("@/pages/settings/TeamsPage"));
const AuditSettings = lazy(() => import("@/pages/settings/AuditPage"));
const InvitePage = lazy(() => import("@/pages/InvitePage"));
const LoginForm = lazy(() => import("@/components/auth/LoginForm").then((m) => ({ default: m.LoginForm })));
const OAuthCallback = lazy(() => import("@/pages/OAuthCallback"));

const page = (element, { fullscreen = false } = {}) => (
  <LazyPage component={element.type} fullscreen={fullscreen} {...element.props} />
);


export const routes = [
  {
    path: '/',
    element: <ProtectedRoute><AppShell /></ProtectedRoute>,
    errorElement: <RouteError />,
    children: [
      {
        errorElement: <RouteError />,
        children: [
          { path: '/', element: page(<HubPage />) },
          { path: '/recent', element: page(<RecentPage />) },
          { path: '/starred', element: page(<StarredPage />) },
          { path: '/trash', element: page(<TrashPage />) },
          { path: '/data', element: page(<Data />) },
          { path: '/board/:id', element: page(<BoardPage />) },
          { path: '/scrum/:id', element: page(<ScrumPage />) },
          { path: '/scrum/:id/classic', element: page(<Data mode="scrum" />) },
          { path: '/chat', element: page(<Chat />) },
          { path: '/users', element: <Navigate to="/settings/members" replace /> },
          { path: '/users/:id', element: <Navigate to="/settings/teams" replace /> },
          { path: '/users/edit/:id', element: <Navigate to="/settings/teams" replace /> },
          { path: '/teams/create', element: <Navigate to="/settings/teams" replace /> },
          { path: '/notifications', element: page(<Notifications />) },
          { path: '/file-manager/:type/:id', element: page(<ContainerPage />) },
          { path: '/folder/:id', element: page(<ContainerPage />) },
          { path: '/group/:id', element: page(<ContainerPage />) },
          { path: '/space/:id', element: page(<ContainerPage />) },
          { path: '/document/:id', element: page(<Page />) },
          { path: '/single/:id', element: page(<Page />) },
          { path: '/sheet/:id', element: page(<Page />) },
          { path: '/whiteboard/:id', element: page(<Page />) },
          { path: '/comment/:id', element: page(<CommentPage />) },
          {
            path: '/settings',
            element: page(<Settings />),
            children: [
              { path: '/settings/', element: page(<ProfileSettings />) },
              { path: '/settings/workspace', element: page(<WorkspaceSettings />) },
              { path: '/settings/spaces', element: page(<SpacesSettings />) },
              { path: '/settings/members', element: page(<MembersSettings />) },
              { path: '/settings/teams', element: page(<TeamsSettings />) },
              { path: '/settings/security', element: page(<AuditSettings />) },
            ],
          },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
  { path: '/login', element: page(<LoginForm />, { fullscreen: true }), errorElement: <RouteError /> },
  { path: '/invite/:token', element: page(<InvitePage />, { fullscreen: true }), errorElement: <RouteError /> },
  { path: '/oauth/callback', element: page(<OAuthCallback />, { fullscreen: true }), errorElement: <RouteError /> },
];
