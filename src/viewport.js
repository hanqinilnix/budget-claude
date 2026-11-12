// Keeps the app the height of the screen.
//
// In a browser tab the app is pinned to the screen's edges and follows the
// height the browser reports. Installed to the home screen, iOS 26 can report
// a height short by the status bar's height (WebKit bug 301108) while the app
// still has the whole screen, so there the screen's own height counts too,
// upright only, since iOS keeps reporting the upright height when the phone is
// turned. The CSS lays the home-screen app out in the page rather than pinned,
// because iOS draws nothing pinned below its short line. This measures again
// whenever the screen may have settled, so a stale first number can't stick.

let lastHeight = 0;

export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function screenHeight() {
  return isStandalone() && window.matchMedia('(orientation: portrait)').matches ? window.screen.height : 0;
}

function measure() {
  const height = Math.max(window.innerHeight, document.documentElement.clientHeight, screenHeight());
  if (height === lastHeight) return;
  lastHeight = height;
  document.documentElement.style.setProperty('--app-height', `${height}px`);
}

export function watchScreenHeight() {
  measure();

  // The first frames after load, while the phone is still settling its screen areas.
  let frames = 0;
  const onFrame = () => {
    measure();
    if (++frames < 60) requestAnimationFrame(onFrame);
  };
  requestAnimationFrame(onFrame);
  setTimeout(measure, 500);
  setTimeout(measure, 1500);

  window.addEventListener('load', measure);
  window.addEventListener('pageshow', measure);
  window.addEventListener('resize', measure);
  window.addEventListener('orientationchange', measure);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      measure();
      requestAnimationFrame(measure);
    }
  });
}

// Forms move the keyboard, and the keyboard can leave the page slid upwards.
// The page never scrolls by itself, so returning it to the top is always safe.
export function resetPageScroll() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  measure();
}
