import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/index.css';

// Initialize an animated favicon that subtly pulses like the ANUP-SECURITY-PORTAL logo.
function initAnimatedFavicon() {
  try {
    const link = document.querySelector('link#dynamic-favicon');
    if (!link) return;

    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (prefersReduced) return; // Respect reduced motion

    const size = 64; // Render at 64x64 then let the browser downscale
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId;
    const start = performance.now();
    const cyan = '#00AEEF';

  const draw = (t) => {
      // t is milliseconds since start; build a gentle pulse [0..1]
      const elapsed = (t - start) / 1000; // seconds
      const pulse = 0.35 + 0.25 * Math.sin(elapsed * 2 * Math.PI * 0.5); // 0.35..0.6 at 0.5Hz

      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.translate(size / 2, size / 2);

      // Background transparent
      // Outer upper “eye” arc
      ctx.beginPath();
      ctx.strokeStyle = cyan;
      ctx.lineWidth = 5;
      const r = 24;
      // Arc path resembling upper eye curve
      ctx.ellipse(0, -4, r, r * 0.55, 0, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();

      // Inner pupil
      ctx.beginPath();
      ctx.fillStyle = cyan;
      ctx.arc(0, 0, 8 + pulse * 2, 0, Math.PI * 2);
      ctx.fill();

      // Bright reflection
      ctx.beginPath();
      ctx.fillStyle = '#FFFFFF';
      ctx.arc(-2, -2, 3, 0, Math.PI * 2);
      ctx.fill();

      // Lower eye arc
      ctx.beginPath();
      ctx.strokeStyle = cyan;
      ctx.lineWidth = 5;
      ctx.ellipse(0, 8, r, r * 0.55, 0, -Math.PI * 0.9, -Math.PI * 0.1);
      ctx.stroke();

      // Soft glow ring with pulsing alpha
      const glow = 0.12 + 0.10 * pulse;
      const grd = ctx.createRadialGradient(0, 0, 6, 0, 0, 22);
      grd.addColorStop(0, `rgba(0,174,239,${glow})`);
      grd.addColorStop(1, 'rgba(0,174,239,0)');
      ctx.beginPath();
      ctx.fillStyle = grd;
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Update favicon
      const url = canvas.toDataURL('image/png');
      if (link.href !== url) link.href = url;

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);

    // Cleanup on HMR/unmount
    window.addEventListener('beforeunload', () => cancelAnimationFrame(rafId));
  } catch {
    // Silently ignore; favicon remains static
  }
}

// Start favicon animation ASAP
if (typeof window !== 'undefined' && document.readyState !== 'loading') {
  initAnimatedFavicon();
} else {
  window.addEventListener('DOMContentLoaded', initAnimatedFavicon, { once: true });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

