import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { abandonDemo, demoRole } from './demo/session'

const render = () => createRoot(document.getElementById("root")!).render(<App />);

// The live demo swaps in an in-memory backend before anything renders
const role = demoRole();
if (role) {
  import('./demo/install')
    .then(({ installDemo }) => installDemo(role))
    .catch(abandonDemo)
    .finally(render);
} else {
  render();
}
