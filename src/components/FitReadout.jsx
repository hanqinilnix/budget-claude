import { useEffect, useState } from 'react';

// Temporary: shows the numbers behind the screen-fit fix, so a launch that
// comes up short can be caught on the phone. Only appears when the address
// ends in ?fit. Remove once the fix has held on the phone.
export const showFitReadout = new URLSearchParams(window.location.search).has('fit');

function read() {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:0;height:100dvh;padding-top:env(safe-area-inset-top);visibility:hidden';
  document.body.appendChild(probe);
  const dvh = probe.clientHeight - parseFloat(getComputedStyle(probe).paddingTop);
  const inset = parseFloat(getComputedStyle(probe).paddingTop);
  probe.remove();
  return {
    app: document.querySelector('.app, .app-loading')?.getBoundingClientRect().height ?? 0,
    inner: window.innerHeight,
    dvh: Math.round(dvh),
    screen: window.screen.height,
    inset,
    var: getComputedStyle(document.documentElement).getPropertyValue('--app-height'),
  };
}

export default function FitReadout() {
  const [numbers, setNumbers] = useState(read);
  useEffect(() => {
    const id = setInterval(() => setNumbers(read()), 500);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="fit-readout">
      app {Math.round(numbers.app)} · inner {numbers.inner} · dvh {numbers.dvh} · screen {numbers.screen} · inset {numbers.inset} · var {numbers.var}
    </div>
  );
}
