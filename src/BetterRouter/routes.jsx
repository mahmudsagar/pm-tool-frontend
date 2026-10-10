import { lazy } from "react";
import AppShell from "@/layouts/shell/AppShell";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import LazyPage from "./LazyPage";
import RouteError from "./RouteError";
import NotFound from "./NotFound";

// Each page is its own chunk so heavy editors (Lexical, Univer, Excalidraw)
// only download when a page that needs them is opened.
const HubPage = lazy(() => import("@/pages/hub/HubPage"));
const Data = lazy(() => import("@/pages/Data"));
const Chat = lazy(() => import("@/pages/Chat"));
const UsersPage = lazy(() => import("@/pages/users"));
const Notifications = lazy(() => import("@/pages/inbox/InboxPage"));
const ContainerPage = lazy(() => import("@/pages/hub/ContainerPage"));
const RecentPage = lazy(() => import("@/pages/library/RecentPage"));
const StarredPage = lazy(() => import("@/pages/library/StarredPage"));
const TrashPage = lazy(() => import("@/pages/library/TrashPage"));
const Page = lazy(() => import("@/pages"));
const CommentPage = lazy(() => import("@/pages/CommentPage"));
const Settings = lazy(() => import("@/layouts/Settings"));
const ProfileSettings = lazy(() => import("@/pages/settings/Profile"));
const WorkspaceSettings = lazy(() => import("@/pages/settings/Workspace"));
const MembersSettings = lazy(() => import("@/pages/settings/Members"));
const TeamsSettings = lazy(() => import("@/pages/settings/Teams"));
const CreateTeam = lazy(() => import("@/pages/teams/Create"));
const TeamDetails = lazy(() => import("@/pages/teams/TeamDetails"));
const LoginForm = lazy(() => import("@/components/auth/LoginForm").then((m) => ({ default: m.LoginForm })));
const OAuthCallback = lazy(() => import("@/pages/OAuthCallback"));

const page = (element, { fullscreen = false } = {}) => (
  <LazyPage component={element.type} fullscreen={fullscreen} {...element.props} />
);

const protectedPage = (element) => <ProtectedRoute>{page(element, { fullscreen: true })}</ProtectedRoute>;

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
          { path: '/board/:id', element: page(<Data />) },
          { path: '/scrum/:id', element: page(<Data mode="scrum" />) },
          { path: '/chat', element: page(<Chat />) },
          { path: '/users', element: page(<UsersPage />) },
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
              { path: '/settings/members', element: page(<MembersSettings />) },
              { path: '/settings/teams', element: page(<TeamsSettings />) },
            ],
          },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
  { path: '/login', element: page(<LoginForm />, { fullscreen: true }), errorElement: <RouteError /> },
  { path: '/oauth/callback', element: page(<OAuthCallback />, { fullscreen: true }), errorElement: <RouteError /> },
  { path: '/teams/create', element: protectedPage(<CreateTeam />), errorElement: <RouteError /> },
  { path: '/users/:id', element: protectedPage(<TeamDetails />), errorElement: <RouteError /> },
  { path: '/users/edit/:id', element: protectedPage(<CreateTeam />), errorElement: <RouteError /> },
];
