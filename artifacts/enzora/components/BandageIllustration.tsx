import React from "react";
import Svg, {
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Circle,
} from "react-native-svg";

type Props = {
  size?: number;
};

export default function BandageIllustration({ size = 140 }: Props) {
  const w = size;
  const h = Math.round(size * 0.78);
  return (
    <Svg width={w} height={h} viewBox="0 0 180 140" fill="none">
      <Defs>
        <LinearGradient id="patchGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFE7C2" />
          <Stop offset="1" stopColor="#F4C58A" />
        </LinearGradient>
        <LinearGradient id="padGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#EDEBFF" />
        </LinearGradient>
        <LinearGradient id="chipGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#7B61FF" />
          <Stop offset="1" stopColor="#4A90E2" />
        </LinearGradient>
      </Defs>

      <Ellipse cx="90" cy="125" rx="60" ry="6" fill="#1B2A6B" opacity={0.08} />

      <G transform="rotate(-18 90 70)">
        {/* Bandage body */}
        <Rect
          x="10"
          y="48"
          width="160"
          height="44"
          rx="22"
          fill="url(#patchGrad)"
          stroke="#E2A968"
          strokeWidth={1}
        />

        {/* Adhesive perforations - left */}
        {[0, 1, 2, 3].map((i) => (
          <Circle
            key={`l-${i}`}
            cx={26 + i * 8}
            cy={58 + (i % 2) * 5}
            r={1.6}
            fill="#E2A968"
            opacity={0.55}
          />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <Circle
            key={`l2-${i}`}
            cx={26 + i * 8}
            cy={78 + (i % 2) * 5}
            r={1.6}
            fill="#E2A968"
            opacity={0.55}
          />
        ))}
        {/* Adhesive perforations - right */}
        {[0, 1, 2, 3].map((i) => (
          <Circle
            key={`r-${i}`}
            cx={120 + i * 8}
            cy={58 + (i % 2) * 5}
            r={1.6}
            fill="#E2A968"
            opacity={0.55}
          />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <Circle
            key={`r2-${i}`}
            cx={120 + i * 8}
            cy={78 + (i % 2) * 5}
            r={1.6}
            fill="#E2A968"
            opacity={0.55}
          />
        ))}

        {/* Center pad */}
        <Rect
          x="60"
          y="52"
          width="60"
          height="36"
          rx="8"
          fill="url(#padGrad)"
          stroke="#D8D5F2"
          strokeWidth={1}
        />

        {/* Smart sensor chip */}
        <Rect
          x="78"
          y="60"
          width="24"
          height="20"
          rx="5"
          fill="url(#chipGrad)"
        />
        {/* Chip detail lines */}
        <Rect x="82" y="65" width="16" height="1.5" rx={0.75} fill="#FFFFFF" opacity={0.7} />
        <Rect x="82" y="69" width="10" height="1.5" rx={0.75} fill="#FFFFFF" opacity={0.55} />
        <Rect x="82" y="73" width="13" height="1.5" rx={0.75} fill="#FFFFFF" opacity={0.55} />

        {/* LED indicator */}
        <Circle cx="113" cy="70" r="2.4" fill="#7BC47F" />
        <Circle cx="113" cy="70" r="4.5" fill="#7BC47F" opacity={0.25} />

        {/* Highlight */}
        <Path
          d="M18 56 Q 60 48 100 52"
          stroke="#FFFFFF"
          strokeOpacity={0.45}
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
      </G>
    </Svg>
  );
}
