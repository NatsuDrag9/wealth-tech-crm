import type { ReactElement } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { RoutesWithGuard } from '@/components/generics';
import { APP_ROUTES } from '@/config/routes';

export function App(): ReactElement {
  return (
    <BrowserRouter>
      <RoutesWithGuard routes={APP_ROUTES} />
    </BrowserRouter>
  );
}

export default App;
