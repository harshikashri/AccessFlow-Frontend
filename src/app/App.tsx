import { Link } from 'react-router-dom';
import { appConfig } from '@/config/app.config';

export function App() {
  return (
    <main className="app-shell">
      <section className="welcome-panel" aria-labelledby="app-title">
        <div className="brand-lockup" aria-label={appConfig.name}>
          <span className="brand-mark" aria-hidden="true">
            A
          </span>
          <span>{appConfig.name}</span>
        </div>
        <p className="eyebrow">Enterprise access platform</p>
        <h1 id="app-title">{appConfig.name}</h1>
        <p className="welcome-copy">
          A consistent foundation for secure access and workflow experiences.
        </p>
        {import.meta.env.DEV && (
          <Link className="showcase-link" to="/ui-showcase">
            Open the UI foundation preview
          </Link>
        )}
      </section>
    </main>
  );
}

export default App;
