'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';

interface ShootingStar {
  id: number;
  x: number;
  y: number;
  angle: number;
  scale: number;
  speed: number;
  distance: number;
}

interface StarProps {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  twinkleSpeed: number | null;
}

interface StarryBackgroundProps {
  starDensity?: number;
  allStarsTwinkle?: boolean;
  twinkleProbability?: number;
  minTwinkleSpeed?: number;
  maxTwinkleSpeed?: number;
  shootingStarMinSpeed?: number;
  shootingStarMaxSpeed?: number;
  shootingStarMinDelay?: number;
  shootingStarMaxDelay?: number;
  shootingStarColor?: string;
  shootingStarTrailColor?: string;
  className?: string;
}

const getRandomStartPoint = () => {
  const side = Math.floor(Math.random() * 4);
  const offset = Math.random() * window.innerWidth;

  switch (side) {
    case 0:
      return { x: offset, y: 0, angle: 45 };
    case 1:
      return { x: window.innerWidth, y: offset, angle: 135 };
    case 2:
      return { x: offset, y: window.innerHeight, angle: 225 };
    case 3:
      return { x: 0, y: offset, angle: 315 };
    default:
      return { x: 0, y: 0, angle: 45 };
  }
};

export default function StarryBackground({
  starDensity = 0.0002,
  allStarsTwinkle = true,
  twinkleProbability = 0.7,
  minTwinkleSpeed = 0.5,
  maxTwinkleSpeed = 1,
  shootingStarMinSpeed = 10,
  shootingStarMaxSpeed = 30,
  shootingStarMinDelay = 1200,
  shootingStarMaxDelay = 4200,
  shootingStarColor = "#FFFFFF",
  shootingStarTrailColor = "#4299E1",
  className = "",
}: StarryBackgroundProps) {
  const [shootingStar, setShootingStar] = useState<ShootingStar | null>(null);
  const [stars, setStars] = useState<StarProps[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Tạo các ngôi sao nền
  const generateStars = useCallback(
    (width: number, height: number): StarProps[] => {
      const area = width * height;
      const numStars = Math.floor(area * starDensity);
      return Array.from({ length: numStars }, () => {
        const shouldTwinkle =
          allStarsTwinkle || Math.random() < twinkleProbability;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 0.5 + 0.5,
          opacity: Math.random() * 0.5 + 0.5,
          twinkleSpeed: shouldTwinkle
            ? minTwinkleSpeed +
              Math.random() * (maxTwinkleSpeed - minTwinkleSpeed)
            : null,
        };
      });
    },
    [
      starDensity,
      allStarsTwinkle,
      twinkleProbability,
      minTwinkleSpeed,
      maxTwinkleSpeed,
    ]
  );

  // Khởi tạo và cập nhật các ngôi sao nền
  useEffect(() => {
    const updateStars = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const { width, height } = canvas.getBoundingClientRect();
        canvas.width = width;
        canvas.height = height;
        setStars(generateStars(width, height));
      }
    };

    updateStars();

    const resizeObserver = new ResizeObserver(updateStars);
    const currentCanvas = canvasRef.current;
    
    if (currentCanvas) {
      resizeObserver.observe(currentCanvas);
    }

    return () => {
      if (currentCanvas) {
        resizeObserver.unobserve(currentCanvas);
      }
    };
  }, [generateStars]);

  // Render các ngôi sao nền
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((star) => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.fill();

        if (star.twinkleSpeed !== null) {
          star.opacity =
            0.5 +
            Math.abs(Math.sin((Date.now() * 0.001) / star.twinkleSpeed) * 0.5);
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [stars]);

  // Tạo sao băng
  useEffect(() => {
    const createShootingStar = () => {
      const { x, y, angle } = getRandomStartPoint();
      const newStar: ShootingStar = {
        id: Date.now(),
        x,
        y,
        angle,
        scale: 1,
        speed: Math.random() * (shootingStarMaxSpeed - shootingStarMinSpeed) + shootingStarMinSpeed,
        distance: 0,
      };
      setShootingStar(newStar);

      const randomDelay = Math.random() * (shootingStarMaxDelay - shootingStarMinDelay) + shootingStarMinDelay;
      setTimeout(createShootingStar, randomDelay);
    };

    createShootingStar();

    return () => {};
  }, [shootingStarMinSpeed, shootingStarMaxSpeed, shootingStarMinDelay, shootingStarMaxDelay]);

  // Di chuyển sao băng
  useEffect(() => {
    const moveShootingStar = () => {
      if (shootingStar) {
        setShootingStar((prevStar) => {
          if (!prevStar) return null;
          const newX =
            prevStar.x +
            prevStar.speed * Math.cos((prevStar.angle * Math.PI) / 180);
          const newY =
            prevStar.y +
            prevStar.speed * Math.sin((prevStar.angle * Math.PI) / 180);
          const newDistance = prevStar.distance + prevStar.speed;
          const newScale = 1 + newDistance / 100;
          if (
            newX < -20 ||
            newX > window.innerWidth + 20 ||
            newY < -20 ||
            newY > window.innerHeight + 20
          ) {
            return null;
          }
          return {
            ...prevStar,
            x: newX,
            y: newY,
            distance: newDistance,
            scale: newScale,
          };
        });
      }
    };

    const animationFrame = requestAnimationFrame(moveShootingStar);
    return () => cancelAnimationFrame(animationFrame);
  }, [shootingStar]);

  return (
    <div className={`absolute inset-0 z-0 pointer-events-none ${className}`}>
      <canvas
        ref={canvasRef}
        className="h-full w-full absolute inset-0"
      />
      <svg
        ref={svgRef}
        className="w-full h-full absolute inset-0"
      >
        {shootingStar && (
          <rect
            key={shootingStar.id}
            x={shootingStar.x}
            y={shootingStar.y}
            width={10 * shootingStar.scale}
            height={1}
            fill="url(#shooting-star-gradient)"
            transform={`rotate(${shootingStar.angle}, ${
              shootingStar.x + (10 * shootingStar.scale) / 2
            }, ${shootingStar.y + 1 / 2})`}
          />
        )}
        <defs>
          <linearGradient id="shooting-star-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: shootingStarTrailColor, stopOpacity: 0 }} />
            <stop offset="100%" style={{ stopColor: shootingStarColor, stopOpacity: 1 }} />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
} 