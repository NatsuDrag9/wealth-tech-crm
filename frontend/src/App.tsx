import type { ReactElement } from 'react';
import { RoutesWithGuard } from '@/components/generics';
import { APP_ROUTES } from '@/config/routes';

export function App(): ReactElement {
  return <RoutesWithGuard routes={APP_ROUTES} />;
}

export default App;
