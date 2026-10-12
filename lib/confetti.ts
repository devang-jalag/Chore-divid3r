import confetti from "canvas-confetti";

export function triggerCompletionConfetti() {
  if (typeof window === "undefined") return;

  confetti({
    particleCount: 50,
    spread: 60,
    origin: { y: 0.8 },
    colors: ["#167a4a", "#2766c6", "#f3c94e", "#a43d36"],
    disableForReducedMotion: true,
  });
}

export function triggerGrandCelebration() {
  if (typeof window === "undefined") return;

  const count = 120;
  const defaults = {
    origin: { y: 0.7 },
    disableForReducedMotion: true,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  });
  fire(0.2, {
    spread: 60,
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
}
