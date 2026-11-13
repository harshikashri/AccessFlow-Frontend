import { appConfig } from '@/config/app.config';

export function App() {
  return (
    <main className="app-shell">
      <section className="welcome-panel" aria-labelledby="app-title">
        <p className="eyebrow">Frontend foundation</p>
        <h1 id="app-title">{appConfig.name}</h1>
        <p className="welcome-copy">
          The application structure is ready for feature-by-feature development.
        </p>
      </section>
    </main>
  );
}

export default App;
