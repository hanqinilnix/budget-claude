import { useEffect, useState } from 'react';
import { isStandalone } from '../viewport.js';

// Temporary: shows the numbers behind the screen-fit fix, so a launch that
// comes up short can be caught on the phone. Appears when the address ends in
// ?fit, or when switched on in Settings, which is the only way to reach it
// from the home screen. Remove once the fix has held on the phone.
const STORAGE_KEY = 'fit-readout';

function savedSetting() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
}

export const showFitReadout = new URLSearchParams(window.location.search).has('fit') || savedSetting();

export function setFitReadout(on) {
  try {
    if (on) localStorage.setItem(STORAGE_KEY, 'on');
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked: the readout just stays as it was.
  }
  window.location.reload();
}

// Read as this file loads, before the app has drawn anything, which is when
// iOS hands over the height that can come up short.
const atLaunch = { inner: window.innerHeight, client: document.documentElement.clientHeight };

function read() {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:0;height:100dvh;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);visibility:hidden';
  document.body.appendChild(probe);
  const style = getComputedStyle(probe);
  const top = parseFloat(style.paddingTop);
  const bottom = parseFloat(style.paddingBottom);
  const dvh = probe.clientHeight - top - bottom;
  probe.remove();
  const nav = document.querySelector('.navbar')?.getBoundingClientRect();
  return {
    app: document.querySelector('.app, .app-loading')?.getBoundingClientRect().height ?? 0,
    navBottom: nav ? nav.bottom : null,
    inner: window.innerHeight,
    dvh: Math.round(dvh),
    screen: window.screen.height,
    top,
    bottom,
    measured: getComputedStyle(document.documentElement).getPropertyValue('--app-height').trim(),
  };
}

export default function FitReadout() {
  const [numbers, setNumbers] = useState(read);
  useEffect(() => {
    const id = setInterval(() => setNumbers(read()), 500);
    return () => clearInterval(id);
  }, []);
  const round = Math.round;
  return (
    <div className="fit-readout">
      {isStandalone() ? 'home screen' : 'browser'} · launch inner {atLaunch.inner} client {atLaunch.client}
      <br />
      app {round(numbers.app)} · tabs end {numbers.navBottom == null ? '-' : round(numbers.navBottom)} · inner {numbers.inner} · dvh {numbers.dvh} · screen {numbers.screen}
      <br />
      inset top {numbers.top} bottom {numbers.bottom} · measured {numbers.measured || '-'}
    </div>
  );
}
