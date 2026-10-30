// The app mark: a board cut into panels, as in a cutting plan. Same drawing as public/icon.svg.
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg class="logo" width={size} height={size} viewBox="0 0 512 512" aria-hidden="true">
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#14b8a6" />
          <stop offset="1" stop-color="#0f766e" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="116" fill="url(#logo-g)" />
      <g fill="#fff">
        <rect x="104" y="112" width="128" height="288" rx="18" />
        <rect x="256" y="112" width="152" height="132" rx="18" />
        <rect x="256" y="268" width="64" height="132" rx="18" />
        <rect x="344" y="268" width="64" height="132" rx="18" fill-opacity=".45" />
      </g>
    </svg>
  );
}

