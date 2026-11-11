// Keeps the app the height of the screen.
//
// Launched from the home screen, an iPhone can hand the app its screen height
// before it has applied the request to draw under the status bar, so the first
// number is short by about the status bar's height. Sizing the app once from
// that number left a band empty until something forced a new measurement.
// The app is pinned to the screen's edges in CSS instead, and this measures
// again whenever the screen may have settled, publishing the larger of the
// two as --app-height so a stale first layout can't stick.

let lastHeight = 0;

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
