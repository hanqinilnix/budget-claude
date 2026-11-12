// Keeps the app the height of the area iOS actually draws.
//
// On iOS 26, a home-screen app that draws under the status bar can be given a
// drawing area short by the status bar's height (WebKit bug 301108), leaving a
// band at the bottom that iOS paints nothing into. Laying the app out taller
// than that only pushes the tab bar into the band, where it can't be seen or
// tapped, so the app follows the height iOS reports instead. The app is pinned
// to the screen's edges in CSS, and this measures again whenever the screen may
// have settled, so that if iOS hands over the full height later the app grows
// to fill it.

let lastHeight = 0;

export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function measure() {
  const height = Math.max(window.innerHeight, document.documentElement.clientHeight);
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
