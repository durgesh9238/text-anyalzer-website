/**
 * Background3D.jsx
 * Animated anti-gravity particle canvas background.
 * Uses a lightweight canvas implementation — no Three.js dependency needed.
 */
import { useEffect, useRef } from 'react';

const PARTICLE_COUNT = 110;
const COLORS = ['#638dff', '#a78bfa', '#22d3a4', '#f472b6'];

function randomBetween(a, b) { return a + Math.random() * (b - a); }

export default function Background3D() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    let animId;
    const particles = [];

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const init = () => {
      particles.length = 0;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x:      Math.random() * canvas.width,
          y:      Math.random() * canvas.height,
          z:      randomBetween(0.2, 1.2),
          r:      randomBetween(1, 3),
          color:  COLORS[Math.floor(Math.random() * COLORS.length)],
          vx:     randomBetween(-0.25, 0.25),
          vy:     randomBetween(-0.35, -0.05),
          alpha:  randomBetween(0.3, 0.85),
          wobble: Math.random() * Math.PI * 2,
          wobbleSpeed: randomBetween(0.005, 0.02),
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Subtle radial gradient overlay
      const grd = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width * 0.75
      );
      grd.addColorStop(0, 'rgba(10,16,40,0)');
      grd.addColorStop(1, 'rgba(5,8,20,0.55)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.wobble += p.wobbleSpeed;
        p.x += p.vx + Math.sin(p.wobble) * 0.2;
        p.y += p.vy * p.z;

        if (p.y < -10) { p.y = canvas.height + 10; p.x = Math.random() * canvas.width; }
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * p.z, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.round(p.alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };

    resize();
    init();
    draw();

    window.addEventListener('resize', () => { resize(); init(); });
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        background: 'linear-gradient(135deg, #050814 0%, #0b1026 60%, #0a0c1e 100%)',
      }}
      aria-hidden="true"
    />
  );
}
