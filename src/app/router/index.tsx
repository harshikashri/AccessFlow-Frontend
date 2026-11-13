import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import App from '@/app/App';
import { APP_ROUTES } from '@/routes/route.constants';

const routes: RouteObject[] = [
  {
    path: APP_ROUTES.root,
    element: <App />,
  },
];

if (import.meta.env.DEV) {
  const ComponentShowcasePage = lazy(() =>
    import('@/app/pages/ComponentShowcasePage').then((module) => ({
      default: module.ComponentShowcasePage,
    })),
  );
  routes.push({
    path: '/ui-showcase',
    element: (
      <Suspense fallback={null}>
        <ComponentShowcasePage />
      </Suspense>
    ),
  });
}

const appRouter = createBrowserRouter(routes);

export function AppRouter() {
  return <RouterProvider router={appRouter} />;
}
