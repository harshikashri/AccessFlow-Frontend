import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from '@/app/App';
import { APP_ROUTES } from '@/routes/route.constants';

const appRouter = createBrowserRouter([
  {
    path: APP_ROUTES.root,
    element: <App />,
  },
]);

export function AppRouter() {
  return <RouterProvider router={appRouter} />;
}
