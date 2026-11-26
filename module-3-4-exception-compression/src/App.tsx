import { useState } from 'react';
import ModuleSelector from './components/ModuleSelector';
import ModuleCanvas from './components/ModuleCanvas';
import { lazy, Suspense } from 'react';

const Module1 = lazy(() => import('./components/module1/Module1'));
const Module2 = lazy(() => import('./components/module2/Module2'));
const Module5 = lazy(() => import('./components/module5/Module5'));
const Module6 = lazy(() => import('./components/module6/Module6'));
const Module7 = lazy(() => import('./components/module7/Module7'));
const Module8 = lazy(() => import('./components/module8/Module8'));

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e2e6e9' }}>
      <div className="text-sm" style={{ color: '#7d8590' }}>Loading module...</div>
    </div>
  );
}

export default function App() {
  const [activeModule, setActiveModule] = useState<string | null>(null);

  const goBack = () => setActiveModule(null);

  if (!activeModule) {
    return <ModuleSelector onSelect={setActiveModule} />;
  }

  return (
    <Suspense fallback={<Loading />}>
      {activeModule === 'module34' && <ModuleCanvas onBack={goBack} />}
      {activeModule === 'module1' && <Module1 onBack={goBack} />}
      {activeModule === 'module2' && <Module2 onBack={goBack} />}
      {activeModule === 'module5' && <Module5 onBack={goBack} />}
      {activeModule === 'module6' && <Module6 onBack={goBack} />}
      {activeModule === 'module7' && <Module7 onBack={goBack} />}
      {activeModule === 'module8' && <Module8 onBack={goBack} />}
    </Suspense>
  );
}
