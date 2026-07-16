import React from 'react';

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function SunCloudIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="10" cy="10" r="3.5" />
      <path d="M10 4.5V3M10 16.5v1.5M4.93 4.93l1.06 1.06M14.01 14.01l1.06 1.06M3 10h1.5M14.5 10H16" />
      <path d="M16.5 17H11a5 5 0 1 1 4.8-6.4h1.2a3.5 3.5 0 0 1 0 7H16.5" className="text-gray-400" />
    </svg>
  );
}

function CloudIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
    </svg>
  );
}

function RainIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" className="text-gray-400" />
      <path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2" strokeWidth={1.5} />
    </svg>
  );
}

function StormIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" className="text-gray-400" />
      <path d="M13 13l-2 4h3l-1.5 4" strokeWidth={1.5} />
    </svg>
  );
}

function FogIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M3 8h12M3 12h18M3 16h14" strokeLinecap="round" />
    </svg>
  );
}

function SnowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" className="text-gray-400" />
      <circle cx="9" cy="21" r="0.5" />
      <circle cx="13" cy="21" r="0.5" />
      <circle cx="17" cy="21" r="0.5" />
    </svg>
  );
}

interface Props {
  weatherCode: number;
}

const WeatherIcon: React.FC<Props> = ({ weatherCode }) => {
  if (weatherCode <= 1) return <SunIcon />;
  if (weatherCode === 2) return <SunCloudIcon />;
  if (weatherCode >= 3 && weatherCode < 45) return <CloudIcon />;
  if (weatherCode >= 45 && weatherCode < 51) return <FogIcon />;
  if (weatherCode >= 51 && weatherCode < 71) return <RainIcon />;
  if (weatherCode >= 71 && weatherCode < 95) return <SnowIcon />;
  if (weatherCode >= 95) return <StormIcon />;
  return <CloudIcon />;
};

export default WeatherIcon;
