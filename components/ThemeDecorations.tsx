'use client';

import { useEffect, useRef } from 'react';
import type { ThemeAnimationType } from '@/lib/themes';

interface Props {
  type?: ThemeAnimationType | 'snow' | 'fireworks' | null;
}

export function ThemeDecorations({ type }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!type || type === 'none' || typeof window === 'undefined') return;

    // Check prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      return; // Respect accessibility preference
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let isVisible = true;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const handleVisibility = () => {
      isVisible = !document.hidden;
      if (isVisible) {
        lastTime = performance.now();
        animId = requestAnimationFrame(loop);
      } else {
        cancelAnimationFrame(animId);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Particle state
    interface Particle {
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      rotation: number;
      rotationSpeed: number;
      alpha: number;
      color: string;
      colorAlt?: string;
      swayOffset: number;
      swaySpeed: number;
    }

    const confettiPalette = ['#f59e0b', '#ef4444', '#06b6d4', '#10b981', '#8b5cf6', '#ec4899'];
    const autumnPalette = ['#d97706', '#b45309', '#9a3412', '#78350f', '#ea580c', '#ca8a04'];
    const fireworksPalette = ['#fbbf24', '#f59e0b', '#38bdf8', '#a855f7', '#ec4899', '#34d399'];
    const heartsPalette = ['#f43f5e', '#fb7185', '#fda4af', '#e11d48'];
    const sunPalette = ['#fbbf24', '#fde047', '#fef08a', '#f59e0b'];

    const count = type === 'snow' ? 28 : type === 'confetti' ? 24 : type === 'autumn_leaves' ? 20 : 18;

    const particles: Particle[] = Array.from({ length: count }, () => {
      const pType = type;
      let color = '#ffffff';
      let speedY = Math.random() * 0.6 + 0.3;
      let speedX = (Math.random() - 0.5) * 0.4;
      let size = Math.random() * 2 + 1;

      if (pType === 'snow') {
        color = '#ffffff';
        size = Math.random() * 2.5 + 1.2;
        speedY = Math.random() * 0.7 + 0.4;
      } else if (pType === 'confetti') {
        color = confettiPalette[Math.floor(Math.random() * confettiPalette.length)];
        size = Math.random() * 5 + 4; // width of rect
        speedY = Math.random() * 1.0 + 0.6;
        speedX = (Math.random() - 0.5) * 0.8;
      } else if (pType === 'autumn_leaves') {
        color = autumnPalette[Math.floor(Math.random() * autumnPalette.length)];
        size = Math.random() * 5 + 4;
        speedY = Math.random() * 0.8 + 0.4;
        speedX = (Math.random() - 0.5) * 0.6;
      } else if (pType === 'hearts') {
        color = heartsPalette[Math.floor(Math.random() * heartsPalette.length)];
        size = Math.random() * 5 + 4;
        speedY = -(Math.random() * 0.6 + 0.3); // float upwards
      } else if (pType === 'sun_sparkles') {
        color = sunPalette[Math.floor(Math.random() * sunPalette.length)];
        size = Math.random() * 3 + 2;
        speedY = (Math.random() - 0.5) * 0.3;
        speedX = (Math.random() - 0.5) * 0.3;
      } else if (pType === 'fireworks') {
        color = fireworksPalette[Math.floor(Math.random() * fireworksPalette.length)];
        size = Math.random() * 2.5 + 1;
        speedY = (Math.random() - 0.5) * 0.8;
        speedX = (Math.random() - 0.5) * 0.8;
      }

      return {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size,
        speedY,
        speedX,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.04,
        alpha: Math.random() * 0.5 + 0.3,
        color,
        swayOffset: Math.random() * Math.PI * 2,
        swaySpeed: Math.random() * 0.02 + 0.01,
      };
    });

    let lastTime = performance.now();
    let tick = 0;

    const drawHeart = (c: CanvasRenderingContext2D, x: number, y: number, s: number, col: string, alpha: number) => {
      c.save();
      c.translate(x, y);
      c.fillStyle = col;
      c.globalAlpha = alpha;
      c.beginPath();
      const topCurveHeight = s * 0.3;
      c.moveTo(0, topCurveHeight);
      // top left curve
      c.bezierCurveTo(0, 0, -s / 2, 0, -s / 2, topCurveHeight);
      // bottom left curve
      c.bezierCurveTo(-s / 2, (s + topCurveHeight) / 2, 0, (s + topCurveHeight) / 1.5, 0, s);
      // bottom right curve
      c.bezierCurveTo(0, (s + topCurveHeight) / 1.5, s / 2, (s + topCurveHeight) / 2, s / 2, topCurveHeight);
      // top right curve
      c.bezierCurveTo(s / 2, 0, 0, 0, 0, topCurveHeight);
      c.closePath();
      c.fill();
      c.restore();
    };

    const drawSparkle = (c: CanvasRenderingContext2D, x: number, y: number, s: number, col: string, alpha: number) => {
      c.save();
      c.translate(x, y);
      c.fillStyle = col;
      c.globalAlpha = alpha;
      c.beginPath();
      // 4-point star
      c.moveTo(0, -s);
      c.quadraticCurveTo(0, 0, s, 0);
      c.quadraticCurveTo(0, 0, 0, s);
      c.quadraticCurveTo(0, 0, -s, 0);
      c.quadraticCurveTo(0, 0, 0, -s);
      c.closePath();
      c.fill();
      c.restore();
    };

    const loop = (currentTime: number) => {
      if (!isVisible) return;

      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;
      tick++;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        // Update positions with frame-rate independent delta
        p.swayOffset += p.swaySpeed;
        const sway = Math.sin(p.swayOffset) * 0.5;

        p.y += p.speedY * (delta * 60);
        p.x += (p.speedX + sway) * (delta * 60);
        p.rotation += p.rotationSpeed;

        // Boundary wraps
        if (type === 'hearts') {
          if (p.y < -15) {
            p.y = canvas.height + 15;
            p.x = Math.random() * canvas.width;
          }
        } else if (type === 'snow' || type === 'confetti' || type === 'autumn_leaves') {
          if (p.y > canvas.height + 15) {
            p.y = -15;
            p.x = Math.random() * canvas.width;
          }
        } else {
          // Bouncing for fireworks and sparkles
          if (p.y > canvas.height) p.speedY = -Math.abs(p.speedY);
          if (p.y < 0) p.speedY = Math.abs(p.speedY);
          if (p.x > canvas.width) p.speedX = -Math.abs(p.speedX);
          if (p.x < 0) p.speedX = Math.abs(p.speedX);
        }

        if (p.x > canvas.width + 15) p.x = -15;
        if (p.x < -15) p.x = canvas.width + 15;

        // Render particle according to type
        if (type === 'snow') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.fill();
        } else if (type === 'confetti') {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          ctx.restore();
        } else if (type === 'autumn_leaves') {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.beginPath();
          // Leaf ellipse shape
          ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (type === 'hearts') {
          drawHeart(ctx, p.x, p.y, p.size, p.color, p.alpha);
        } else if (type === 'sun_sparkles') {
          // Twinkle effect
          const pulseAlpha = Math.max(0.1, p.alpha * (0.8 + 0.3 * Math.sin(tick * 0.05 + p.swayOffset)));
          drawSparkle(ctx, p.x, p.y, p.size, p.color, pulseAlpha);
        } else if (type === 'fireworks') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          const pulse = (Math.sin(tick * 0.1 + p.swayOffset) + 1) * 0.5;
          ctx.globalAlpha = p.alpha * (0.4 + 0.6 * pulse);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1.0;
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [type]);

  if (!type || type === 'none') return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-20 w-full h-full"
      aria-hidden="true"
    />
  );
}
