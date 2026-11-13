/**
 * Root React component.
 * TEMPORARY: a placeholder that only proves React renders inside Electron.
 * It will be replaced by the editor layout in a later step.
 */
import './App.css';

export function App() {
  return (
    <main className="integration-check">
      <h1 className="integration-check__title">VoxelRoom</h1>
      <p className="integration-check__status">React renderer is working.</p>
    </main>
  );
}
