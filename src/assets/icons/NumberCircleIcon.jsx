const NumberCircleIcon = ({
  number = 1,
  size = 24,
  textColor = 'currentColor',
  fontSize = 12,
  strokeColor = 'currentColor',
  strokeWidth = 2,
  fill = 'none',
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle
        cx="12"
        cy="12"
        r="11"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill={fill}
      />
      <text
        x="12"
        y="12"
        textAnchor="middle"
        dominantBaseline="central"
        fill={textColor}
        fontSize={fontSize}
        fontWeight="bold"
      >
        {number}
      </text>
    </svg>
  );
};

export default NumberCircleIcon;
